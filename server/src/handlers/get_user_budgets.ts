import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserBudgets = async (userId: number): Promise<Budget[]> => {
  try {
    const result = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.user_id, userId))
      .execute();

    // Convert numeric fields to numbers and date fields to Date objects
    return result.map(budget => ({
      ...budget,
      amount: parseFloat(budget.amount),
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null
    }));
  } catch (error) {
    console.error('Failed to get user budgets:', error);
    throw error;
  }
};