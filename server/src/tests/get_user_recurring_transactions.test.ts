import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, recurringTransactionsTable } from '../db/schema';
import { getUserRecurringTransactions } from '../handlers/get_user_recurring_transactions';

describe('getUserRecurringTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no recurring transactions', async () => {
    // Create a user without any recurring transactions
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const result = await getUserRecurringTransactions(userResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return all recurring transactions for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Checking Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();
    const accountId = accountResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Rent',
        type: 'expense'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test recurring transactions
    const recurringTransaction1 = {
      user_id: userId,
      account_id: accountId,
      category_id: categoryId,
      amount: '1200.50',
      description: 'Monthly Rent',
      frequency: 'monthly' as const,
      next_occurrence: '2024-02-01',
      is_active: true
    };

    const recurringTransaction2 = {
      user_id: userId,
      account_id: accountId,
      category_id: categoryId,
      amount: '85.25',
      description: 'Weekly Groceries',
      frequency: 'weekly' as const,
      next_occurrence: '2024-01-15',
      end_date: '2024-12-31',
      is_active: false
    };

    await db.insert(recurringTransactionsTable)
      .values([recurringTransaction1, recurringTransaction2])
      .execute();

    const result = await getUserRecurringTransactions(userId);

    expect(result).toHaveLength(2);
    
    // Verify first recurring transaction
    const rent = result.find(t => t.description === 'Monthly Rent');
    expect(rent).toBeDefined();
    expect(rent!.amount).toEqual(1200.50);
    expect(typeof rent!.amount).toBe('number');
    expect(rent!.frequency).toEqual('monthly');
    expect(rent!.is_active).toBe(true);
    expect(rent!.end_date).toBe(null);
    expect(rent!.next_occurrence).toBeInstanceOf(Date);

    // Verify second recurring transaction
    const groceries = result.find(t => t.description === 'Weekly Groceries');
    expect(groceries).toBeDefined();
    expect(groceries!.amount).toEqual(85.25);
    expect(typeof groceries!.amount).toBe('number');
    expect(groceries!.frequency).toEqual('weekly');
    expect(groceries!.is_active).toBe(false);
    expect(groceries!.end_date).toBeInstanceOf(Date);
    expect(groceries!.next_occurrence).toBeInstanceOf(Date);

    // Verify all required fields are present
    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toEqual(userId);
      expect(transaction.account_id).toEqual(accountId);
      expect(transaction.category_id).toEqual(categoryId);
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.description).toBeDefined();
      expect(transaction.frequency).toBeDefined();
      expect(transaction.next_occurrence).toBeInstanceOf(Date);
      expect(typeof transaction.is_active).toBe('boolean');
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return recurring transactions for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create accounts for both users
    const account1Result = await db.insert(accountsTable)
      .values({
        user_id: user1Id,
        name: 'Account 1',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();

    const account2Result = await db.insert(accountsTable)
      .values({
        user_id: user2Id,
        name: 'Account 2',
        type: 'savings',
        balance: '2000.00'
      })
      .returning()
      .execute();

    // Create categories for both users
    const category1Result = await db.insert(categoriesTable)
      .values({
        user_id: user1Id,
        name: 'Rent',
        type: 'expense'
      })
      .returning()
      .execute();

    const category2Result = await db.insert(categoriesTable)
      .values({
        user_id: user2Id,
        name: 'Salary',
        type: 'income'
      })
      .returning()
      .execute();

    // Create recurring transactions for both users
    await db.insert(recurringTransactionsTable)
      .values([
        {
          user_id: user1Id,
          account_id: account1Result[0].id,
          category_id: category1Result[0].id,
          amount: '1200.00',
          description: 'User 1 Rent',
          frequency: 'monthly',
          next_occurrence: '2024-02-01',
          is_active: true
        },
        {
          user_id: user2Id,
          account_id: account2Result[0].id,
          category_id: category2Result[0].id,
          amount: '5000.00',
          description: 'User 2 Salary',
          frequency: 'monthly',
          next_occurrence: '2024-01-31',
          is_active: true
        }
      ])
      .execute();

    // Get recurring transactions for user 1
    const user1Transactions = await getUserRecurringTransactions(user1Id);
    
    expect(user1Transactions).toHaveLength(1);
    expect(user1Transactions[0].description).toEqual('User 1 Rent');
    expect(user1Transactions[0].user_id).toEqual(user1Id);
    expect(user1Transactions[0].amount).toEqual(1200.00);

    // Get recurring transactions for user 2
    const user2Transactions = await getUserRecurringTransactions(user2Id);
    
    expect(user2Transactions).toHaveLength(1);
    expect(user2Transactions[0].description).toEqual('User 2 Salary');
    expect(user2Transactions[0].user_id).toEqual(user2Id);
    expect(user2Transactions[0].amount).toEqual(5000.00);
  });

  it('should handle users with various recurring transaction frequencies', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Main Account',
        type: 'checking',
        balance: '5000.00'
      })
      .returning()
      .execute();
    const accountId = accountResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Expenses',
        type: 'expense'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create recurring transactions with different frequencies
    const recurringTransactions = [
      {
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '10.00',
        description: 'Daily Coffee',
        frequency: 'daily' as const,
        next_occurrence: '2024-01-16',
        is_active: true
      },
      {
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '50.00',
        description: 'Weekly Groceries',
        frequency: 'weekly' as const,
        next_occurrence: '2024-01-22',
        is_active: true
      },
      {
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '1200.00',
        description: 'Monthly Rent',
        frequency: 'monthly' as const,
        next_occurrence: '2024-02-01',
        is_active: true
      },
      {
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '500.00',
        description: 'Annual Insurance',
        frequency: 'yearly' as const,
        next_occurrence: '2025-01-01',
        is_active: true
      }
    ];

    await db.insert(recurringTransactionsTable)
      .values(recurringTransactions)
      .execute();

    const result = await getUserRecurringTransactions(userId);

    expect(result).toHaveLength(4);
    
    // Verify all frequencies are present
    const frequencies = result.map(t => t.frequency).sort();
    expect(frequencies).toEqual(['daily', 'monthly', 'weekly', 'yearly']);

    // Verify amounts are correctly converted to numbers
    const amounts = result.map(t => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([10, 50, 500, 1200]);
    
    // Verify all amounts are numbers
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
    });
  });
});