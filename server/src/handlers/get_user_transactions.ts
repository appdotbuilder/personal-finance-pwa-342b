import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, type Transaction } from '../schema';
import { eq, and, gte, lte, desc, type SQL } from 'drizzle-orm';

export async function getUserTransactions(input: GetUserTransactionsInput): Promise<Transaction[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(transactionsTable.user_id, input.user_id)];

    // Apply optional filters
    if (input.account_id !== undefined) {
      conditions.push(eq(transactionsTable.account_id, input.account_id));
    }

    if (input.category_id !== undefined) {
      conditions.push(eq(transactionsTable.category_id, input.category_id));
    }

    if (input.start_date !== undefined) {
      conditions.push(gte(transactionsTable.transaction_date, input.start_date.toISOString().split('T')[0]));
    }

    if (input.end_date !== undefined) {
      conditions.push(lte(transactionsTable.transaction_date, input.end_date.toISOString().split('T')[0]));
    }

    // Start building the query
    let queryBuilder = db.select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date));

    // Build the final query with all pagination parameters
    const finalQuery = (() => {
      if (input.limit !== undefined && input.offset !== undefined) {
        return queryBuilder.limit(input.limit).offset(input.offset);
      } else if (input.limit !== undefined) {
        return queryBuilder.limit(input.limit);
      } else if (input.offset !== undefined) {
        return queryBuilder.offset(input.offset);
      } else {
        return queryBuilder;
      }
    })();

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers and date strings to Date objects
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount),
      transaction_date: new Date(transaction.transaction_date)
    }));
  } catch (error) {
    console.error('Failed to get user transactions:', error);
    throw error;
  }
}