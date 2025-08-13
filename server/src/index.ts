import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createAccountInputSchema,
  updateAccountInputSchema,
  createCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  getUserTransactionsInputSchema,
  createBudgetInputSchema,
  updateBudgetInputSchema,
  getUserBudgetStatusInputSchema,
  createRecurringTransactionInputSchema,
  createFinancialGoalInputSchema,
  updateFinancialGoalInputSchema,
  getFinancialSummaryInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createAccount } from './handlers/create_account';
import { getUserAccounts } from './handlers/get_user_accounts';
import { updateAccount } from './handlers/update_account';
import { createCategory } from './handlers/create_category';
import { getUserCategories } from './handlers/get_user_categories';
import { createTransaction } from './handlers/create_transaction';
import { getUserTransactions } from './handlers/get_user_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { createBudget } from './handlers/create_budget';
import { getUserBudgets } from './handlers/get_user_budgets';
import { getBudgetStatus } from './handlers/get_budget_status';
import { updateBudget } from './handlers/update_budget';
import { createRecurringTransaction } from './handlers/create_recurring_transaction';
import { getUserRecurringTransactions } from './handlers/get_user_recurring_transactions';
import { processRecurringTransactions } from './handlers/process_recurring_transactions';
import { createFinancialGoal } from './handlers/create_financial_goal';
import { getUserFinancialGoals } from './handlers/get_user_financial_goals';
import { updateFinancialGoal } from './handlers/update_financial_goal';
import { getFinancialSummary } from './handlers/get_financial_summary';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Account management
  createAccount: publicProcedure
    .input(createAccountInputSchema)
    .mutation(({ input }) => createAccount(input)),

  getUserAccounts: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAccounts(input.userId)),

  updateAccount: publicProcedure
    .input(updateAccountInputSchema)
    .mutation(({ input }) => updateAccount(input)),

  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getUserCategories: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserCategories(input.userId)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getUserTransactions: publicProcedure
    .input(getUserTransactionsInputSchema)
    .query(({ input }) => getUserTransactions(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .mutation(({ input }) => deleteTransaction(input.transactionId)),

  // Budget management
  createBudget: publicProcedure
    .input(createBudgetInputSchema)
    .mutation(({ input }) => createBudget(input)),

  getUserBudgets: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserBudgets(input.userId)),

  getBudgetStatus: publicProcedure
    .input(getUserBudgetStatusInputSchema)
    .query(({ input }) => getBudgetStatus(input)),

  updateBudget: publicProcedure
    .input(updateBudgetInputSchema)
    .mutation(({ input }) => updateBudget(input)),

  // Recurring transactions
  createRecurringTransaction: publicProcedure
    .input(createRecurringTransactionInputSchema)
    .mutation(({ input }) => createRecurringTransaction(input)),

  getUserRecurringTransactions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserRecurringTransactions(input.userId)),

  processRecurringTransactions: publicProcedure
    .mutation(() => processRecurringTransactions()),

  // Financial goals
  createFinancialGoal: publicProcedure
    .input(createFinancialGoalInputSchema)
    .mutation(({ input }) => createFinancialGoal(input)),

  getUserFinancialGoals: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserFinancialGoals(input.userId)),

  updateFinancialGoal: publicProcedure
    .input(updateFinancialGoalInputSchema)
    .mutation(({ input }) => updateFinancialGoal(input)),

  // Financial summary and reporting
  getFinancialSummary: publicProcedure
    .input(getFinancialSummaryInputSchema)
    .query(({ input }) => getFinancialSummary(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Management TRPC server listening at port: ${port}`);
}

start();