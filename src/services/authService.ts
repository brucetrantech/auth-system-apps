import { eq, and, gt } from 'drizzle-orm';
import db from '@/db';
import {
	users,
	refreshTokens,
	verificationTokens,
	authAuditLog,
	oauthProviders,
} from '@/db/schema';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/utils/password';
import { generateTokenPair } from '@/utils/jwt';
import { generateToken, hashToken } from '@/utils/crypto';
import { emailService } from './emailService';
import { logger } from '@/utils/logger';
import {
	RegisterDto,
	LoginDto,
	ValidationError,
	UnauthorizedError,
	ConflictError,
	NotFoundError,
	OAuthProfile,
	DeviceInfo,
	AuditEventType,
} from '@/types';

class AuthService {
	/**
	 * Register new user with email and password
	 */
	async register(data: RegisterDto, deviceInfo?: DeviceInfo) {
		// Validate password strength
		const passwordValidation = validatePasswordStrength(data.password);
		if (!passwordValidation.valid) {
			throw new ValidationError(passwordValidation.errors.join(', '));
		}

		// Check if user already exists
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.email, data.email))
			.limit(1);

		if (existingUser) {
			throw new ConflictError('User with this email already exists');
		}

		// Hash password
		const passwordHash = await hashPassword(data.password);

		// Create user
		const [newUser] = await db
			.insert(users)
			.values({
				email: data.email,
				passwordHash,
				displayName: data.displayName || null,
				emailVerified: false,
				status: 'active',
			})
			.returning();

		// Generate verification token
		const verificationToken = generateToken();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		await db.insert(verificationTokens).values({
			userId: newUser.id,
			token: verificationToken,
			tokenType: 'email_verification',
			expiresAt,
		});

		// Send verification email
		try {
			await emailService.sendVerificationEmail(newUser.email!, verificationToken);
		} catch (error) {
			logger.error('Failed to send verification email:', error);
			// Don't fail registration if email fails
		}

		// Log audit event
		await this.logAuditEvent({
			userId: newUser.id,
			eventType: AuditEventType.REGISTER,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return {
			user: {
				id: newUser.id,
				email: newUser.email,
				displayName: newUser.displayName,
				emailVerified: newUser.emailVerified,
			},
			message: 'Registration successful. Please check your email to verify your account.',
		};
	}

	/**
	 * Login with email and password
	 */
	async login(data: LoginDto, deviceInfo?: DeviceInfo) {
		// Find user by email
		const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

		if (!user || !user.passwordHash) {
			await this.logAuditEvent({
				eventType: AuditEventType.LOGIN_FAILED,
				ipAddress: deviceInfo?.ip,
				userAgent: deviceInfo?.userAgent,
				metadata: { email: data.email, reason: 'user_not_found' },
				success: false,
			});
			throw new UnauthorizedError('Invalid email or password');
		}

		// Verify password
		const isPasswordValid = await verifyPassword(data.password, user.passwordHash);

		if (!isPasswordValid) {
			await this.logAuditEvent({
				userId: user.id,
				eventType: AuditEventType.LOGIN_FAILED,
				ipAddress: deviceInfo?.ip,
				userAgent: deviceInfo?.userAgent,
				metadata: { reason: 'invalid_password' },
				success: false,
			});
			throw new UnauthorizedError('Invalid email or password');
		}

		// Check if account is active
		if (user.status !== 'active') {
			throw new UnauthorizedError('Account is not active');
		}

		// Generate tokens
		const tokens = generateTokenPair(user.id, user.email!);

		// Store refresh token
		const refreshTokenHash = hashToken(tokens.refreshToken);
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		await db.insert(refreshTokens).values({
			userId: user.id,
			tokenHash: refreshTokenHash,
			deviceInfo: deviceInfo || {},
			expiresAt,
		});

		// Update last login
		await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

		// Log audit event
		await this.logAuditEvent({
			userId: user.id,
			eventType: AuditEventType.LOGIN,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return {
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				emailVerified: user.emailVerified,
				avatarUrl: user.avatarUrl,
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenType: 'Bearer',
			expiresIn: tokens.expiresIn,
		};
	}

	/**
	 * Refresh access token
	 */
	async refreshAccessToken(refreshToken: string, deviceInfo?: DeviceInfo) {
		const tokenHash = hashToken(refreshToken);

		// Find refresh token
		const [token] = await db
			.select()
			.from(refreshTokens)
			.where(
				and(
					eq(refreshTokens.tokenHash, tokenHash),
					gt(refreshTokens.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!token || token.revokedAt) {
			throw new UnauthorizedError('Invalid or expired refresh token');
		}

		// Get user
		const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);

		if (!user || user.status !== 'active') {
			throw new UnauthorizedError('User not found or inactive');
		}

		// Generate new tokens
		const tokens = generateTokenPair(user.id, user.email!);

		// Revoke old refresh token
		await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(eq(refreshTokens.id, token.id));

		// Store new refresh token
		const newTokenHash = hashToken(tokens.refreshToken);
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await db.insert(refreshTokens).values({
			userId: user.id,
			tokenHash: newTokenHash,
			deviceInfo: deviceInfo || {},
			expiresAt,
		});

		// Log audit event
		await this.logAuditEvent({
			userId: user.id,
			eventType: AuditEventType.TOKEN_REFRESH,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenType: 'Bearer',
			expiresIn: tokens.expiresIn,
		};
	}

	/**
	 * Logout (revoke refresh token)
	 */
	async logout(refreshToken: string, userId: string, deviceInfo?: DeviceInfo) {
		const tokenHash = hashToken(refreshToken);

		await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, userId)));

		// Log audit event
		await this.logAuditEvent({
			userId,
			eventType: AuditEventType.LOGOUT,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return { message: 'Logged out successfully' };
	}

	/**
	 * Verify email
	 */
	async verifyEmail(token: string) {
		const [verificationToken] = await db
			.select()
			.from(verificationTokens)
			.where(
				and(
					eq(verificationTokens.token, token),
					eq(verificationTokens.tokenType, 'email_verification'),
					gt(verificationTokens.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!verificationToken || verificationToken.usedAt) {
			throw new ValidationError('Invalid or expired verification token');
		}

		// Update user email verified status
		await db
			.update(users)
			.set({ emailVerified: true })
			.where(eq(users.id, verificationToken.userId));

		// Mark token as used
		await db
			.update(verificationTokens)
			.set({ usedAt: new Date() })
			.where(eq(verificationTokens.id, verificationToken.id));

		// Get user
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, verificationToken.userId))
			.limit(1);

		// Send welcome email
		if (user) {
			try {
				await emailService.sendWelcomeEmail(user.email!, user.displayName || undefined);
			} catch (error) {
				logger.error('Failed to send welcome email:', error);
			}

			// Log audit event
			await this.logAuditEvent({
				userId: user.id,
				eventType: AuditEventType.EMAIL_VERIFY,
				success: true,
			});
		}

		return { message: 'Email verified successfully' };
	}

	/**
	 * Request password reset
	 */
	async requestPasswordReset(email: string, deviceInfo?: DeviceInfo) {
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		// Don't reveal if user exists
		if (!user) {
			return { message: 'If the email exists, a password reset link has been sent' };
		}

		// Generate reset token
		const resetToken = generateToken();
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		await db.insert(verificationTokens).values({
			userId: user.id,
			token: resetToken,
			tokenType: 'password_reset',
			expiresAt,
		});

		// Send reset email
		try {
			await emailService.sendPasswordResetEmail(user.email!, resetToken);
		} catch (error) {
			logger.error('Failed to send password reset email:', error);
		}

		// Log audit event
		await this.logAuditEvent({
			userId: user.id,
			eventType: AuditEventType.PASSWORD_RESET_REQUEST,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return { message: 'If the email exists, a password reset link has been sent' };
	}

	/**
	 * Reset password
	 */
	async resetPassword(token: string, newPassword: string, deviceInfo?: DeviceInfo) {
		// Validate password strength
		const passwordValidation = validatePasswordStrength(newPassword);
		if (!passwordValidation.valid) {
			throw new ValidationError(passwordValidation.errors.join(', '));
		}

		const [resetToken] = await db
			.select()
			.from(verificationTokens)
			.where(
				and(
					eq(verificationTokens.token, token),
					eq(verificationTokens.tokenType, 'password_reset'),
					gt(verificationTokens.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!resetToken || resetToken.usedAt) {
			throw new ValidationError('Invalid or expired reset token');
		}

		// Hash new password
		const passwordHash = await hashPassword(newPassword);

		// Update user password
		await db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));

		// Mark token as used
		await db
			.update(verificationTokens)
			.set({ usedAt: new Date() })
			.where(eq(verificationTokens.id, resetToken.id));

		// Revoke all refresh tokens for security
		await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(eq(refreshTokens.userId, resetToken.userId));

		// Log audit event
		await this.logAuditEvent({
			userId: resetToken.userId,
			eventType: AuditEventType.PASSWORD_RESET,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			success: true,
		});

		return { message: 'Password reset successfully' };
	}

	/**
	 * Handle OAuth callback
	 */
	async handleOAuthCallback(profile: OAuthProfile, deviceInfo?: DeviceInfo) {
		// Check if OAuth provider already linked
		const [existingProvider] = await db
			.select()
			.from(oauthProviders)
			.where(
				and(
					eq(oauthProviders.provider, profile.provider),
					eq(oauthProviders.providerUserId, profile.providerId),
				),
			)
			.limit(1);

		let user;
		let isNewUser = false;

		if (existingProvider) {
			// User exists, get user data
			[user] = await db
				.select()
				.from(users)
				.where(eq(users.id, existingProvider.userId))
				.limit(1);

			// Update OAuth tokens
			await db
				.update(oauthProviders)
				.set({
					accessToken: profile.accessToken,
					refreshToken: profile.refreshToken,
					tokenExpiresAt: profile.expiresAt,
				})
				.where(eq(oauthProviders.id, existingProvider.id));
		} else {
			// Check if user with email exists
			const [existingUser] = await db
				.select()
				.from(users)
				.where(eq(users.email, profile.email))
				.limit(1);

			if (existingUser) {
				user = existingUser;
			} else {
				// Create new user
				[user] = await db
					.insert(users)
					.values({
						email: profile.email,
						emailVerified: true, // OAuth emails are pre-verified
						displayName: profile.displayName || null,
						avatarUrl: profile.avatarUrl || null,
						status: 'active',
					})
					.returning();

				isNewUser = true;

				// Log registration
				await this.logAuditEvent({
					userId: user.id,
					eventType: AuditEventType.REGISTER,
					ipAddress: deviceInfo?.ip,
					userAgent: deviceInfo?.userAgent,
					metadata: { provider: profile.provider },
					success: true,
				});
			}

			// Link OAuth provider
			await db.insert(oauthProviders).values({
				userId: user.id,
				provider: profile.provider,
				providerUserId: profile.providerId,
				providerEmail: profile.email,
				accessToken: profile.accessToken,
				refreshToken: profile.refreshToken,
				tokenExpiresAt: profile.expiresAt,
			});

			// Log OAuth link
			await this.logAuditEvent({
				userId: user.id,
				eventType: AuditEventType.OAUTH_LINK,
				ipAddress: deviceInfo?.ip,
				userAgent: deviceInfo?.userAgent,
				metadata: { provider: profile.provider },
				success: true,
			});
		}

		if (!user) {
			throw new Error('Failed to create or find user');
		}

		// Generate tokens
		const tokens = generateTokenPair(user.id, user.email!);

		// Store refresh token
		const refreshTokenHash = hashToken(tokens.refreshToken);
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		await db.insert(refreshTokens).values({
			userId: user.id,
			tokenHash: refreshTokenHash,
			deviceInfo: deviceInfo || {},
			expiresAt,
		});

		// Update last login
		await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

		// Log login
		await this.logAuditEvent({
			userId: user.id,
			eventType: AuditEventType.LOGIN,
			ipAddress: deviceInfo?.ip,
			userAgent: deviceInfo?.userAgent,
			metadata: { provider: profile.provider },
			success: true,
		});

		return {
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				emailVerified: user.emailVerified,
				avatarUrl: user.avatarUrl,
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			tokenType: 'Bearer',
			expiresIn: tokens.expiresIn,
			isNewUser,
		};
	}

	/**
	 * Remove OAuth provider link (for deauthorization callbacks)
	 */
	async removeOAuthProvider(
		provider: 'google' | 'facebook' | 'apple',
		providerUserId: string,
		deviceInfo?: { ip?: string; userAgent?: string },
	): Promise<boolean> {
		try {
			// Find the OAuth provider record
			const [existingProvider] = await db
				.select()
				.from(oauthProviders)
				.where(
					and(
						eq(oauthProviders.provider, provider),
						eq(oauthProviders.providerUserId, providerUserId),
					),
				);

			if (!existingProvider) {
				logger.warn(`OAuth provider not found: ${provider}:${providerUserId}`);
				return false;
			}

			// Delete the OAuth provider record
			await db.delete(oauthProviders).where(eq(oauthProviders.id, existingProvider.id));

			// Log the deauthorization
			await this.logAuditEvent({
				userId: existingProvider.userId,
				eventType: AuditEventType.OAUTH_UNLINK,
				ipAddress: deviceInfo?.ip,
				userAgent: deviceInfo?.userAgent,
				metadata: { provider, providerUserId },
				success: true,
			});

			logger.info(`OAuth provider unlinked: ${provider}:${providerUserId}`);
			return true;
		} catch (error) {
			logger.error('Failed to remove OAuth provider:', error);
			return false;
		}
	}

	/**
	 * Log audit event
	 */
	private async logAuditEvent(data: {
		userId?: string;
		eventType: string;
		ipAddress?: string;
		userAgent?: string;
		metadata?: Record<string, any>;
		success?: boolean;
	}) {
		try {
			await db.insert(authAuditLog).values({
				userId: data.userId || null,
				eventType: data.eventType,
				ipAddress: data.ipAddress || null,
				userAgent: data.userAgent || null,
				metadata: data.metadata || {},
				success: data.success ?? true,
			});
		} catch (error) {
			logger.error('Failed to log audit event:', error);
		}
	}
}

export const authService = new AuthService();
export default authService;
