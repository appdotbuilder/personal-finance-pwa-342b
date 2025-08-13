import { db } from '../db';
import { budgetsTable, type NewBudget } from '../db/schema';
import { type CreateBudgetInput, type Budget } from '../schema';

export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  try {
    // Prepare insert values with proper types
    const insertValues: NewBudget = {
      user_id: input.user_id,
      category_id: input.category_id,
      amount: input.amount.toString(), // Convert number to string for numeric column
      period: input.period,
      start_date: input.start_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      end_date: input.end_date ? input.end_date.toISOString().split('T')[0] : null // Convert Date to string or null
    };

    // Insert budget record
    const result = await db.insert(budgetsTable)
      .values(insertValues)
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const budget = result[0];
    return {
      ...budget,
      amount: parseFloat(budget.amount), // Convert string back to number
      start_date: new Date(budget.start_date), // Convert string to Date
      end_date: budget.end_date ? new Date(budget.end_date) : null, // Convert string to Date or null
      created_at: new Date(budget.created_at), // Convert string to Date
      updated_at: new Date(budget.updated_at) // Convert string to Date
    };
  } catch (error) {
    console.error('Budget creation failed:', error);
    throw error;
  }
};