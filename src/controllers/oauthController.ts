import { Request, Response, NextFunction } from 'express';
import passport from '@/config/passport';
import { authService } from '@/services/authService';
import { OAuthProfile, DeviceInfo } from '@/types';
import { config } from '@/config';
import { logger } from '@/utils/logger';

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
 * Handle OAuth callback
 */
const handleOAuthCallback = async (
	req: Request,
	res: Response,
	profile: OAuthProfile,
): Promise<void> => {
	try {
		const deviceInfo = getDeviceInfo(req);
		const result = await authService.handleOAuthCallback(profile, deviceInfo);

		// Redirect to frontend with tokens
		const redirectUrl = new URL(`${config.urls.frontend}/auth/callback`);
		redirectUrl.searchParams.set('accessToken', result.accessToken);
		redirectUrl.searchParams.set('refreshToken', result.refreshToken);
		redirectUrl.searchParams.set('isNewUser', result.isNewUser.toString());

		res.redirect(redirectUrl.toString());
	} catch (error) {
		logger.error('OAuth callback error:', error);

		const errorUrl = new URL(`${config.urls.frontend}/auth/error`);
		errorUrl.searchParams.set('error', 'authentication_failed');
		errorUrl.searchParams.set(
			'message',
			error instanceof Error ? error.message : 'Unknown error',
		);

		res.redirect(errorUrl.toString());
	}
};

/**
 * Google OAuth - Initiate
 */
export const googleAuth = passport.authenticate('google', {
	scope: ['profile', 'email'],
	session: false,
});

/**
 * Google OAuth - Callback
 */
export const googleCallback = [
	passport.authenticate('google', {
		session: false,
		failureRedirect: `${config.urls.frontend}/auth/error?error=google_auth_failed`,
	}),
	async (req: Request, res: Response, next: NextFunction) => {
		const profile = req.user as OAuthProfile;
		await handleOAuthCallback(req, res, profile);
	},
];

/**
 * Facebook OAuth - Initiate
 */
export const facebookAuth = passport.authenticate('facebook', {
	scope: ['email', 'public_profile'],
	session: false,
});

/**
 * Facebook OAuth - Callback
 */
export const facebookCallback = [
	passport.authenticate('facebook', {
		session: false,
		failureRedirect: `${config.urls.frontend}/auth/error?error=facebook_auth_failed`,
	}),
	async (req: Request, res: Response, next: NextFunction) => {
		const profile = req.user as OAuthProfile;
		await handleOAuthCallback(req, res, profile);
	},
];

/**
 * Apple OAuth - Initiate
 */
export const appleAuth = passport.authenticate('apple', {
	scope: ['name', 'email'],
	session: false,
});

/**
 * Apple OAuth - Callback
 */
export const appleCallback = [
	passport.authenticate('apple', {
		session: false,
		failureRedirect: `${config.urls.frontend}/auth/error?error=apple_auth_failed`,
	}),
	async (req: Request, res: Response, next: NextFunction) => {
		const profile = req.user as OAuthProfile;
		await handleOAuthCallback(req, res, profile);
	},
];

export default {
	googleAuth,
	googleCallback,
	facebookAuth,
	facebookCallback,
	appleAuth,
	appleCallback,
};
