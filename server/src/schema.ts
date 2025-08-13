import { z } from 'zod';

// Enum schemas
export const accountTypeSchema = z.enum(['cash', 'bank', 'credit_card', 'investment', 'loan']);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const categoryTypeSchema = z.enum(['income', 'expense']);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const frequencySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type Frequency = z.infer<typeof frequencySchema>;

export const goalStatusSchema = z.enum(['active', 'completed', 'paused']);
export type GoalStatus = z.infer<typeof goalStatusSchema>;

// Profile schema
export const profileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  currency: z.string().default('IDR'),
  locale: z.string().default('id-ID'),
  timezone: z.string().default('Asia/Jakarta'),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Profile = z.infer<typeof profileSchema>;

// Account schema
export const accountSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  type: accountTypeSchema,
  balance: z.number(),
  currency: z.string().default('IDR'),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type Account = z.infer<typeof accountSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  type: categoryTypeSchema,
  color: z.string().nullable(),
  icon: z.string().nullable(),
  parent_id: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type Category = z.infer<typeof categorySchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: transactionTypeSchema,
  amount: z.number(),
  description: z.string(),
  notes: z.string().nullable(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  receipt_url: z.string().nullable(),
  location: z.string().nullable(),
  recurring_rule_id: z.string().uuid().nullable(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Budget schema
export const budgetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  spent_amount: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type Budget = z.infer<typeof budgetSchema>;

// Recurring rule schema
export const recurringRuleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  type: transactionTypeSchema,
  amount: z.number(),
  description: z.string(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  frequency: frequencySchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  next_due_date: z.coerce.date(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type RecurringRule = z.infer<typeof recurringRuleSchema>;

// Goal schema
export const goalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  target_amount: z.number(),
  current_amount: z.number().default(0),
  target_date: z.coerce.date().nullable(),
  status: goalStatusSchema.default('active'),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable()
});

export type Goal = z.infer<typeof goalSchema>;

// Audit log schema
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  table_name: z.string(),
  record_id: z.string().uuid(),
  action: z.enum(['insert', 'update', 'delete']),
  old_values: z.record(z.any()).nullable(),
  new_values: z.record(z.any()).nullable(),
  created_at: z.coerce.date()
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Input schemas for creating entities
export const createProfileInputSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional()
});

export type CreateProfileInput = z.infer<typeof createProfileInputSchema>;

export const createAccountInputSchema = z.object({
  name: z.string(),
  type: accountTypeSchema,
  balance: z.number(),
  currency: z.string().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional()
});

export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  type: categoryTypeSchema,
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createTransactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive(),
  description: z.string(),
  notes: z.string().nullable().optional(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  receipt_url: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  recurring_rule_id: z.string().uuid().nullable().optional(),
  transaction_date: z.coerce.date().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const createBudgetInputSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const createRecurringRuleInputSchema = z.object({
  name: z.string(),
  type: transactionTypeSchema,
  amount: z.number().positive(),
  description: z.string(),
  account_id: z.string().uuid(),
  to_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  frequency: frequencySchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable().optional()
});

export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleInputSchema>;

export const createGoalInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  target_amount: z.number().positive(),
  target_date: z.coerce.date().nullable().optional()
});

export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

// Update schemas
export const updateProfileInputSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const updateAccountInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  type: accountTypeSchema.optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.string().uuid(),
  type: transactionTypeSchema.optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  notes: z.string().nullable().optional(),
  account_id: z.string().uuid().optional(),
  to_account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  receipt_url: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

export const updateGoalInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().nonnegative().optional(),
  target_date: z.coerce.date().nullable().optional(),
  status: goalStatusSchema.optional()
});

export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

// Query parameter schemas
export const getTransactionsInputSchema = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  type: transactionTypeSchema.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const getBudgetsInputSchema = z.object({
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export type GetBudgetsInput = z.infer<typeof getBudgetsInputSchema>;

// Dashboard/report schemas
export const financialSummarySchema = z.object({
  total_income: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  total_accounts: z.number().int(),
  active_budgets: z.number().int(),
  active_goals: z.number().int(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type FinancialSummary = z.infer<typeof financialSummarySchema>;