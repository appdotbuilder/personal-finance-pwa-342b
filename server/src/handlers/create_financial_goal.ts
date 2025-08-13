import { db } from '../db';
import { financialGoalsTable, usersTable } from '../db/schema';
import { type CreateFinancialGoalInput, type FinancialGoal } from '../schema';
import { eq } from 'drizzle-orm';

export const createFinancialGoal = async (input: CreateFinancialGoalInput): Promise<FinancialGoal> => {
  try {
    // Verify user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert financial goal record
    const result = await db.insert(financialGoalsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        target_amount: input.target_amount.toString(), // Convert number to string for numeric column
        target_date: input.target_date ? input.target_date.toISOString().split('T')[0] : null, // Convert Date to YYYY-MM-DD string
        description: input.description
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const financialGoal = result[0];
    return {
      ...financialGoal,
      target_amount: parseFloat(financialGoal.target_amount), // Convert string back to number
      current_amount: parseFloat(financialGoal.current_amount), // Convert string back to number
      target_date: financialGoal.target_date ? new Date(financialGoal.target_date) : null // Convert string back to Date
    };
  } catch (error) {
    console.error('Financial goal creation failed:', error);
    throw error;
  }
};