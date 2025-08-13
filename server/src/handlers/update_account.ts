import { db } from '../db';
import { accountsTable } from '../db/schema';
import { type UpdateAccountInput, type Account } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAccount = async (input: UpdateAccountInput): Promise<Account> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.balance !== undefined) {
      updateData.balance = input.balance.toString(); // Convert number to string for numeric column
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the account record
    const result = await db.update(accountsTable)
      .set(updateData)
      .where(eq(accountsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Account with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const account = result[0];
    return {
      ...account,
      balance: parseFloat(account.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('Account update failed:', error);
    throw error;
  }
};