import { db } from '../db';
import { financialGoalsTable } from '../db/schema';
import { type FinancialGoal } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserFinancialGoals = async (userId: number): Promise<FinancialGoal[]> => {
  try {
    // Query financial goals for the specific user
    const results = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.user_id, userId))
      .execute();

    // Convert numeric fields from strings to numbers and date fields to Date objects
    return results.map(goal => ({
      ...goal,
      target_amount: parseFloat(goal.target_amount),
      current_amount: parseFloat(goal.current_amount),
      target_date: goal.target_date ? new Date(goal.target_date) : null
    }));
  } catch (error) {
    console.error('Failed to fetch user financial goals:', error);
    throw error;
  }
};