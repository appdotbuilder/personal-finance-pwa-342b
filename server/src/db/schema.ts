import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  date
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', [
  'checking', 
  'savings', 
  'credit_card', 
  'investment', 
  'cash', 
  'loan'
]);

export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);

export const budgetPeriodEnum = pgEnum('budget_period', ['weekly', 'monthly', 'yearly']);

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  'daily', 
  'weekly', 
  'monthly', 
  'yearly'
]);

export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'paused']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Accounts table
export const accountsTable = pgTable('accounts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  type: categoryTypeEnum('type').notNull(),
  color: text('color'),
  parent_category_id: integer('parent_category_id'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  account_id: integer('account_id').references(() => accountsTable.id).notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  transaction_date: date('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Budgets table
export const budgetsTable = pgTable('budgets', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  period: budgetPeriodEnum('period').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Recurring transactions table
export const recurringTransactionsTable = pgTable('recurring_transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  account_id: integer('account_id').references(() => accountsTable.id).notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  frequency: recurringFrequencyEnum('frequency').notNull(),
  next_occurrence: date('next_occurrence').notNull(),
  end_date: date('end_date'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Financial goals table
export const financialGoalsTable = pgTable('financial_goals', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  target_amount: numeric('target_amount', { precision: 12, scale: 2 }).notNull(),
  current_amount: numeric('current_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  target_date: date('target_date'),
  status: goalStatusEnum('status').default('active').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  accounts: many(accountsTable),
  categories: many(categoriesTable),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable),
  recurringTransactions: many(recurringTransactionsTable),
  financialGoals: many(financialGoalsTable)
}));

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [accountsTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable),
  recurringTransactions: many(recurringTransactionsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [categoriesTable.user_id],
    references: [usersTable.id]
  }),
  parentCategory: one(categoriesTable, {
    fields: [categoriesTable.parent_category_id],
    references: [categoriesTable.id],
    relationName: 'parentCategory'
  }),
  subcategories: many(categoriesTable, {
    relationName: 'parentCategory'
  }),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable),
  recurringTransactions: many(recurringTransactionsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  account: one(accountsTable, {
    fields: [transactionsTable.account_id],
    references: [accountsTable.id]
  }),
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id]
  })
}));

export const budgetsRelations = relations(budgetsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [budgetsTable.user_id],
    references: [usersTable.id]
  }),
  category: one(categoriesTable, {
    fields: [budgetsTable.category_id],
    references: [categoriesTable.id]
  })
}));

export const recurringTransactionsRelations = relations(recurringTransactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [recurringTransactionsTable.user_id],
    references: [usersTable.id]
  }),
  account: one(accountsTable, {
    fields: [recurringTransactionsTable.account_id],
    references: [accountsTable.id]
  }),
  category: one(categoriesTable, {
    fields: [recurringTransactionsTable.category_id],
    references: [categoriesTable.id]
  })
}));

export const financialGoalsRelations = relations(financialGoalsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [financialGoalsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Account = typeof accountsTable.$inferSelect;
export type NewAccount = typeof accountsTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Budget = typeof budgetsTable.$inferSelect;
export type NewBudget = typeof budgetsTable.$inferInsert;

export type RecurringTransaction = typeof recurringTransactionsTable.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactionsTable.$inferInsert;

export type FinancialGoal = typeof financialGoalsTable.$inferSelect;
export type NewFinancialGoal = typeof financialGoalsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  accounts: accountsTable,
  categories: categoriesTable,
  transactions: transactionsTable,
  budgets: budgetsTable,
  recurringTransactions: recurringTransactionsTable,
  financialGoals: financialGoalsTable
};