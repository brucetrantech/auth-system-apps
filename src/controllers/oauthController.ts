import { Request, Response } from 'express';
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
	profile?: OAuthProfile,
): Promise<void> => {
	try {
		if (!profile) {
			logger.warn('OAuth callback: Missing profile');
			throw new Error('Authentication failed');
		}
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
	async (req: Request, res: Response) => {
		const profile = req.oauthUser;
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
	async (req: Request, res: Response) => {
		const profile = req.oauthUser;
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
	async (req: Request, res: Response) => {
		const profile = req.oauthUser;
		await handleOAuthCallback(req, res, profile);
	},
];

/**
 * Facebook OAuth - Deauthorize callback
 * Called by Facebook when a user removes the app from their account
 */
export const facebookDeauthorize = async (req: Request, res: Response) => {
	try {
		const signedRequest = req.body.signed_request;

		if (!signedRequest) {
			logger.warn('Facebook deauthorize: Missing signed_request');
			return res.status(400).json({ success: false, message: 'Missing signed_request' });
		}

		// Parse and verify the signed request
		const [encodedSig, payload] = signedRequest.split('.');

		if (!encodedSig || !payload) {
			logger.warn('Facebook deauthorize: Invalid signed_request format');
			return res.status(400).json({ success: false, message: 'Invalid signed_request' });
		}

		// Decode the payload
		const data = JSON.parse(
			Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
		);

		// Verify signature using HMAC-SHA256
		const crypto = await import('crypto');
		const expectedSig = crypto
			.createHmac('sha256', config.oauth.facebook.appSecret)
			.update(payload)
			.digest('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		if (encodedSig !== expectedSig) {
			logger.warn('Facebook deauthorize: Invalid signature');
			return res.status(403).json({ success: false, message: 'Invalid signature' });
		}

		const facebookUserId = data.user_id;

		if (!facebookUserId) {
			logger.warn('Facebook deauthorize: Missing user_id in payload');
			return res.status(400).json({ success: false, message: 'Missing user_id' });
		}

		logger.info(`Facebook deauthorize request for user: ${facebookUserId}`);

		// Remove the OAuth provider link
		await authService.removeOAuthProvider('facebook', facebookUserId, {
			ip: req.ip || req.socket.remoteAddress,
			userAgent: req.headers['user-agent'],
		});

		// Facebook expects a JSON response with a confirmation URL (optional)
		return res.status(200).json({
			success: true,
			url: `${config.urls.frontend}/account/deauthorized`,
			confirmation_code: facebookUserId,
		});
	} catch (error) {
		logger.error('Facebook deauthorize error:', error);
		return res.status(500).json({ success: false, message: 'Internal server error' });
	}
};

export default {
	googleAuth,
	googleCallback,
	facebookAuth,
	facebookCallback,
	facebookDeauthorize,
	appleAuth,
	appleCallback,
};
