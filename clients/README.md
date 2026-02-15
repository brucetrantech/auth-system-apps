# Auth System Client

A React frontend for the authentication system using TypeScript, Vite, and TanStack Query.

## Features

- Sign-up with email/password
- Sign-in with email/password
- OAuth authentication (Google, Facebook, Apple)
- Email verification flow
- User dashboard with profile

## Setup

```bash
cd clients
npm install
npm run dev
```

The app runs on `http://localhost:3001` and proxies API requests to `http://localhost:3000`.

## Pages

| Route | Description |
|-------|-------------|
| `/signin` | Sign-in page with email/password and social auth |
| `/signup` | Sign-up page with email/password and social auth |
| `/` | Home dashboard (protected) |
| `/verify-email` | Email verification success page |
| `/auth/callback` | OAuth callback handler |
