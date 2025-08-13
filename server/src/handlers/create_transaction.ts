import { db } from '../db';
import { transactionsTable, accountsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Start a transaction to ensure data consistency
    const result = await db.transaction(async (tx) => {
      // First, verify the account exists and get current balance
      const account = await tx.select()
        .from(accountsTable)
        .where(eq(accountsTable.id, input.account_id))
        .execute();
      
      if (account.length === 0) {
        throw new Error(`Account with id ${input.account_id} not found`);
      }

      // Insert the transaction record
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          user_id: input.user_id,
          account_id: input.account_id,
          category_id: input.category_id,
          amount: input.amount.toString(), // Convert number to string for numeric column
          description: input.description,
          transaction_date: input.transaction_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
        })
        .returning()
        .execute();

      // Update the account balance
      const currentBalance = parseFloat(account[0].balance);
      const newBalance = currentBalance + input.amount;

      await tx.update(accountsTable)
        .set({ 
          balance: newBalance.toString(), // Convert number to string for numeric column
          updated_at: new Date()
        })
        .where(eq(accountsTable.id, input.account_id))
        .execute();

      return transactionResult[0];
    });

    // Convert fields back to proper types before returning
    return {
      ...result,
      amount: parseFloat(result.amount),
      transaction_date: new Date(result.transaction_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};