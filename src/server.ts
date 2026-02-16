import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from '@/config/passport';
import { initializeFirebase } from '@/config/firebase';
import { config, validateConfig } from '@/config';
import { logger, morganStream } from '@/utils/logger';
import { testConnection } from '@/db';
import authRoutes from '@/routes/auth';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { generalLimiter } from '@/middleware/rateLimiter';
import { printRoutes } from '@/utils/printRoutes';

// Validate configuration
validateConfig();

// Create Express app
const app: Application = express();

/**
 * Middleware Setup
 */

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
	cors({
		origin: config.security.corsOrigin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP request logger
if (config.env === 'development') {
	app.use(morgan('dev'));
} else {
	app.use(morgan('combined', { stream: morganStream }));
}

// Initialize Passport
app.use(passport.initialize());

// Rate limiting
app.use(generalLimiter);

/**
 * Health Check Route
 */
app.get('/health', (req, res) => {
	res.json({
		success: true,
		data: {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			environment: config.env,
			version: '1.0.0',
		},
	});
});

/**
 * API Routes
 */
app.use(`/api/${config.apiVersion}/auth`, authRoutes);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async (): Promise<void> => {
	try {
		// Test database connection
		const dbConnected = await testConnection();
		if (!dbConnected) {
			throw new Error('Failed to connect to database');
		}

		// Initialize Firebase
		if (config.features.firebaseAuth) {
			initializeFirebase();
		}

		// Start listening
		const server = app.listen(config.port, () => {
			logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Auth System Server Started Successfully              ║
║                                                           ║
║   Environment: ${config.env.padEnd(43)}║
║   Port:        ${config.port.toString().padEnd(43)}║
║   API Version: ${config.apiVersion.padEnd(43)}║
║   URL:         http://localhost:${config.port.toString().padEnd(31)}║
║                                                           ║
║   Health:      http://localhost:${config.port}/health${' '.repeat(18)}║
║   API Docs:    http://localhost:${config.port}/api/${config.apiVersion}${' '.repeat(16)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);

			logger.info('Features enabled:');
			logger.info(`  - Email Auth:      ${config.features.emailAuth}`);
			logger.info(`  - Google OAuth:    ${config.features.oauthGoogle}`);
			logger.info(`  - Facebook OAuth:  ${config.features.oauthFacebook}`);
			logger.info(`  - Apple OAuth:     ${config.features.oauthApple}`);
			logger.info(`  - Firebase Auth:   ${config.features.firebaseAuth}`);

			// Print all registered routes
			printRoutes(app);
		});

		// Graceful shutdown
		const gracefulShutdown = async (signal: string) => {
			logger.info(`\n${signal} received. Starting graceful shutdown...`);

			server.close(async () => {
				logger.info('HTTP server closed');

				try {
					const { closeConnection } = await import('@/db');
					await closeConnection();
					logger.info('Database connection closed');
					process.exit(0);
				} catch (error) {
					logger.error('Error during shutdown:', error);
					process.exit(1);
				}
			});

			// Force shutdown after 10 seconds
			setTimeout(() => {
				logger.error('Forced shutdown after timeout');
				process.exit(1);
			}, 10000);
		};

		process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => gracefulShutdown('SIGINT'));
	} catch (error) {
		logger.error('Failed to start server:', error);
		process.exit(1);
	}
};

// Start the server
startServer();

export default app;
