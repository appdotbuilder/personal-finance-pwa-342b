import { db } from '../db';
import { transactionsTable, accountsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteTransaction(transactionId: number): Promise<{ success: boolean }> {
  try {
    // First, get the transaction details to reverse the account balance
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    if (transactions.length === 0) {
      throw new Error(`Transaction with id ${transactionId} not found`);
    }

    const transaction = transactions[0];
    const transactionAmount = parseFloat(transaction.amount);

    // Get current account balance
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, transaction.account_id))
      .execute();

    if (accounts.length === 0) {
      throw new Error(`Account with id ${transaction.account_id} not found`);
    }

    const account = accounts[0];
    const currentBalance = parseFloat(account.balance);

    // Calculate new balance by reversing the transaction
    // If the transaction was positive (income), subtract it from balance
    // If the transaction was negative (expense), add it back to balance
    const newBalance = currentBalance - transactionAmount;

    // Update account balance and delete transaction in a transaction block
    await db.transaction(async (tx) => {
      // Update account balance
      await tx.update(accountsTable)
        .set({ 
          balance: newBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(accountsTable.id, transaction.account_id))
        .execute();

      // Delete the transaction
      await tx.delete(transactionsTable)
        .where(eq(transactionsTable.id, transactionId))
        .execute();
    });

    return { success: true };
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}