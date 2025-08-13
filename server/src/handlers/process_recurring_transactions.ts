import { db } from '../db';
import { recurringTransactionsTable, transactionsTable } from '../db/schema';
import { eq, lte, and } from 'drizzle-orm';
import type { RecurringTransaction } from '../schema';

export async function processRecurringTransactions(): Promise<{ processed: number }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    const todayString = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Find all active recurring transactions due for processing
    const dueTransactions = await db.select()
      .from(recurringTransactionsTable)
      .where(
        and(
          eq(recurringTransactionsTable.is_active, true),
          lte(recurringTransactionsTable.next_occurrence, todayString)
        )
      )
      .execute();

    let processed = 0;

    for (const recurringTransaction of dueTransactions) {
      // Create actual transaction
      await db.insert(transactionsTable)
        .values({
          user_id: recurringTransaction.user_id,
          account_id: recurringTransaction.account_id,
          category_id: recurringTransaction.category_id,
          amount: recurringTransaction.amount,
          description: recurringTransaction.description,
          transaction_date: recurringTransaction.next_occurrence
        })
        .execute();

      // Calculate next occurrence date
      const nextOccurrenceDate = calculateNextOccurrence(
        new Date(recurringTransaction.next_occurrence),
        recurringTransaction.frequency
      );
      const nextOccurrenceString = nextOccurrenceDate.toISOString().split('T')[0];

      // Check if we should deactivate (if end_date has passed)
      const shouldDeactivate = recurringTransaction.end_date && 
        nextOccurrenceDate > new Date(recurringTransaction.end_date);

      // Update the recurring transaction
      await db.update(recurringTransactionsTable)
        .set({
          next_occurrence: nextOccurrenceString,
          is_active: shouldDeactivate ? false : true,
          updated_at: new Date()
        })
        .where(eq(recurringTransactionsTable.id, recurringTransaction.id))
        .execute();

      processed++;
    }

    return { processed };
  } catch (error) {
    console.error('Processing recurring transactions failed:', error);
    throw error;
  }
}

function calculateNextOccurrence(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
  
  return nextDate;
}