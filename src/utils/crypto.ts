import crypto from 'crypto';

/**
 * Generate random token
 */
export const generateToken = (length: number = 32): string => {
	return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token using SHA256
 */
export const hashToken = (token: string): string => {
	return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate secure random string
 */
export const generateSecureRandom = (length: number = 16): string => {
	return crypto
		.randomBytes(Math.ceil(length / 2))
		.toString('hex')
		.slice(0, length);
};

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
	return crypto.randomUUID();
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
export const secureCompare = (a: string, b: string): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export default {
	generateToken,
	hashToken,
	generateSecureRandom,
	generateUUID,
	secureCompare,
};
