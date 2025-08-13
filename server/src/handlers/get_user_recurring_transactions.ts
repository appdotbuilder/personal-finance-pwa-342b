import { db } from '../db';
import { recurringTransactionsTable } from '../db/schema';
import { type RecurringTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
  try {
    const results = await db.select()
      .from(recurringTransactionsTable)
      .where(eq(recurringTransactionsTable.user_id, userId))
      .execute();

    // Convert numeric and date fields back to proper types before returning
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount), // Convert string back to number
      next_occurrence: new Date(transaction.next_occurrence), // Convert string to Date
      end_date: transaction.end_date ? new Date(transaction.end_date) : null // Convert string to Date or keep null
    }));
  } catch (error) {
    console.error('Failed to get user recurring transactions:', error);
    throw error;
  }
}