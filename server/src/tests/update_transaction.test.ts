import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let accountId1: number;
  let accountId2: number;
  let categoryId: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create test accounts
    const account1 = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Checking Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();
    accountId1 = account1[0].id;

    const account2 = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Savings Account',
        type: 'savings',
        balance: '2000.00'
      })
      .returning()
      .execute();
    accountId2 = account2[0].id;

    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        type: 'expense'
      })
      .returning()
      .execute();
    categoryId = category[0].id;

    // Create test transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountId1,
        category_id: categoryId,
        amount: '50.00',
        description: 'Original transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    transactionId = transaction[0].id;
  });

  it('should update transaction amount only', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      amount: 75.50
    };

    const result = await updateTransaction(input);

    // Verify transaction fields
    expect(result.id).toEqual(transactionId);
    expect(result.amount).toEqual(75.50);
    expect(result.description).toEqual('Original transaction');
    expect(result.account_id).toEqual(accountId1);
    expect(typeof result.amount).toBe('number');

    // Verify account balance was adjusted (+25.50 difference)
    const updatedAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(updatedAccount[0].balance)).toEqual(1025.50); // 1000 + 25.50 difference
  });

  it('should update transaction description only', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      description: 'Updated description'
    };

    const result = await updateTransaction(input);

    expect(result.description).toEqual('Updated description');
    expect(result.amount).toEqual(50); // Original amount unchanged
    expect(result.account_id).toEqual(accountId1);

    // Account balance should remain unchanged
    const account = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(account[0].balance)).toEqual(1000); // Original balance
  });

  it('should update transaction account and adjust balances correctly', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      account_id: accountId2
    };

    const result = await updateTransaction(input);

    expect(result.account_id).toEqual(accountId2);
    expect(result.amount).toEqual(50); // Amount unchanged

    // Check old account balance (should have old amount removed)
    const oldAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(oldAccount[0].balance)).toEqual(950); // 1000 - 50

    // Check new account balance (should have amount added)
    const newAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId2))
      .execute();
    
    expect(parseFloat(newAccount[0].balance)).toEqual(2050); // 2000 + 50
  });

  it('should update both account and amount with correct balance adjustments', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      account_id: accountId2,
      amount: 100
    };

    const result = await updateTransaction(input);

    expect(result.account_id).toEqual(accountId2);
    expect(result.amount).toEqual(100);

    // Check old account balance (original amount removed)
    const oldAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(oldAccount[0].balance)).toEqual(950); // 1000 - 50

    // Check new account balance (new amount added)
    const newAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId2))
      .execute();
    
    expect(parseFloat(newAccount[0].balance)).toEqual(2100); // 2000 + 100
  });

  it('should update multiple fields at once', async () => {
    const newDate = new Date('2024-02-01');
    const input: UpdateTransactionInput = {
      id: transactionId,
      amount: 35.75,
      description: 'Completely updated transaction',
      transaction_date: newDate,
      category_id: categoryId
    };

    const result = await updateTransaction(input);

    expect(result.amount).toEqual(35.75);
    expect(result.description).toEqual('Completely updated transaction');
    expect(result.transaction_date).toEqual(newDate);
    expect(result.category_id).toEqual(categoryId);
    expect(result.account_id).toEqual(accountId1); // Unchanged

    // Verify balance adjustment (-14.25 difference)
    const account = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(account[0].balance)).toEqual(985.75); // 1000 - 14.25 difference
  });

  it('should update transaction in database', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      amount: 123.45,
      description: 'Database test'
    };

    await updateTransaction(input);

    // Verify transaction was updated in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toEqual(123.45);
    expect(transactions[0].description).toEqual('Database test');
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle negative amount updates correctly', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      amount: -25.00 // Negative amount (like a refund)
    };

    const result = await updateTransaction(input);

    expect(result.amount).toEqual(-25);

    // Balance adjustment: was +50, now -25, so difference is -75
    const account = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(account[0].balance)).toEqual(925); // 1000 - 75 difference
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionInput = {
      id: 99999,
      amount: 100
    };

    await expect(updateTransaction(input)).rejects.toThrow(/Transaction with id 99999 not found/i);
  });

  it('should handle zero amount difference gracefully', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      amount: 50 // Same as original
    };

    const result = await updateTransaction(input);

    expect(result.amount).toEqual(50);

    // Balance should remain unchanged
    const account = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId1))
      .execute();
    
    expect(parseFloat(account[0].balance)).toEqual(1000); // Original balance
  });

  it('should validate foreign key constraints', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      account_id: 99999 // Non-existent account
    };

    await expect(updateTransaction(input)).rejects.toThrow(/Account with id 99999 not found/i);
  });
});