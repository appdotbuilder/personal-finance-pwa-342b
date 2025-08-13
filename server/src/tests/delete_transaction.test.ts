import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;
  let testAccountId: number;
  let testCategoryId: number;
  let testTransactionId: number;

  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create account with initial balance
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: testUserId,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00',
        description: 'Test checking account'
      })
      .returning()
      .execute();
    testAccountId = accountResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  };

  it('should delete transaction and adjust account balance correctly', async () => {
    await setupTestData();

    // Create a transaction (expense of $100)
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        account_id: testAccountId,
        category_id: testCategoryId,
        amount: '-100.00',
        description: 'Test expense transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;

    // Update account balance to reflect the transaction
    await db.update(accountsTable)
      .set({ balance: '900.00' }) // 1000 - 100 = 900
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    // Delete the transaction
    const result = await deleteTransaction(testTransactionId);
    expect(result.success).toBe(true);

    // Check that transaction is deleted
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();
    expect(transactions).toHaveLength(0);

    // Check that account balance is restored
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    expect(accounts).toHaveLength(1);
    expect(parseFloat(accounts[0].balance)).toEqual(1000.00); // Balance restored
  });

  it('should handle positive transaction (income) deletion correctly', async () => {
    await setupTestData();

    // Create an income transaction of $200
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        account_id: testAccountId,
        category_id: testCategoryId,
        amount: '200.00',
        description: 'Test income transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;

    // Update account balance to reflect the income
    await db.update(accountsTable)
      .set({ balance: '1200.00' }) // 1000 + 200 = 1200
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    // Delete the transaction
    const result = await deleteTransaction(testTransactionId);
    expect(result.success).toBe(true);

    // Check that account balance is correctly reduced
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    expect(accounts).toHaveLength(1);
    expect(parseFloat(accounts[0].balance)).toEqual(1000.00); // Balance restored to original
  });

  it('should handle decimal amounts correctly', async () => {
    await setupTestData();

    // Create a transaction with decimal amount
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        account_id: testAccountId,
        category_id: testCategoryId,
        amount: '-25.75',
        description: 'Test decimal transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;

    // Update account balance
    await db.update(accountsTable)
      .set({ balance: '974.25' }) // 1000 - 25.75 = 974.25
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    // Delete the transaction
    const result = await deleteTransaction(testTransactionId);
    expect(result.success).toBe(true);

    // Check balance precision
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    expect(parseFloat(accounts[0].balance)).toEqual(1000.00);
  });

  it('should throw error when transaction does not exist', async () => {
    await setupTestData();

    const nonExistentId = 99999;
    
    await expect(deleteTransaction(nonExistentId)).rejects.toThrow(/Transaction with id .* not found/i);
  });

  it('should maintain data integrity during deletion process', async () => {
    await setupTestData();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        account_id: testAccountId,
        category_id: testCategoryId,
        amount: '-50.00',
        description: 'Test transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;

    // Update account balance to reflect the transaction
    await db.update(accountsTable)
      .set({ balance: '950.00' }) // 1000 - 50 = 950
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    // Verify initial state
    let accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    expect(parseFloat(accounts[0].balance)).toEqual(950.00);

    let transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();
    expect(transactions).toHaveLength(1);

    // Delete transaction
    const result = await deleteTransaction(testTransactionId);
    expect(result.success).toBe(true);

    // Verify final state - transaction deleted and balance restored
    accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    expect(parseFloat(accounts[0].balance)).toEqual(1000.00);

    transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();
    expect(transactions).toHaveLength(0);
  });

  it('should update account updated_at timestamp', async () => {
    await setupTestData();

    // Get initial timestamp
    const initialAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    const initialTimestamp = initialAccount[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create and delete transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        account_id: testAccountId,
        category_id: testCategoryId,
        amount: '-30.00',
        description: 'Test transaction',
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();

    await deleteTransaction(transactionResult[0].id);

    // Check that updated_at was modified
    const updatedAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();
    
    expect(updatedAccount[0].updated_at.getTime()).toBeGreaterThan(initialTimestamp.getTime());
  });
});