import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  apiVersion: string;
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    url: string;
  };
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  email: {
    provider: 'smtp' | 'ses';
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    };
    from: string;
    aws: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    facebook: {
      appId: string;
      appSecret: string;
      callbackUrl: string;
    };
    apple: {
      clientId: string;
      teamId: string;
      keyId: string;
      privateKeyPath: string;
      callbackUrl: string;
    };
  };
  features: {
    emailAuth: boolean;
    oauthGoogle: boolean;
    oauthFacebook: boolean;
    oauthApple: boolean;
  };
  security: {
    bcryptRounds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    corsOrigin: string;
  };
  urls: {
    frontend: string;
    backend: string;
  };
  logging: {
    level: string;
    file: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
    cloudfrontDomain: string;
  };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'auth_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/auth_system',
  },

  jwt: {
    secret:
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'ses') || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/oauth/google/callback',
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackUrl:
        process.env.FACEBOOK_CALLBACK_URL ||
        'http://localhost:3000/api/v1/auth/oauth/facebook/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      keyId: process.env.APPLE_KEY_ID || '',
      privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH || './config/apple-auth-key.p8',
      callbackUrl:
        process.env.APPLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/oauth/apple/callback',
    },
  },

  features: {
    emailAuth: process.env.FEATURE_EMAIL_AUTH === 'true',
    oauthGoogle: process.env.FEATURE_OAUTH_GOOGLE === 'true',
    oauthFacebook: process.env.FEATURE_OAUTH_FACEBOOK === 'true',
    oauthApple: process.env.FEATURE_OAUTH_APPLE === 'true',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },

  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    backend: process.env.BACKEND_URL || 'http://localhost:3000',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    cloudfrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
  },
};

// Validate required configuration
export const validateConfig = (): void => {
  const required = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && config.env === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.jwt.secret.length < 32 && config.env === 'production') {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
};

export default config;
