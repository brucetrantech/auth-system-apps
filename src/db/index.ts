import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '@/config';
import { logger } from '@/utils/logger';

// Create PostgreSQL connection pool
const pool = new Pool({
	host: config.db.host,
	port: config.db.port,
	database: config.db.name,
	user: config.db.user,
	password: config.db.password,
	ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
	logger.error('Unexpected error on idle PostgreSQL client', err);
	process.exit(-1);
});

// Create Drizzle instance
export const db = drizzle(pool, { schema, logger: config.env === 'development' });

// Test database connection
export const testConnection = async (): Promise<boolean> => {
	try {
		const client = await pool.connect();
		await client.query('SELECT NOW()');
		client.release();
		logger.info('✅ Database connection successful');
		return true;
	} catch (error) {
		logger.error('❌ Database connection failed:', error);
		return false;
	}
};

// Close database connection
export const closeConnection = async (): Promise<void> => {
	await pool.end();
	logger.info('Database connection closed');
};

export default db;
