import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';

// Test data setup
const testUser = {
  name: 'Test User',
  email: 'test@example.com'
};

const testAccount = {
  user_id: 1,
  name: 'Checking Account',
  type: 'checking' as const,
  balance: 1000,
  description: 'Main checking account'
};

const testCategory = {
  user_id: 1,
  name: 'Groceries',
  type: 'expense' as const,
  color: '#FF0000'
};

const testTransactions = [
  {
    user_id: 1,
    account_id: 1,
    category_id: 1,
    amount: -50.25,
    description: 'Weekly grocery shopping',
    transaction_date: '2024-01-15'
  },
  {
    user_id: 1,
    account_id: 1,
    category_id: 1,
    amount: -75.50,
    description: 'Grocery store visit',
    transaction_date: '2024-01-10'
  },
  {
    user_id: 1,
    account_id: 1,
    category_id: 1,
    amount: -30.00,
    description: 'Quick grocery run',
    transaction_date: '2024-01-20'
  }
];

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const setupTestData = async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create account
    await db.insert(accountsTable).values({
      ...testAccount,
      balance: testAccount.balance.toString()
    }).execute();

    // Create category
    await db.insert(categoriesTable).values(testCategory).execute();

    // Create transactions
    await db.insert(transactionsTable).values(
      testTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString()
      }))
    ).execute();
  };

  it('should get all transactions for a user', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(3);
    expect(result[0].amount).toEqual(-30.00); // Most recent first (2024-01-20)
    expect(result[1].amount).toEqual(-50.25); // Second most recent (2024-01-15)
    expect(result[2].amount).toEqual(-75.50); // Oldest (2024-01-10)
    
    // Verify all returned fields
    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toEqual(1);
      expect(transaction.account_id).toEqual(1);
      expect(transaction.category_id).toEqual(1);
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.description).toBeDefined();
      expect(transaction.transaction_date).toBeInstanceOf(Date);
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter transactions by account_id', async () => {
    await setupTestData();

    // Create another account and transaction
    await db.insert(accountsTable).values({
      user_id: 1,
      name: 'Savings Account',
      type: 'savings',
      balance: '500.00',
      description: 'Savings account'
    }).execute();

    await db.insert(transactionsTable).values({
      user_id: 1,
      account_id: 2,
      category_id: 1,
      amount: '100.00',
      description: 'Savings deposit',
      transaction_date: '2024-01-18'
    }).execute();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      account_id: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.account_id).toEqual(1);
    });
  });

  it('should filter transactions by category_id', async () => {
    await setupTestData();

    // Create another category and transaction
    await db.insert(categoriesTable).values({
      user_id: 1,
      name: 'Transportation',
      type: 'expense',
      color: '#0000FF'
    }).execute();

    await db.insert(transactionsTable).values({
      user_id: 1,
      account_id: 1,
      category_id: 2,
      amount: '-25.00',
      description: 'Gas station',
      transaction_date: '2024-01-18'
    }).execute();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      category_id: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.category_id).toEqual(1);
    });
  });

  it('should filter transactions by date range', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-18')
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_date.toISOString().split('T')[0]).toEqual('2024-01-15');
    expect(result[0].amount).toEqual(-50.25);
  });

  it('should filter transactions by start_date only', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      start_date: new Date('2024-01-15')
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    expect(result[0].transaction_date >= new Date('2024-01-15')).toBe(true);
    expect(result[1].transaction_date >= new Date('2024-01-15')).toBe(true);
  });

  it('should filter transactions by end_date only', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      end_date: new Date('2024-01-15')
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.transaction_date <= new Date('2024-01-15')).toBe(true);
    });
  });

  it('should apply pagination with limit', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      limit: 2
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    expect(result[0].amount).toEqual(-30.00); // Most recent
    expect(result[1].amount).toEqual(-50.25); // Second most recent
  });

  it('should apply pagination with offset', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      offset: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    expect(result[0].amount).toEqual(-50.25); // Second transaction
    expect(result[1].amount).toEqual(-75.50); // Third transaction
  });

  it('should apply pagination with both limit and offset', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      limit: 1,
      offset: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(-50.25); // Second transaction
  });

  it('should combine multiple filters', async () => {
    await setupTestData();

    // Create additional test data
    await db.insert(accountsTable).values({
      user_id: 1,
      name: 'Credit Card',
      type: 'credit_card',
      balance: '-200.00'
    }).execute();

    await db.insert(transactionsTable).values({
      user_id: 1,
      account_id: 2,
      category_id: 1,
      amount: '-40.00',
      description: 'Credit card grocery',
      transaction_date: '2024-01-16'
    }).execute();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      account_id: 1,
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-18'),
      limit: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].account_id).toEqual(1);
    expect(result[0].transaction_date >= new Date('2024-01-12')).toBe(true);
    expect(result[0].transaction_date <= new Date('2024-01-18')).toBe(true);
    expect(result[0].amount).toEqual(-50.25);
  });

  it('should return empty array for user with no transactions', async () => {
    // Create user but no transactions
    await db.insert(usersTable).values(testUser).execute();

    const input: GetUserTransactionsInput = {
      user_id: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserTransactionsInput = {
      user_id: 999
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should handle numeric amount conversion correctly', async () => {
    await setupTestData();

    const input: GetUserTransactionsInput = {
      user_id: 1,
      limit: 1
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(-30.00);
  });
});