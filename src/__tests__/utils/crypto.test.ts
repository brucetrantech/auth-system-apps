import { generateToken, hashToken, generateSecureRandom, secureCompare } from '@/utils/crypto';

describe('Crypto Utils', () => {
    describe('generateToken', () => {
        it('should generate token of default length', () => {
            const token = generateToken();

            expect(token).toBeDefined();
            expect(token.length).toBe(64); // 32 bytes = 64 hex characters
        });

        it('should generate token of specified length', () => {
            const token = generateToken(16);

            expect(token.length).toBe(32); // 16 bytes = 32 hex characters
        });

        it('should generate different tokens', () => {
            const token1 = generateToken();
            const token2 = generateToken();

            expect(token1).not.toBe(token2);
        });
    });

    describe('hashToken', () => {
        it('should hash token', () => {
            const token = 'test-token';
            const hash = hashToken(token);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(token);
            expect(hash.length).toBe(64); // SHA256 = 64 hex characters
        });

        it('should generate same hash for same token', () => {
            const token = 'test-token';
            const hash1 = hashToken(token);
            const hash2 = hashToken(token);

            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different tokens', () => {
            const hash1 = hashToken('token1');
            const hash2 = hashToken('token2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('generateSecureRandom', () => {
        it('should generate random string of default length', () => {
            const random = generateSecureRandom();

            expect(random).toBeDefined();
            expect(random.length).toBe(16);
        });

        it('should generate random string of specified length', () => {
            const random = generateSecureRandom(32);

            expect(random.length).toBe(32);
        });

        it('should generate different strings', () => {
            const random1 = generateSecureRandom();
            const random2 = generateSecureRandom();

            expect(random1).not.toBe(random2);
        });
    });

    describe('secureCompare', () => {
        it('should return true for identical strings', () => {
            const str = 'test-string';
            const result = secureCompare(str, str);

            expect(result).toBe(true);
        });

        it('should return false for different strings', () => {
            const result = secureCompare('string1', 'string2');

            expect(result).toBe(false);
        });

        it('should return false for strings of different lengths', () => {
            const result = secureCompare('short', 'longer-string');

            expect(result).toBe(false);
        });
    });
});
