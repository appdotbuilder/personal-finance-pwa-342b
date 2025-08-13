import { db } from '../db';
import { budgetsTable, transactionsTable, categoriesTable } from '../db/schema';
import { type GetUserBudgetStatusInput, type BudgetStatus } from '../schema';
import { eq, and, gte, lte, sum, SQL } from 'drizzle-orm';

export async function getBudgetStatus(input: GetUserBudgetStatusInput): Promise<BudgetStatus[]> {
  try {
    // Build conditions for budget query
    const budgetConditions: SQL<unknown>[] = [eq(budgetsTable.user_id, input.user_id)];
    
    if (input.period) {
      budgetConditions.push(eq(budgetsTable.period, input.period));
    }
    
    if (input.category_id) {
      budgetConditions.push(eq(budgetsTable.category_id, input.category_id));
    }

    // Query budgets
    const budgets = await db.select()
      .from(budgetsTable)
      .where(budgetConditions.length === 1 ? budgetConditions[0] : and(...budgetConditions))
      .execute();

    // Build budget status results
    const budgetStatusResults: BudgetStatus[] = [];

    for (const budget of budgets) {
      // Build conditions for transaction aggregation
      const transactionConditions: SQL<unknown>[] = [
        eq(transactionsTable.user_id, input.user_id),
        eq(transactionsTable.category_id, budget.category_id)
      ];

      // Add date range conditions based on budget period
      transactionConditions.push(gte(transactionsTable.transaction_date, budget.start_date));
      
      if (budget.end_date) {
        transactionConditions.push(lte(transactionsTable.transaction_date, budget.end_date));
      }

      // Query spent amount for this budget
      const spentResult = await db.select({
        total: sum(transactionsTable.amount)
      })
        .from(transactionsTable)
        .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
        .where(
          and(
            ...transactionConditions,
            eq(categoriesTable.type, 'expense') // Only count expense transactions
          )
        )
        .execute();

      const spentAmount = spentResult[0]?.total ? parseFloat(spentResult[0].total) : 0;
      const budgetAmount = parseFloat(budget.amount);
      const remainingAmount = budgetAmount - spentAmount;
      const percentageUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      budgetStatusResults.push({
        budget: {
          ...budget,
          amount: budgetAmount,
          start_date: new Date(budget.start_date),
          end_date: budget.end_date ? new Date(budget.end_date) : null
        },
        spent_amount: spentAmount,
        remaining_amount: remainingAmount,
        percentage_used: Math.min(percentageUsed, 100) // Cap at 100%
      });
    }

    return budgetStatusResults;
  } catch (error) {
    console.error('Budget status retrieval failed:', error);
    throw error;
  }
}