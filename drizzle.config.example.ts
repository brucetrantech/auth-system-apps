import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    schema: './src/db/schema.ts',
    out: './drizzle',
    driver: 'pg',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL || 'postgresql://your_db_user:your_db_password@your_db_host:5432/auth_system',
    },
    verbose: true,
    strict: true,
} satisfies Config;
