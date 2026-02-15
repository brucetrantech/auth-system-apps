import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'deleted';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type OAuthProviderType = 'google' | 'facebook' | 'apple';

export interface OAuthProfile {
  provider: OAuthProviderType;
  providerId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  platform?: string;
  browser?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface AuditLogData {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
}

export enum AuditEventType {
  REGISTER = 'user.register',
  LOGIN = 'user.login',
  LOGOUT = 'user.logout',
  LOGIN_FAILED = 'user.login.failed',
  PASSWORD_RESET_REQUEST = 'user.password.reset.request',
  PASSWORD_RESET = 'user.password.reset',
  EMAIL_VERIFY = 'user.email.verify',
  OAUTH_LINK = 'user.oauth.link',
  OAUTH_UNLINK = 'user.oauth.unlink',
  TOKEN_REFRESH = 'user.token.refresh',
  PROFILE_UPDATE = 'user.profile.update',
  ACCOUNT_SUSPEND = 'user.account.suspend',
  ACCOUNT_DELETE = 'user.account.delete',
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}
