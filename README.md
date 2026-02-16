# Authentication System Backend

A production-ready authentication system built with TypeScript, Express.js, Drizzle ORM, and PostgreSQL. Supports email/password authentication and OAuth2 (Google, Facebook, Apple).

---

## Introduction

This project provides a complete backend authentication solution designed for modern web applications. It includes secure user registration, login, password management, and social authentication through OAuth2 providers (Google, Facebook, Apple).

### Key Features

| Feature             | Description                                            |
| ------------------- | ------------------------------------------------------ |
| Email/Password Auth | Secure user registration and login with bcrypt hashing |
| OAuth2 Integration  | Google, Facebook, and Apple Sign-In support            |
| JWT Tokens          | Access tokens (15min) and refresh tokens (30 days)     |
| Email Verification  | Email confirmation workflow with secure tokens         |
| Password Reset      | Secure password recovery via email                     |
| Rate Limiting       | Protection against brute force attacks                 |
| Audit Logging       | Complete authentication event tracking                 |
| Type Safety         | Full TypeScript with Drizzle ORM                       |

### Tech Stack

- **Runtime**: Node.js 18+ / Bun 1.0+
- **Framework**: Express.js
- **Database**: PostgreSQL 13+ with Drizzle ORM
- **Cache**: Redis (optional, for distributed rate limiting)
- **Testing**: Jest with coverage reporting

---

## How to Set Up

### Prerequisites

Ensure you have the following installed:

- Node.js >= 18.0.0 or Bun >= 1.0.0
- PostgreSQL >= 13
- Redis (optional)

### Step 1: Install Dependencies

```bash
cd auth-system-apps
bun install
# or
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Update the `.env` file with your settings. See `.env.example` for all available options.

### Step 3: Set Up Database

```bash
# Create the database
createdb auth_system

# Run migrations
bun run db:migrate

# Or push schema directly (for development)
bun run db:push
```

### Step 4: Start the Server

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run build && bun start
```

The server will be available at `http://localhost:3000`

---

## Running Tests

The project uses Jest for testing with comprehensive coverage requirements.

### Commands

| Command              | Description                 |
| -------------------- | --------------------------- |
| `bun test`           | Run all tests with coverage |
| `bun run test:watch` | Run tests in watch mode     |
| `bun run test:ci`    | Run tests for CI pipelines  |

### Coverage Thresholds

All coverage metrics must meet **70%** minimum:

- Branches, Functions, Lines, Statements

### Example

```bash
# Run full test suite
bun test

# Watch mode for development
bun run test:watch
```

---

## Build and Deploy

### Build for Production

```bash
bun run build
```

Output will be in the `dist/` directory.

### Docker Deployment

```bash
# Build the image
docker build -t auth-system .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret-key \
  auth-system
```

### Docker Compose

```bash
# Start all services (app, postgres, redis)
docker-compose up -d
```

### AWS Elastic Beanstalk

```bash
# Initialize
eb init -p node.js-18 auth-system --region us-east-1

# Create and deploy
eb create auth-system-production
eb deploy
```

---

## API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication Endpoints

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/auth/register`        | Register a new user          |
| POST   | `/auth/login`           | Login with email/password    |
| POST   | `/auth/refresh`         | Refresh access token         |
| POST   | `/auth/logout`          | Logout and invalidate tokens |
| POST   | `/auth/verify-email`    | Verify email address         |
| POST   | `/auth/forgot-password` | Request password reset       |
| POST   | `/auth/reset-password`  | Reset password with token    |
| GET    | `/auth/me`              | Get current user profile     |
| PATCH  | `/auth/me`              | Update user profile          |
| GET    | `/auth/me/providers`    | Get linked OAuth providers   |
| DELETE | `/auth/me/providers`    | Unlink an OAuth provider     |

### OAuth Endpoints

| Method | Endpoint               | Description                         |
| ------ | ---------------------- | ----------------------------------- |
| GET    | `/auth/oauth/google`   | Initiate Google OAuth               |
| GET    | `/auth/oauth/facebook` | Initiate Facebook OAuth             |
| GET    | `/auth/oauth/apple`    | Initiate Apple OAuth                |
| POST   | `/auth/firebase`       | Authenticate with Firebase ID token |

---

## Firebase Authentication Setup

The system supports Firebase Authentication for social sign-in (Google, Facebook, Apple). This provides a smoother popup-based experience on the frontend.

### Backend Configuration

Add to your `.env` file:

```env
FEATURE_FIREBASE_AUTH=true
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Get these values from Firebase Console → Project Settings → Service Accounts → Generate New Private Key.

### Frontend Configuration

Add to your `clients/.env` file:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Get these values from Firebase Console → Project Settings → General → Your Apps → Web App.

### Apple Sign-In Setup

To enable Sign in with Apple:

1. **Apple Developer Account Setup:**
    - Go to [Apple Developer](https://developer.apple.com/) → Certificates, Identifiers & Profiles
    - Create an App ID with "Sign in with Apple" capability
    - Create a Services ID for web authentication
    - Create a Key for Sign in with Apple

2. **Firebase Console Setup:**
    - Go to **Authentication** → **Sign-in method**
    - Enable **Apple** provider
    - Enter your **Services ID** (from Apple Developer)
    - Enter your **Apple Team ID**
    - Upload your **Key ID** and **Private Key** (`.p8` file contents)

3. **Configure OAuth Consent:**
    - Add your domain to Apple's list of authorized domains
    - Add `https://your-project.firebaseapp.com/__/auth/handler` as a redirect URL

### Enable Multiple Providers Per Email

To allow users to sign in with multiple providers (Google, Facebook, AND Apple) using the same email:

1. Go to **Firebase Console** → **Authentication** → **Settings**
2. Under **User account linking**, select **"Allow creation of multiple accounts with the same email address"**
3. Click **Save**

With this setting:

- Each OAuth provider creates a separate Firebase user
- The backend automatically links them by matching email address
- Users can sign in with any of their linked providers

---

## Project Structure

```
auth-system-apps/
├── src/
│   ├── config/           # Configuration (app settings, passport)
│   ├── controllers/      # Request handlers
│   ├── db/               # Database schema and migrations
│   ├── middleware/       # Auth, validation, rate limiting
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utilities (JWT, crypto, logging)
│   ├── __tests__/        # Test files
│   └── server.ts         # Application entry point
├── drizzle/              # Generated migrations
├── logs/                 # Application logs
└── docs/                 # Additional documentation
```

---

## Available Scripts

| Script                | Description                              |
| --------------------- | ---------------------------------------- |
| `bun run dev`         | Start development server with hot reload |
| `bun run build`       | Build for production                     |
| `bun start`           | Start production server                  |
| `bun test`            | Run tests with coverage                  |
| `bun run lint`        | Run ESLint                               |
| `bun run lint:fix`    | Auto-fix linting issues                  |
| `bun run format`      | Format code with Prettier                |
| `bun run type-check`  | TypeScript type checking                 |
| `bun run db:generate` | Generate Drizzle migrations              |
| `bun run db:migrate`  | Run database migrations                  |
| `bun run db:push`     | Push schema to database                  |
| `bun run db:studio`   | Open Drizzle Studio                      |

---

## Security

This application implements multiple security layers:

- **Password Hashing**: bcrypt with configurable salt rounds
- **JWT Security**: Short-lived access tokens with refresh token rotation
- **Rate Limiting**: Configurable per-endpoint limits
- **CORS**: Strict origin configuration
- **Security Headers**: Helmet middleware
- **Input Validation**: express-validator for all inputs
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **Audit Logging**: All authentication events are logged

---

## Conclusion

This authentication system provides a solid foundation for securing your applications. It covers the essential authentication flows while maintaining flexibility for customization.

### Next Steps

After setup, you can:

1. Configure OAuth providers with your credentials
2. Set up email service (SMTP or AWS SES)
3. Customize rate limiting rules
4. Add additional authentication methods as needed

### Roadmap

- [ ] Two-factor authentication (2FA)
- [ ] Additional social logins (Twitter, LinkedIn)
- [ ] User roles and permissions
- [ ] Per-user API rate limiting
- [ ] WebSocket notifications
- [ ] GraphQL API

---

## License

MIT

## Support

- Create an issue in the repository
- Review the [docs/](docs/) folder for additional documentation
