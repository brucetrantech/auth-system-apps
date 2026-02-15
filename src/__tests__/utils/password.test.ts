import {
	hashPassword,
	verifyPassword,
	validatePasswordStrength,
	generateRandomPassword,
} from '@/utils/password';

describe('Password Utils', () => {
	describe('hashPassword', () => {
		it('should hash a password', async () => {
			const password = 'TestPassword123!';
			const hash = await hashPassword(password);

			expect(hash).toBeDefined();
			expect(hash).not.toBe(password);
			expect(hash.length).toBeGreaterThan(0);
		});

		it('should generate different hashes for the same password', async () => {
			const password = 'TestPassword123!';
			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('verifyPassword', () => {
		it('should verify correct password', async () => {
			const password = 'TestPassword123!';
			const hash = await hashPassword(password);
			const isValid = await verifyPassword(password, hash);

			expect(isValid).toBe(true);
		});

		it('should reject incorrect password', async () => {
			const password = 'TestPassword123!';
			const wrongPassword = 'WrongPassword123!';
			const hash = await hashPassword(password);
			const isValid = await verifyPassword(wrongPassword, hash);

			expect(isValid).toBe(false);
		});
	});

	describe('validatePasswordStrength', () => {
		it('should accept strong password', () => {
			const result = validatePasswordStrength('StrongPass123!');

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject password that is too short', () => {
			const result = validatePasswordStrength('Short1!');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Password must be at least 8 characters long');
		});

		it('should reject password without uppercase', () => {
			const result = validatePasswordStrength('lowercase123!');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Password must contain at least one uppercase letter');
		});

		it('should reject password without lowercase', () => {
			const result = validatePasswordStrength('UPPERCASE123!');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Password must contain at least one lowercase letter');
		});

		it('should reject password without number', () => {
			const result = validatePasswordStrength('NoNumbers!');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Password must contain at least one number');
		});

		it('should reject password without special character', () => {
			const result = validatePasswordStrength('NoSpecial123');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Password must contain at least one special character');
		});
	});

	describe('generateRandomPassword', () => {
		it('should generate password of specified length', () => {
			const password = generateRandomPassword(16);

			expect(password).toHaveLength(16);
		});

		it('should generate valid strong password', () => {
			const password = generateRandomPassword();
			const result = validatePasswordStrength(password);

			expect(result.valid).toBe(true);
		});

		it('should generate different passwords each time', () => {
			const password1 = generateRandomPassword();
			const password2 = generateRandomPassword();

			expect(password1).not.toBe(password2);
		});
	});
});
