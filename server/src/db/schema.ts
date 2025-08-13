import { pgTable, uuid, text, numeric, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['cash', 'bank', 'credit_card', 'investment', 'loan']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'transfer']);
export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);
export const frequencyEnum = pgEnum('frequency', ['daily', 'weekly', 'monthly', 'yearly']);
export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'paused']);
export const auditActionEnum = pgEnum('audit_action', ['insert', 'update', 'delete']);

// Profiles table
export const profilesTable = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().unique(),
  display_name: text('display_name').notNull(),
  avatar_url: text('avatar_url'),
  currency: text('currency').notNull().default('IDR'),
  locale: text('locale').notNull().default('id-ID'),
  timezone: text('timezone').notNull().default('Asia/Jakarta'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Accounts table
export const accountsTable = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  color: text('color'),
  icon: text('icon'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: categoryTypeEnum('type').notNull(),
  color: text('color'),
  icon: text('icon'),
  parent_id: uuid('parent_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  account_id: uuid('account_id').notNull(),
  to_account_id: uuid('to_account_id'),
  category_id: uuid('category_id'),
  receipt_url: text('receipt_url'),
  location: text('location'),
  recurring_rule_id: uuid('recurring_rule_id'),
  transaction_date: timestamp('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Budgets table
export const budgetsTable = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  category_id: uuid('category_id').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  period_start: timestamp('period_start').notNull(),
  period_end: timestamp('period_end').notNull(),
  spent_amount: numeric('spent_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Recurring rules table
export const recurringRulesTable = pgTable('recurring_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description').notNull(),
  account_id: uuid('account_id').notNull(),
  to_account_id: uuid('to_account_id'),
  category_id: uuid('category_id'),
  frequency: frequencyEnum('frequency').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  next_due_date: timestamp('next_due_date').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Goals table
export const goalsTable = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  target_amount: numeric('target_amount', { precision: 15, scale: 2 }).notNull(),
  current_amount: numeric('current_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  target_date: timestamp('target_date'),
  status: goalStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
});

// Audit log table
export const auditLogTable = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  table_name: text('table_name').notNull(),
  record_id: uuid('record_id').notNull(),
  action: auditActionEnum('action').notNull(),
  old_values: text('old_values'), // JSON string
  new_values: text('new_values'), // JSON string
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const profilesRelations = relations(profilesTable, ({ many }) => ({
  accounts: many(accountsTable),
  categories: many(categoriesTable),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable),
  recurringRules: many(recurringRulesTable),
  goals: many(goalsTable),
  auditLogs: many(auditLogTable)
}));

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [accountsTable.user_id],
    references: [profilesTable.user_id]
  }),
  transactions: many(transactionsTable),
  transferTransactions: many(transactionsTable, {
    relationName: 'transferDestination'
  }),
  recurringRules: many(recurringRulesTable),
  recurringRulesTo: many(recurringRulesTable, {
    relationName: 'recurringRuleDestination'
  })
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [categoriesTable.user_id],
    references: [profilesTable.user_id]
  }),
  parent: one(categoriesTable, {
    fields: [categoriesTable.parent_id],
    references: [categoriesTable.id],
    relationName: 'categoryHierarchy'
  }),
  children: many(categoriesTable, {
    relationName: 'categoryHierarchy'
  }),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable),
  recurringRules: many(recurringRulesTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  profile: one(profilesTable, {
    fields: [transactionsTable.user_id],
    references: [profilesTable.user_id]
  }),
  account: one(accountsTable, {
    fields: [transactionsTable.account_id],
    references: [accountsTable.id]
  }),
  toAccount: one(accountsTable, {
    fields: [transactionsTable.to_account_id],
    references: [accountsTable.id],
    relationName: 'transferDestination'
  }),
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id]
  }),
  recurringRule: one(recurringRulesTable, {
    fields: [transactionsTable.recurring_rule_id],
    references: [recurringRulesTable.id]
  })
}));

export const budgetsRelations = relations(budgetsTable, ({ one }) => ({
  profile: one(profilesTable, {
    fields: [budgetsTable.user_id],
    references: [profilesTable.user_id]
  }),
  category: one(categoriesTable, {
    fields: [budgetsTable.category_id],
    references: [categoriesTable.id]
  })
}));

export const recurringRulesRelations = relations(recurringRulesTable, ({ one, many }) => ({
  profile: one(profilesTable, {
    fields: [recurringRulesTable.user_id],
    references: [profilesTable.user_id]
  }),
  account: one(accountsTable, {
    fields: [recurringRulesTable.account_id],
    references: [accountsTable.id]
  }),
  toAccount: one(accountsTable, {
    fields: [recurringRulesTable.to_account_id],
    references: [accountsTable.id],
    relationName: 'recurringRuleDestination'
  }),
  category: one(categoriesTable, {
    fields: [recurringRulesTable.category_id],
    references: [categoriesTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const goalsRelations = relations(goalsTable, ({ one }) => ({
  profile: one(profilesTable, {
    fields: [goalsTable.user_id],
    references: [profilesTable.user_id]
  })
}));

export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
  profile: one(profilesTable, {
    fields: [auditLogTable.user_id],
    references: [profilesTable.user_id]
  })
}));

// TypeScript types for the table schemas
export type Profile = typeof profilesTable.$inferSelect;
export type NewProfile = typeof profilesTable.$inferInsert;

export type Account = typeof accountsTable.$inferSelect;
export type NewAccount = typeof accountsTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Budget = typeof budgetsTable.$inferSelect;
export type NewBudget = typeof budgetsTable.$inferInsert;

export type RecurringRule = typeof recurringRulesTable.$inferSelect;
export type NewRecurringRule = typeof recurringRulesTable.$inferInsert;

export type Goal = typeof goalsTable.$inferSelect;
export type NewGoal = typeof goalsTable.$inferInsert;

export type AuditLog = typeof auditLogTable.$inferSelect;
export type NewAuditLog = typeof auditLogTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  profiles: profilesTable,
  accounts: accountsTable,
  categories: categoriesTable,
  transactions: transactionsTable,
  budgets: budgetsTable,
  recurringRules: recurringRulesTable,
  goals: goalsTable,
  auditLog: auditLogTable
};