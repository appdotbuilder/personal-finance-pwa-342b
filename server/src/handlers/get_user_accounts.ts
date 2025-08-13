import { db } from '../db';
import { accountsTable } from '../db/schema';
import { type Account } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserAccounts = async (userId: number): Promise<Account[]> => {
  try {
    const results = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(account => ({
      ...account,
      balance: parseFloat(account.balance) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch user accounts:', error);
    throw error;
  }
};