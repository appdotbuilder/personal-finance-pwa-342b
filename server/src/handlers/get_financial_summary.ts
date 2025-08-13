import { db } from '../db';
import { 
  transactionsTable, 
  accountsTable, 
  categoriesTable, 
  budgetsTable, 
  financialGoalsTable 
} from '../db/schema';
import { type GetFinancialSummaryInput, type FinancialSummary, type BudgetStatus } from '../schema';
import { eq, and, gte, lte, sum, SQL } from 'drizzle-orm';

export async function getFinancialSummary(input: GetFinancialSummaryInput): Promise<FinancialSummary> {
  try {
    const { user_id, start_date, end_date } = input;

    // Build date conditions for filtering transactions
    const dateConditions: SQL<unknown>[] = [eq(transactionsTable.user_id, user_id)];
    
    if (start_date) {
      dateConditions.push(gte(transactionsTable.transaction_date, start_date.toISOString().split('T')[0]));
    }
    
    if (end_date) {
      dateConditions.push(lte(transactionsTable.transaction_date, end_date.toISOString().split('T')[0]));
    }

    // Get income and expense totals
    const transactionSummaryQuery = db
      .select({
        category_type: categoriesTable.type,
        total_amount: sum(transactionsTable.amount)
      })
      .from(transactionsTable)
      .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
      .where(and(...dateConditions))
      .groupBy(categoriesTable.type);

    const transactionSummary = await transactionSummaryQuery.execute();

    let total_income = 0;
    let total_expenses = 0;

    transactionSummary.forEach(row => {
      const amount = parseFloat(row.total_amount || '0');
      if (row.category_type === 'income') {
        total_income += amount;
      } else if (row.category_type === 'expense') {
        total_expenses += amount;
      }
    });

    const net_income = total_income - total_expenses;

    // Get account balances
    const accountsQuery = db
      .select({
        name: accountsTable.name,
        balance: accountsTable.balance
      })
      .from(accountsTable)
      .where(eq(accountsTable.user_id, user_id));

    const accounts = await accountsQuery.execute();
    
    const account_balances: Record<string, number> = {};
    accounts.forEach(account => {
      account_balances[account.name] = parseFloat(account.balance);
    });

    // Get budget status
    let budgetQuery = db
      .select({
        budget_id: budgetsTable.id,
        category_id: budgetsTable.category_id,
        budget_amount: budgetsTable.amount,
        period: budgetsTable.period,
        start_date: budgetsTable.start_date,
        end_date: budgetsTable.end_date,
        created_at: budgetsTable.created_at,
        updated_at: budgetsTable.updated_at
      })
      .from(budgetsTable)
      .where(eq(budgetsTable.user_id, user_id));

    const budgets = await budgetQuery.execute();

    const budget_status: BudgetStatus[] = [];

    for (const budget of budgets) {
      // Calculate spent amount for this budget's category within the budget period
      const spentConditions: SQL<unknown>[] = [
        eq(transactionsTable.user_id, user_id),
        eq(transactionsTable.category_id, budget.category_id),
        eq(categoriesTable.type, 'expense')
      ];

      // Use budget's own date range for calculating spent amount
      spentConditions.push(gte(transactionsTable.transaction_date, budget.start_date));
      if (budget.end_date) {
        spentConditions.push(lte(transactionsTable.transaction_date, budget.end_date));
      }

      const spentQuery = db
        .select({
          spent_amount: sum(transactionsTable.amount)
        })
        .from(transactionsTable)
        .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
        .where(and(...spentConditions));

      const spentResult = await spentQuery.execute();
      const spent_amount = parseFloat(spentResult[0]?.spent_amount || '0');
      const budget_amount = parseFloat(budget.budget_amount);
      const remaining_amount = budget_amount - spent_amount;
      const percentage_used = budget_amount > 0 ? (spent_amount / budget_amount) * 100 : 0;

      budget_status.push({
        budget: {
          id: budget.budget_id,
          user_id,
          category_id: budget.category_id,
          amount: budget_amount,
          period: budget.period,
          start_date: new Date(budget.start_date),
          end_date: budget.end_date ? new Date(budget.end_date) : null,
          created_at: budget.created_at,
          updated_at: budget.updated_at
        },
        spent_amount,
        remaining_amount,
        percentage_used
      });
    }

    // Get financial goals progress
    const goalsQuery = db
      .select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.user_id, user_id));

    const goal_progress = await goalsQuery.execute();

    // Convert numeric and date fields for goals
    const convertedGoals = goal_progress.map(goal => ({
      ...goal,
      target_amount: parseFloat(goal.target_amount),
      current_amount: parseFloat(goal.current_amount),
      target_date: goal.target_date ? new Date(goal.target_date) : null
    }));

    return {
      total_income,
      total_expenses,
      net_income,
      account_balances,
      budget_status,
      goal_progress: convertedGoals
    };

  } catch (error) {
    console.error('Financial summary retrieval failed:', error);
    throw error;
  }
}