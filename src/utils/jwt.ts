import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '@/config';
import { logger } from './logger';
import { UnauthorizedError } from '@/types';

export interface JwtPayload {
	userId: string;
	email: string;
	type: 'access' | 'refresh';
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	expiresIn: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId: string, email: string): string => {
	const payload: JwtPayload = {
		userId,
		email,
		type: 'access',
	};

	const options: SignOptions = {
		expiresIn: config.jwt.accessTokenExpiry as jwt.SignOptions['expiresIn'],
		issuer: 'auth-system',
		audience: 'auth-system-api',
	};

	return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId: string, email: string): string => {
	const payload: JwtPayload = {
		userId,
		email,
		type: 'refresh',
	};

	const options: SignOptions = {
		expiresIn: config.jwt.refreshTokenExpiry as jwt.SignOptions['expiresIn'],
		issuer: 'auth-system',
		audience: 'auth-system-api',
	};

	return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, email: string): TokenPair => {
	return {
		accessToken: generateAccessToken(userId, email),
		refreshToken: generateRefreshToken(userId, email),
		expiresIn: config.jwt.accessTokenExpiry,
	};
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
	try {
		const decoded = jwt.verify(token, config.jwt.secret, {
			issuer: 'auth-system',
			audience: 'auth-system-api',
		}) as JwtPayload;

		return decoded;
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			throw new UnauthorizedError('Token has expired');
		} else if (error instanceof jwt.JsonWebTokenError) {
			throw new UnauthorizedError('Invalid token');
		} else {
			logger.error('JWT verification error:', error);
			throw new UnauthorizedError('Token verification failed');
		}
	}
};

/**
 * Decode JWT token without verification (for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
	try {
		return jwt.decode(token) as JwtPayload;
	} catch (error) {
		logger.error('JWT decode error:', error);
		return null;
	}
};

/**
 * Get token expiration time in seconds
 */
export const getTokenExpiration = (token: string): number | null => {
	const decoded = decodeToken(token);
	if (!decoded || !('exp' in decoded)) {
		return null;
	}
	return (decoded as any).exp;
};

export default {
	generateAccessToken,
	generateRefreshToken,
	generateTokenPair,
	verifyToken,
	decodeToken,
	getTokenExpiration,
};
