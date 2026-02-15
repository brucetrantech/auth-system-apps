import { generateAccessToken, generateRefreshToken, generateTokenPair, verifyToken } from '@/utils/jwt';

describe('JWT Utils', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const email = 'test@example.com';

    describe('generateAccessToken', () => {
        it('should generate access token', () => {
            const token = generateAccessToken(userId, email);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate refresh token', () => {
            const token = generateRefreshToken(userId, email);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
    });

    describe('generateTokenPair', () => {
        it('should generate both access and refresh tokens', () => {
            const tokens = generateTokenPair(userId, email);

            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
            expect(tokens.expiresIn).toBeDefined();
            expect(tokens.accessToken).not.toBe(tokens.refreshToken);
        });
    });

    describe('verifyToken', () => {
        it('should verify valid access token', () => {
            const token = generateAccessToken(userId, email);
            const payload = verifyToken(token);

            expect(payload.userId).toBe(userId);
            expect(payload.email).toBe(email);
            expect(payload.type).toBe('access');
        });

        it('should verify valid refresh token', () => {
            const token = generateRefreshToken(userId, email);
            const payload = verifyToken(token);

            expect(payload.userId).toBe(userId);
            expect(payload.email).toBe(email);
            expect(payload.type).toBe('refresh');
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
        });

        it('should throw error for malformed token', () => {
            const malformedToken = 'not-a-jwt-token';

            expect(() => verifyToken(malformedToken)).toThrow();
        });
    });
});
