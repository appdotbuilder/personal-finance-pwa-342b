import { db } from '../db';
import { transactionsTable, accountsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First, get the current transaction to calculate balance adjustments
    const currentTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (currentTransaction.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    const existing = currentTransaction[0];
    const oldAmount = parseFloat(existing.amount);
    const oldAccountId = existing.account_id;

    // Validate foreign key constraints BEFORE updating
    if (input.account_id !== undefined) {
      const accountExists = await db.select({ id: accountsTable.id })
        .from(accountsTable)
        .where(eq(accountsTable.id, input.account_id))
        .execute();
      
      if (accountExists.length === 0) {
        throw new Error(`Account with id ${input.account_id} not found`);
      }
    }

    // Prepare the update data, only including fields that were provided
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.account_id !== undefined) updateData.account_id = input.account_id;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.amount !== undefined) updateData.amount = input.amount.toString();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date.toISOString().split('T')[0];
    }

    // Update the transaction
    const updatedTransaction = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    const result = updatedTransaction[0];
    const newAmount = input.amount !== undefined ? input.amount : oldAmount;
    const newAccountId = input.account_id !== undefined ? input.account_id : oldAccountId;

    // Adjust account balances if amount or account changed
    if (input.amount !== undefined || input.account_id !== undefined) {
      // If account changed, revert old account balance and add to new account
      if (input.account_id !== undefined && input.account_id !== oldAccountId) {
        // Get old account current balance and subtract old amount
        const oldAccount = await db.select({ balance: accountsTable.balance })
          .from(accountsTable)
          .where(eq(accountsTable.id, oldAccountId))
          .execute();
        
        const oldAccountBalance = parseFloat(oldAccount[0].balance);
        await db.update(accountsTable)
          .set({
            balance: (oldAccountBalance - oldAmount).toString(),
            updated_at: new Date()
          })
          .where(eq(accountsTable.id, oldAccountId))
          .execute();

        // Get new account current balance and add new amount
        const newAccount = await db.select({ balance: accountsTable.balance })
          .from(accountsTable)
          .where(eq(accountsTable.id, newAccountId))
          .execute();
        
        const newAccountBalance = parseFloat(newAccount[0].balance);
        await db.update(accountsTable)
          .set({
            balance: (newAccountBalance + newAmount).toString(),
            updated_at: new Date()
          })
          .where(eq(accountsTable.id, newAccountId))
          .execute();
      } else {
        // Same account, just adjust for the amount difference
        const amountDifference = newAmount - oldAmount;
        if (amountDifference !== 0) {
          const account = await db.select({ balance: accountsTable.balance })
            .from(accountsTable)
            .where(eq(accountsTable.id, newAccountId))
            .execute();
          
          const currentBalance = parseFloat(account[0].balance);
          await db.update(accountsTable)
            .set({
              balance: (currentBalance + amountDifference).toString(),
              updated_at: new Date()
            })
            .where(eq(accountsTable.id, newAccountId))
            .execute();
        }
      }
    }

    // Convert numeric fields back to numbers and dates to Date objects before returning
    return {
      ...result,
      amount: parseFloat(result.amount),
      transaction_date: new Date(result.transaction_date + 'T00:00:00.000Z'),
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at)
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};