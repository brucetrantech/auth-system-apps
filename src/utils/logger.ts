import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '@/config';

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.splat(),
	winston.format.json(),
);

// Create console format for development
const consoleFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.printf(({ timestamp, level, message, ...meta }) => {
		let msg = `${timestamp} [${level}]: ${message}`;
		if (Object.keys(meta).length > 0) {
			msg += ` ${JSON.stringify(meta)}`;
		}
		return msg;
	}),
);

// Create logger instance
export const logger = winston.createLogger({
	level: config.logging.level,
	format: logFormat,
	defaultMeta: { service: 'auth-system' },
	transports: [
		// Write all logs to file
		new winston.transports.File({
			filename: config.logging.file,
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),
		// Write errors to separate file
		new winston.transports.File({
			filename: path.join(logsDir, 'error.log'),
			level: 'error',
			maxsize: 5242880,
			maxFiles: 5,
		}),
	],
});

// Add console transport in development
if (config.env !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: consoleFormat,
		}),
	);
}

// Create stream for Morgan HTTP logger
export const morganStream = {
	write: (message: string) => {
		logger.info(message.trim());
	},
};

export default logger;
