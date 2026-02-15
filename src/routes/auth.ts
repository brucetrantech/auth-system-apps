import { Router } from 'express';
import * as authController from '@/controllers/authController';
import * as oauthController from '@/controllers/oauthController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} from '@/middleware/rateLimiter';

const router = Router();

/**
 * Email/Password Authentication Routes
 */

// Register new user
router.post(
  '/register',
  authLimiter,
  validate(authController.registerValidation),
  authController.register
);

// Login with email and password
router.post('/login', authLimiter, validate(authController.loginValidation), authController.login);

// Refresh access token
router.post('/refresh', validate(authController.refreshValidation), authController.refreshToken);

// Logout
router.post(
  '/logout',
  authenticate,
  validate(authController.logoutValidation),
  authController.logout
);

// Verify email
router.get(
  '/verify-email',
  emailVerificationLimiter,
  // validate(authController.verifyEmailValidation),
  authController.verifyEmail
);

// Request password reset
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(authController.forgotPasswordValidation),
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(authController.resetPasswordValidation),
  authController.resetPassword
);

/**
 * User Profile Routes
 */

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Update profile
router.patch(
  '/me',
  authenticate,
  validate(authController.updateProfileValidation),
  authController.updateProfile
);

/**
 * OAuth Routes
 */

// Google OAuth
router.get('/oauth/google', oauthController.googleAuth);
router.get('/oauth/google/callback', ...oauthController.googleCallback);

// Facebook OAuth
router.get('/oauth/facebook', oauthController.facebookAuth);
router.get('/oauth/facebook/callback', ...oauthController.facebookCallback);

// Apple OAuth
router.get('/oauth/apple', oauthController.appleAuth);
router.post('/oauth/apple/callback', ...oauthController.appleCallback);

export default router;
