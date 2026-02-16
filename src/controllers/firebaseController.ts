import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { verifyFirebaseToken } from '@/config/firebase';
import { authService } from '@/services/authService';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { OAuthProfile, DeviceInfo } from '@/types';

/**
 * Get device info from request
 */
const getDeviceInfo = (req: Request): DeviceInfo => ({
	userAgent: req.headers['user-agent'],
	ip: req.ip || req.socket.remoteAddress,
	platform: req.headers['sec-ch-ua-platform'] as string | undefined,
	browser: req.headers['sec-ch-ua'] as string | undefined,
});

/**
 * Map Firebase provider to OAuth provider type
 */
const mapFirebaseProvider = (providerId: string): 'google' | 'facebook' | 'apple' | null => {
	switch (providerId) {
		case 'google.com':
			return 'google';
		case 'facebook.com':
			return 'facebook';
		case 'apple.com':
			return 'apple';
		default:
			return null;
	}
};

/**
 * Validation rules for Firebase auth
 */
export const firebaseAuthValidation = [
	body('idToken').notEmpty().withMessage('Firebase ID token is required'),
];

/**
 * Authenticate with Firebase ID token
 * POST /api/v1/auth/firebase
 */
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Check validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: errors.array(),
			});
		}

		// Check if Firebase auth is enabled
		if (!config.features.firebaseAuth) {
			return res.status(503).json({
				success: false,
				message: 'Firebase authentication is not enabled',
			});
		}

		const { idToken } = req.body;

		// Verify Firebase token
		const decodedToken = await verifyFirebaseToken(idToken);

		if (!decodedToken) {
			return res.status(401).json({
				success: false,
				message: 'Invalid or expired Firebase token',
			});
		}

		// Extract user info from decoded token
		const {
			uid,
			email,
			name,
			picture,
			firebase: { sign_in_provider },
		} = decodedToken;

		// Determine the OAuth provider
		const provider = mapFirebaseProvider(sign_in_provider);

		if (!provider && sign_in_provider !== 'password') {
			logger.warn(`Unsupported Firebase provider: ${sign_in_provider}`);
			return res.status(400).json({
				success: false,
				message: `Unsupported authentication provider: ${sign_in_provider}`,
			});
		}

		const deviceInfo = getDeviceInfo(req);

		// For social providers, use OAuth flow
		if (provider) {
			const oauthProfile: OAuthProfile = {
				provider,
				providerId: uid,
				email: email || '',
				displayName: name,
				avatarUrl: picture,
				accessToken: idToken,
			};

			const result = await authService.handleOAuthCallback(oauthProfile, deviceInfo);

			return res.status(200).json({
				success: true,
				data: {
					accessToken: result.accessToken,
					refreshToken: result.refreshToken,
					tokenType: 'Bearer',
					expiresIn: result.expiresIn,
					user: result.user,
					isNewUser: result.isNewUser,
				},
			});
		}

		// For email/password users from Firebase (if needed)
		// This handles cases where Firebase manages email/password auth
		if (sign_in_provider === 'password' && email) {
			// Create or get user with email
			const oauthProfile: OAuthProfile = {
				provider: 'google', // Use google as default provider for email users
				providerId: uid,
				email,
				displayName: name,
				accessToken: idToken,
			};

			const result = await authService.handleOAuthCallback(oauthProfile, deviceInfo);

			return res.status(200).json({
				success: true,
				data: {
					accessToken: result.accessToken,
					refreshToken: result.refreshToken,
					tokenType: 'Bearer',
					expiresIn: result.expiresIn,
					user: result.user,
					isNewUser: result.isNewUser,
				},
			});
		}

		return res.status(400).json({
			success: false,
			message: 'Unable to process authentication',
		});
	} catch (error) {
		logger.error('Firebase auth error:', error);
		return next(error);
	}
};

export default {
	firebaseAuthValidation,
	firebaseAuth,
};
