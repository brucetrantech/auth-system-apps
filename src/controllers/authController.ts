import { Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { authService } from '@/services/authService';
import { AuthRequest, RegisterDto, LoginDto, DeviceInfo } from '@/types';
import { asyncHandler } from '@/middleware/errorHandler';
import db from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get device info from request
 */
const getDeviceInfo = (req: AuthRequest): DeviceInfo => ({
	userAgent: req.headers['user-agent'],
	ip: req.ip || req.socket.remoteAddress,
	platform: req.headers['sec-ch-ua-platform'] as string | undefined,
	browser: req.headers['sec-ch-ua'] as string | undefined,
});

/**
 * Register validation rules
 */
export const registerValidation = [
	body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
	body('password')
		.isLength({ min: 8 })
		.withMessage('Password must be at least 8 characters long'),
	body('displayName').optional().trim().isLength({ min: 1, max: 255 }),
];

/**
 * Register new user
 */
export const register = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const data: RegisterDto = req.body;
		const deviceInfo = getDeviceInfo(req);

		const result = await authService.register(data, deviceInfo);

		res.status(201).json({
			success: true,
			data: result,
		});
	},
);

/**
 * Login validation rules
 */
export const loginValidation = [
	body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
	body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Login with email and password
 */
export const login = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
	const data: LoginDto = req.body;
	const deviceInfo = getDeviceInfo(req);

	const result = await authService.login(data, deviceInfo);

	res.json({
		success: true,
		data: result,
	});
});

/**
 * Refresh token validation rules
 */
export const refreshValidation = [
	body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const { refreshToken } = req.body;
		const deviceInfo = getDeviceInfo(req);

		const result = await authService.refreshAccessToken(refreshToken, deviceInfo);

		res.json({
			success: true,
			data: result,
		});
	},
);

/**
 * Logout validation rules
 */
export const logoutValidation = [
	body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
	const { refreshToken } = req.body;
	const userId = req.user!.id;
	const deviceInfo = getDeviceInfo(req);

	const result = await authService.logout(refreshToken, userId, deviceInfo);

	res.json({
		success: true,
		data: result,
	});
});

/**
 * Verify email validation rules
 */
export const verifyEmailValidation = [
	query('token').notEmpty().withMessage('Verification token is required'),
];

/**
 * Verify email address
 */
export const verifyEmail = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const { token } = req.query;

		const result = await authService.verifyEmail(token as string);

		res.json({
			success: true,
			data: result,
		});
	},
);

/**
 * Forgot password validation rules
 */
export const forgotPasswordValidation = [
	body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

/**
 * Request password reset
 */
export const forgotPassword = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const { email } = req.body;
		const deviceInfo = getDeviceInfo(req);

		const result = await authService.requestPasswordReset(email, deviceInfo);

		res.json({
			success: true,
			data: result,
		});
	},
);

/**
 * Reset password validation rules
 */
export const resetPasswordValidation = [
	body('token').notEmpty().withMessage('Reset token is required'),
	body('newPassword')
		.isLength({ min: 8 })
		.withMessage('Password must be at least 8 characters long'),
];

/**
 * Reset password
 */
export const resetPassword = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const { token, newPassword } = req.body;
		const deviceInfo = getDeviceInfo(req);

		const result = await authService.resetPassword(token, newPassword, deviceInfo);

		res.json({
			success: true,
			data: result,
		});
	},
);

/**
 * Get current user profile
 */
export const getCurrentUser = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const userId = req.user!.id;

		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				emailVerified: users.emailVerified,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				phoneNumber: users.phoneNumber,
				status: users.status,
				createdAt: users.createdAt,
				lastLoginAt: users.lastLoginAt,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		res.json({
			success: true,
			data: { user },
		});
	},
);

/**
 * Update profile validation rules
 */
export const updateProfileValidation = [
	body('displayName').optional().trim().isLength({ min: 1, max: 255 }),
	body('phoneNumber').optional().trim().isMobilePhone('any'),
	body('avatarUrl').optional().trim().isURL(),
];

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(
	async (req: AuthRequest, res: Response, next: NextFunction) => {
		const userId = req.user!.id;
		const { displayName, phoneNumber, avatarUrl } = req.body;

		const updateData: any = {};
		if (displayName !== undefined) updateData.displayName = displayName;
		if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
		if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

		const [updatedUser] = await db
			.update(users)
			.set(updateData)
			.where(eq(users.id, userId))
			.returning({
				id: users.id,
				email: users.email,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				phoneNumber: users.phoneNumber,
			});

		res.json({
			success: true,
			data: { user: updatedUser },
			message: 'Profile updated successfully',
		});
	},
);

export default {
	register,
	registerValidation,
	login,
	loginValidation,
	refreshToken,
	refreshValidation,
	logout,
	logoutValidation,
	verifyEmail,
	verifyEmailValidation,
	forgotPassword,
	forgotPasswordValidation,
	resetPassword,
	resetPasswordValidation,
	getCurrentUser,
	updateProfile,
	updateProfileValidation,
};
