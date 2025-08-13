import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type UpdateBudgetInput, type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const updateBudget = async (input: UpdateBudgetInput): Promise<Budget> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString();
    }
    
    if (input.period !== undefined) {
      updateData.period = input.period;
    }
    
    if (input.start_date !== undefined) {
      updateData.start_date = input.start_date.toISOString().split('T')[0];
    }
    
    if (input.end_date !== undefined) {
      updateData.end_date = input.end_date ? input.end_date.toISOString().split('T')[0] : null;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update budget record
    const result = await db.update(budgetsTable)
      .set(updateData)
      .where(eq(budgetsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Budget with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers and dates back to Date objects
    const budget = result[0];
    return {
      ...budget,
      amount: parseFloat(budget.amount),
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null
    };
  } catch (error) {
    console.error('Budget update failed:', error);
    throw error;
  }
};