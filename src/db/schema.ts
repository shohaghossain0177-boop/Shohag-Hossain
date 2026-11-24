import { relations } from 'drizzle-orm';
import { bigint, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { AppConfig } from '../types/unity.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  role: text('role').notNull().default('member'),
  deviceInfo: text('device_info').notNull().default(''),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const unityConfig = pgTable('unity_config', {
  id: text('id').primaryKey(),
  adminName: text('admin_name').notNull(),
  adminPin: text('admin_pin').notNull(),
  cloudSyncUrl: text('cloud_sync_url').notNull().default(''),
  updatedAtMs: bigint('updated_at_ms', { mode: 'number' }).notNull(),
  lastBackup: text('last_backup').notNull().default(''),
  appConfig: jsonb('app_config').$type<AppConfig>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  photoUrl: text('photo_url').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deposits = pgTable('deposits', {
  id: text('id').primaryKey(),
  memberId: integer('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(),
  amount: integer('amount').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const draws = pgTable('draws', {
  id: text('id').primaryKey(),
  memberId: integer('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  memberName: text('member_name').notNull(),
  date: text('date').notNull(),
  amount: integer('amount').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rules = pgTable('rules', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const paymentRequests = pgTable('payment_requests', {
  id: text('id').primaryKey(),
  memberId: integer('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  memberName: text('member_name').notNull(),
  senderPhone: text('sender_phone').notNull(),
  trxId: text('trx_id').notNull(),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  note: text('note').notNull().default(''),
  status: text('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by').notNull().default(''),
  reviewNote: text('review_note').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull().default('admin'),
  action: text('action').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const membersRelations = relations(members, ({ many }) => ({
  deposits: many(deposits),
  draws: many(draws),
  paymentRequests: many(paymentRequests),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  member: one(members, {
    fields: [deposits.memberId],
    references: [members.id],
  }),
}));

export const drawsRelations = relations(draws, ({ one }) => ({
  member: one(members, {
    fields: [draws.memberId],
    references: [members.id],
  }),
}));

export const paymentRequestsRelations = relations(paymentRequests, ({ one }) => ({
  member: one(members, {
    fields: [paymentRequests.memberId],
    references: [members.id],
  }),
}));
