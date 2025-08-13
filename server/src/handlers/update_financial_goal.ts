import { db } from '../db';
import { financialGoalsTable } from '../db/schema';
import { type UpdateFinancialGoalInput, type FinancialGoal } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFinancialGoal = async (input: UpdateFinancialGoalInput): Promise<FinancialGoal> => {
  try {
    // Build update object only with provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.target_amount !== undefined) {
      updateData.target_amount = input.target_amount.toString(); // Convert number to string for numeric column
    }
    
    if (input.current_amount !== undefined) {
      updateData.current_amount = input.current_amount.toString(); // Convert number to string for numeric column
    }
    
    if (input.target_date !== undefined) {
      updateData.target_date = input.target_date;
    }
    
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the financial goal
    const result = await db.update(financialGoalsTable)
      .set(updateData)
      .where(eq(financialGoalsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Financial goal with id ${input.id} not found`);
    }

    // Convert numeric and date fields back to proper types before returning
    const financialGoal = result[0];
    return {
      ...financialGoal,
      target_amount: parseFloat(financialGoal.target_amount), // Convert string back to number
      current_amount: parseFloat(financialGoal.current_amount), // Convert string back to number
      target_date: financialGoal.target_date ? new Date(financialGoal.target_date) : null // Convert string back to Date
    };
  } catch (error) {
    console.error('Financial goal update failed:', error);
    throw error;
  }
};