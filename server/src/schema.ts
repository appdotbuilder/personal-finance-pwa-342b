import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Account schema
export const accountTypeEnum = z.enum(['checking', 'savings', 'credit_card', 'investment', 'cash', 'loan']);

export const accountSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: accountTypeEnum,
  balance: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Account = z.infer<typeof accountSchema>;

// Category schema
export const categoryTypeEnum = z.enum(['income', 'expense']);

export const categorySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: categoryTypeEnum,
  color: z.string().nullable(),
  parent_category_id: z.number().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  account_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  description: z.string(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Budget schema
export const budgetPeriodEnum = z.enum(['weekly', 'monthly', 'yearly']);

export const budgetSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  period: budgetPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Budget = z.infer<typeof budgetSchema>;

// Recurring transaction schema
export const recurringFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const recurringTransactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  account_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  description: z.string(),
  frequency: recurringFrequencyEnum,
  next_occurrence: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type RecurringTransaction = z.infer<typeof recurringTransactionSchema>;

// Financial goal schema
export const goalStatusEnum = z.enum(['active', 'completed', 'paused']);

export const financialGoalSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  target_amount: z.number(),
  current_amount: z.number(),
  target_date: z.coerce.date().nullable(),
  status: goalStatusEnum,
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type FinancialGoal = z.infer<typeof financialGoalSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createAccountInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  type: accountTypeEnum,
  balance: z.number(),
  description: z.string().nullable().optional()
});

export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

export const createCategoryInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  type: categoryTypeEnum,
  color: z.string().nullable().optional(),
  parent_category_id: z.number().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  account_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  description: z.string(),
  transaction_date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const createBudgetInputSchema = z.object({
  user_id: z.number(),
  category_id: z.number(),
  amount: z.number().positive(),
  period: budgetPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable().optional()
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const createRecurringTransactionInputSchema = z.object({
  user_id: z.number(),
  account_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  description: z.string(),
  frequency: recurringFrequencyEnum,
  next_occurrence: z.coerce.date(),
  end_date: z.coerce.date().nullable().optional()
});

export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionInputSchema>;

export const createFinancialGoalInputSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  target_amount: z.number().positive(),
  target_date: z.coerce.date().nullable().optional(),
  description: z.string().nullable().optional()
});

export type CreateFinancialGoalInput = z.infer<typeof createFinancialGoalInputSchema>;

// Update input schemas
export const updateAccountInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  balance: z.number().optional(),
  description: z.string().nullable().optional()
});

export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  account_id: z.number().optional(),
  category_id: z.number().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

export const updateBudgetInputSchema = z.object({
  id: z.number(),
  amount: z.number().positive().optional(),
  period: budgetPeriodEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().nullable().optional()
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetInputSchema>;

export const updateFinancialGoalInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().nonnegative().optional(),
  target_date: z.coerce.date().nullable().optional(),
  status: goalStatusEnum.optional(),
  description: z.string().nullable().optional()
});

export type UpdateFinancialGoalInput = z.infer<typeof updateFinancialGoalInputSchema>;

// Query input schemas
export const getUserTransactionsInputSchema = z.object({
  user_id: z.number(),
  account_id: z.number().optional(),
  category_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserTransactionsInput = z.infer<typeof getUserTransactionsInputSchema>;

export const getUserBudgetStatusInputSchema = z.object({
  user_id: z.number(),
  period: budgetPeriodEnum.optional(),
  category_id: z.number().optional()
});

export type GetUserBudgetStatusInput = z.infer<typeof getUserBudgetStatusInputSchema>;

export const getFinancialSummaryInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetFinancialSummaryInput = z.infer<typeof getFinancialSummaryInputSchema>;

// Response schemas for complex queries
export const budgetStatusSchema = z.object({
  budget: budgetSchema,
  spent_amount: z.number(),
  remaining_amount: z.number(),
  percentage_used: z.number()
});

export type BudgetStatus = z.infer<typeof budgetStatusSchema>;

export const financialSummarySchema = z.object({
  total_income: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  account_balances: z.record(z.string(), z.number()),
  budget_status: z.array(budgetStatusSchema),
  goal_progress: z.array(financialGoalSchema)
});

export type FinancialSummary = z.infer<typeof financialSummarySchema>;