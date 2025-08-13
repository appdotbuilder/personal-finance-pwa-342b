import { db } from '../db';
import { recurringTransactionsTable, type NewRecurringTransaction } from '../db/schema';
import { type CreateRecurringTransactionInput, type RecurringTransaction } from '../schema';

export const createRecurringTransaction = async (input: CreateRecurringTransactionInput): Promise<RecurringTransaction> => {
  try {
    // Insert recurring transaction record
    const insertData: NewRecurringTransaction = {
      user_id: input.user_id,
      account_id: input.account_id,
      category_id: input.category_id,
      amount: input.amount.toString(), // Convert number to string for numeric column
      description: input.description,
      frequency: input.frequency,
      next_occurrence: input.next_occurrence.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      end_date: input.end_date ? input.end_date.toISOString().split('T')[0] : null // Convert Date to YYYY-MM-DD string or null
      // is_active defaults to true in schema
    };

    const result = await db.insert(recurringTransactionsTable)
      .values(insertData)
      .returning();

    // Convert numeric and date fields back to proper types before returning
    const recurringTransaction = result[0];
    return {
      ...recurringTransaction,
      amount: parseFloat(recurringTransaction.amount), // Convert string back to number
      next_occurrence: new Date(recurringTransaction.next_occurrence), // Convert string to Date
      end_date: recurringTransaction.end_date ? new Date(recurringTransaction.end_date) : null // Convert string to Date or keep null
    };
  } catch (error) {
    console.error('Recurring transaction creation failed:', error);
    throw error;
  }
};