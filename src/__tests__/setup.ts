import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-min-32-chars';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/auth_system_test';

// Mock logger to reduce noise in tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: {
    write: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(30000);
