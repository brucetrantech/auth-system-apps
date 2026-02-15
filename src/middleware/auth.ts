import { Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt';
import { AuthRequest, UnauthorizedError } from '@/types';
import { logger } from '@/utils/logger';
import db from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Attach user to request
    (req as any).user = user;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.error('Authentication error:', error);
      next(new UnauthorizedError('Invalid token'));
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      return next();
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user && user.status === 'active') {
      (req as any).user = user;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerified = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  if (!req.user.emailVerified) {
    return next(new UnauthorizedError('Email not verified'));
  }

  next();
};

export default {
  authenticate,
  optionalAuth,
  requireEmailVerified,
};
