import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  password: text().notNull(),
  role: text({ enum: ['user', 'admin'] }).notNull().default('user'),
  currency: text({ enum: ['USD', 'EUR'] }).notNull().default('USD'),
  avatar: text(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// User sessions for authentication
export const sessions = sqliteTable('sessions', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text().notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// Monthly budget configuration per user
export const budgets = sqliteTable('budgets', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  monthlyAmount: real('monthly_amount').notNull(),
  month: integer().notNull(), // 1-12
  year: integer().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// Individual expenses
export const expenses = sqliteTable('expenses', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: real().notNull(),
  description: text(),
  date: text().notNull(), // YYYY-MM-DD format
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// Daily log with carryover tracking
export const dailyLogs = sqliteTable('daily_logs', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  date: text().notNull(), // YYYY-MM-DD format
  dailyBudget: real('daily_budget').notNull(), // Base daily budget
  carryover: real().notNull().default(0), // Amount carried from previous day (+ or -)
  totalSpent: real('total_spent').notNull().default(0),
  remaining: real().notNull().default(0), // dailyBudget + carryover - totalSpent
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})
