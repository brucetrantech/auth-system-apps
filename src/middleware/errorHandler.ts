import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/types';
import { logger } from '@/utils/logger';
import { config } from '@/config';

/**
 * Error handler middleware
 */
export const errorHandler = (
	err: Error | AppError,
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	// Default error values
	let statusCode = 500;
	let message = 'Internal server error';
	let isOperational = false;

	// Handle AppError instances
	if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
		isOperational = err.isOperational;
	}

	// Log error
	if (!isOperational || statusCode >= 500) {
		logger.error('Error:', {
			message: err.message,
			stack: err.stack,
			url: req.url,
			method: req.method,
			ip: req.ip,
			userId: (req as any).user?.id,
		});
	} else {
		logger.warn('Operational error:', {
			message: err.message,
			url: req.url,
			method: req.method,
			statusCode,
		});
	}

	// Send error response
	res.status(statusCode).json({
		success: false,
		error: message,
		...(config.env === 'development' && {
			stack: err.stack,
			details: err,
		}),
	});
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
	res.status(404).json({
		success: false,
		error: 'Route not found',
		path: req.url,
	});
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
	return (req: Request, res: Response, next: NextFunction): Promise<void> => {
		return Promise.resolve(fn(req, res, next)).catch(next);
	};
};

export default {
	errorHandler,
	notFoundHandler,
	asyncHandler,
};
