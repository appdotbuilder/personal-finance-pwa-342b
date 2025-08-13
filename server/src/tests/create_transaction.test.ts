import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAccountId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test account with initial balance
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: testUserId,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00', // Initial balance of $1000
        description: 'Test checking account'
      })
      .returning()
      .execute();
    testAccountId = accountResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  it('should create a transaction and update account balance', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -50.00, // Expense transaction
      description: 'Test expense transaction',
      transaction_date: new Date('2024-01-15')
    };

    const result = await createTransaction(testInput);

    // Verify transaction fields
    expect(result.user_id).toBe(testUserId);
    expect(result.account_id).toBe(testAccountId);
    expect(result.category_id).toBe(testCategoryId);
    expect(result.amount).toBe(-50.00);
    expect(result.description).toBe('Test expense transaction');
    expect(result.transaction_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric type conversion
    expect(typeof result.amount).toBe('number');
  });

  it('should save transaction to database', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: 100.50,
      description: 'Test income transaction',
      transaction_date: new Date('2024-01-20')
    };

    const result = await createTransaction(testInput);

    // Query the transaction from database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toBe(testUserId);
    expect(transactions[0].account_id).toBe(testAccountId);
    expect(transactions[0].category_id).toBe(testCategoryId);
    expect(parseFloat(transactions[0].amount)).toBe(100.50);
    expect(transactions[0].description).toBe('Test income transaction');
    expect(new Date(transactions[0].transaction_date)).toEqual(new Date('2024-01-20'));
  });

  it('should update account balance correctly for expense transaction', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -250.75, // Expense
      description: 'Large expense',
      transaction_date: new Date('2024-01-25')
    };

    await createTransaction(testInput);

    // Check updated account balance
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    expect(accounts).toHaveLength(1);
    expect(parseFloat(accounts[0].balance)).toBe(749.25); // 1000.00 - 250.75
    expect(accounts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update account balance correctly for income transaction', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: 500.25, // Income
      description: 'Salary deposit',
      transaction_date: new Date('2024-02-01')
    };

    await createTransaction(testInput);

    // Check updated account balance
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    expect(accounts).toHaveLength(1);
    expect(parseFloat(accounts[0].balance)).toBe(1500.25); // 1000.00 + 500.25
  });

  it('should handle multiple transactions correctly', async () => {
    const transaction1: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -100.00,
      description: 'First expense',
      transaction_date: new Date('2024-01-10')
    };

    const transaction2: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: 200.00,
      description: 'Income',
      transaction_date: new Date('2024-01-15')
    };

    const transaction3: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -50.00,
      description: 'Second expense',
      transaction_date: new Date('2024-01-20')
    };

    await createTransaction(transaction1);
    await createTransaction(transaction2);
    await createTransaction(transaction3);

    // Final balance should be: 1000 - 100 + 200 - 50 = 1050
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    expect(parseFloat(accounts[0].balance)).toBe(1050.00);
  });

  it('should handle decimal amounts correctly', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -33.33,
      description: 'Decimal amount test',
      transaction_date: new Date('2024-02-05')
    };

    const result = await createTransaction(testInput);

    expect(result.amount).toBe(-33.33);

    // Check account balance precision
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    expect(parseFloat(accounts[0].balance)).toBe(966.67); // 1000.00 - 33.33
  });

  it('should throw error for non-existent account', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: 99999, // Non-existent account ID
      category_id: testCategoryId,
      amount: -50.00,
      description: 'Should fail',
      transaction_date: new Date('2024-01-15')
    };

    await expect(createTransaction(testInput)).rejects.toThrow(/Account with id 99999 not found/i);
  });

  it('should handle zero amount transactions', async () => {
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: 0.00,
      description: 'Zero amount transaction',
      transaction_date: new Date('2024-01-30')
    };

    const result = await createTransaction(testInput);

    expect(result.amount).toBe(0.00);

    // Account balance should remain unchanged
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, testAccountId))
      .execute();

    expect(parseFloat(accounts[0].balance)).toBe(1000.00);
  });

  it('should preserve transaction date correctly', async () => {
    const testDate = new Date('2023-12-25');
    const testInput: CreateTransactionInput = {
      user_id: testUserId,
      account_id: testAccountId,
      category_id: testCategoryId,
      amount: -25.00,
      description: 'Christmas expense',
      transaction_date: testDate
    };

    const result = await createTransaction(testInput);

    expect(result.transaction_date).toEqual(testDate);

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(new Date(transactions[0].transaction_date)).toEqual(testDate);
  });
});