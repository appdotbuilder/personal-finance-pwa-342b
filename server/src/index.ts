import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createProfileInputSchema,
  updateProfileInputSchema,
  createAccountInputSchema,
  updateAccountInputSchema,
  createCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  getTransactionsInputSchema,
  createBudgetInputSchema,
  getBudgetsInputSchema,
  createRecurringRuleInputSchema,
  createGoalInputSchema,
  updateGoalInputSchema
} from './schema';

// Import handlers
import { createProfile } from './handlers/create_profile';
import { getProfile } from './handlers/get_profile';
import { updateProfile } from './handlers/update_profile';
import { createAccount } from './handlers/create_account';
import { getAccounts } from './handlers/get_accounts';
import { updateAccount } from './handlers/update_account';
import { deleteAccount } from './handlers/delete_account';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { createBudget } from './handlers/create_budget';
import { getBudgets } from './handlers/get_budgets';
import { createRecurringRule } from './handlers/create_recurring_rule';
import { getRecurringRules } from './handlers/get_recurring_rules';
import { createGoal } from './handlers/create_goal';
import { getGoals } from './handlers/get_goals';
import { updateGoal } from './handlers/update_goal';
import { getFinancialSummary } from './handlers/get_financial_summary';
import { importTransactions, type ImportTransactionRow } from './handlers/import_transactions';
import { exportTransactions, type ExportOptions } from './handlers/export_transactions';
import { processRecurringTransactions } from './handlers/process_recurring_transactions';
import { generateAIInsights } from './handlers/generate_ai_insights';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Mock user context - in real implementation, this would come from JWT/session
const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Profile routes
  createProfile: publicProcedure
    .input(createProfileInputSchema)
    .mutation(({ input }) => createProfile(input)),
  
  getProfile: publicProcedure
    .input(z.string().uuid())
    .query(({ input }) => getProfile(input)),
  
  updateProfile: publicProcedure
    .input(updateProfileInputSchema)
    .mutation(({ input }) => updateProfile(input)),

  // Account routes
  createAccount: publicProcedure
    .input(createAccountInputSchema)
    .mutation(({ input }) => createAccount(input, mockUserId)),
  
  getAccounts: publicProcedure
    .query(() => getAccounts(mockUserId)),
  
  updateAccount: publicProcedure
    .input(updateAccountInputSchema)
    .mutation(({ input }) => updateAccount(input, mockUserId)),
  
  deleteAccount: publicProcedure
    .input(z.string().uuid())
    .mutation(({ input }) => deleteAccount(input, mockUserId)),

  // Category routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input, mockUserId)),
  
  getCategories: publicProcedure
    .query(() => getCategories(mockUserId)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input, mockUserId)),
  
  getTransactions: publicProcedure
    .input(getTransactionsInputSchema)
    .query(({ input }) => getTransactions(input, mockUserId)),
  
  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input, mockUserId)),
  
  deleteTransaction: publicProcedure
    .input(z.string().uuid())
    .mutation(({ input }) => deleteTransaction(input, mockUserId)),

  // Budget routes
  createBudget: publicProcedure
    .input(createBudgetInputSchema)
    .mutation(({ input }) => createBudget(input, mockUserId)),
  
  getBudgets: publicProcedure
    .input(getBudgetsInputSchema)
    .query(({ input }) => getBudgets(input, mockUserId)),

  // Recurring rule routes
  createRecurringRule: publicProcedure
    .input(createRecurringRuleInputSchema)
    .mutation(({ input }) => createRecurringRule(input, mockUserId)),
  
  getRecurringRules: publicProcedure
    .query(() => getRecurringRules(mockUserId)),

  // Goal routes
  createGoal: publicProcedure
    .input(createGoalInputSchema)
    .mutation(({ input }) => createGoal(input, mockUserId)),
  
  getGoals: publicProcedure
    .query(() => getGoals(mockUserId)),
  
  updateGoal: publicProcedure
    .input(updateGoalInputSchema)
    .mutation(({ input }) => updateGoal(input, mockUserId)),

  // Dashboard and reporting routes
  getFinancialSummary: publicProcedure
    .input(z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date()
    }))
    .query(({ input }) => getFinancialSummary(mockUserId, input.startDate, input.endDate)),

  // Import/Export routes
  importTransactions: publicProcedure
    .input(z.array(z.object({
      date: z.string(),
      amount: z.number(),
      description: z.string(),
      category: z.string().optional(),
      account: z.string(),
      type: z.enum(['income', 'expense']),
      notes: z.string().optional()
    })))
    .mutation(({ input }) => importTransactions(input, mockUserId)),
  
  exportTransactions: publicProcedure
    .input(z.object({
      format: z.enum(['csv', 'excel']),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      accountIds: z.array(z.string().uuid()).optional(),
      categoryIds: z.array(z.string().uuid()).optional()
    }))
    .query(({ input }) => exportTransactions(input, mockUserId)),

  // Background processing routes
  processRecurringTransactions: publicProcedure
    .input(z.string().uuid().optional())
    .mutation(({ input }) => processRecurringTransactions(input)),

  // AI insights route
  generateAIInsights: publicProcedure
    .query(() => generateAIInsights(mockUserId))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow common dev ports
        credentials: true
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance PWA TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- Profile management (create, get, update)');
  console.log('- Account/wallet management (CRUD)');
  console.log('- Category management');
  console.log('- Transaction management (CRUD with filtering)');
  console.log('- Budget tracking');
  console.log('- Recurring transactions');
  console.log('- Savings goals');
  console.log('- Financial dashboard and reporting');
  console.log('- Data import/export');
  console.log('- AI insights generation');
}

start();