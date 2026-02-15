import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'facebook', 'apple']);
export const tokenTypeEnum = pgEnum('token_type', ['email_verification', 'password_reset']);

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    phoneNumber: varchar('phone_number', { length: 50 }),
    status: userStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
  },
  (table) => {
    return {
      emailIdx: index('idx_users_email').on(table.email),
      statusIdx: index('idx_users_status').on(table.status),
    };
  }
);

// OAuth providers table
export const oauthProviders = pgTable(
  'oauth_providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    providerEmail: varchar('provider_email', { length: 255 }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('idx_oauth_user_id').on(table.userId),
      providerIdx: uniqueIndex('idx_oauth_provider').on(table.provider, table.providerUserId),
    };
  }
);

// Refresh tokens table
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    deviceInfo: jsonb('device_info').default({}).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => {
    return {
      userIdIdx: index('idx_refresh_tokens_user').on(table.userId),
      tokenHashIdx: index('idx_refresh_tokens_hash').on(table.tokenHash),
      expiresAtIdx: index('idx_refresh_tokens_expires').on(table.expiresAt),
    };
  }
);

// Verification tokens table
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    tokenType: tokenTypeEnum('token_type').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      tokenIdx: index('idx_verification_tokens').on(table.token, table.tokenType),
      userIdIdx: index('idx_verification_tokens_user').on(table.userId),
    };
  }
);

// Auth audit log table
export const authAuditLog = pgTable(
  'auth_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').default({}).notNull(),
    success: boolean('success').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('idx_audit_user').on(table.userId, table.createdAt),
      eventTypeIdx: index('idx_audit_event').on(table.eventType, table.createdAt),
      createdAtIdx: index('idx_audit_created').on(table.createdAt),
    };
  }
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  oauthProviders: many(oauthProviders),
  refreshTokens: many(refreshTokens),
  verificationTokens: many(verificationTokens),
  auditLogs: many(authAuditLog),
}));

export const oauthProvidersRelations = relations(oauthProviders, ({ one }) => ({
  user: one(users, {
    fields: [oauthProviders.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [verificationTokens.userId],
    references: [users.id],
  }),
}));

export const authAuditLogRelations = relations(authAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [authAuditLog.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type NewOAuthProvider = typeof oauthProviders.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type AuthAuditLog = typeof authAuditLog.$inferSelect;
export type NewAuthAuditLog = typeof authAuditLog.$inferInsert;
