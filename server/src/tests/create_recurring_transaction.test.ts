import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, recurringTransactionsTable } from '../db/schema';
import { type CreateRecurringTransactionInput } from '../schema';
import { createRecurringTransaction } from '../handlers/create_recurring_transaction';
import { eq } from 'drizzle-orm';

describe('createRecurringTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a recurring transaction', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const account = await db.insert(accountsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const testInput: CreateRecurringTransactionInput = {
      user_id: user[0].id,
      account_id: account[0].id,
      category_id: category[0].id,
      amount: -50.25,
      description: 'Monthly subscription',
      frequency: 'monthly',
      next_occurrence: new Date('2024-02-01'),
      end_date: new Date('2024-12-31')
    };

    const result = await createRecurringTransaction(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user[0].id);
    expect(result.account_id).toEqual(account[0].id);
    expect(result.category_id).toEqual(category[0].id);
    expect(result.amount).toEqual(-50.25);
    expect(result.description).toEqual('Monthly subscription');
    expect(result.frequency).toEqual('monthly');
    expect(result.next_occurrence).toEqual(new Date('2024-02-01'));
    expect(result.end_date).toEqual(new Date('2024-12-31'));
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.amount).toBe('number');
  });

  it('should save recurring transaction to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const account = await db.insert(accountsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Account',
        type: 'savings',
        balance: '2000.00'
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Salary',
        type: 'income'
      })
      .returning()
      .execute();

    const testInput: CreateRecurringTransactionInput = {
      user_id: user[0].id,
      account_id: account[0].id,
      category_id: category[0].id,
      amount: 3000.00,
      description: 'Monthly salary',
      frequency: 'monthly',
      next_occurrence: new Date('2024-01-15')
    };

    const result = await createRecurringTransaction(testInput);

    // Query database to verify storage
    const recurringTransactions = await db.select()
      .from(recurringTransactionsTable)
      .where(eq(recurringTransactionsTable.id, result.id))
      .execute();

    expect(recurringTransactions).toHaveLength(1);
    const stored = recurringTransactions[0];
    expect(stored.user_id).toEqual(user[0].id);
    expect(stored.account_id).toEqual(account[0].id);
    expect(stored.category_id).toEqual(category[0].id);
    expect(parseFloat(stored.amount)).toEqual(3000.00);
    expect(stored.description).toEqual('Monthly salary');
    expect(stored.frequency).toEqual('monthly');
    expect(stored.next_occurrence).toEqual('2024-01-15'); // Database stores as string
    expect(stored.end_date).toBeNull();
    expect(stored.is_active).toEqual(true);
    expect(stored.created_at).toBeInstanceOf(Date);
    expect(stored.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different frequency types', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const account = await db.insert(accountsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Account',
        type: 'checking',
        balance: '500.00'
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Daily Coffee',
        type: 'expense'
      })
      .returning()
      .execute();

    const frequencies: Array<'daily' | 'weekly' | 'monthly' | 'yearly'> = ['daily', 'weekly', 'monthly', 'yearly'];

    for (const frequency of frequencies) {
      const testInput: CreateRecurringTransactionInput = {
        user_id: user[0].id,
        account_id: account[0].id,
        category_id: category[0].id,
        amount: -5.00,
        description: `${frequency} expense`,
        frequency,
        next_occurrence: new Date('2024-01-01')
      };

      const result = await createRecurringTransaction(testInput);
      expect(result.frequency).toEqual(frequency);
      expect(result.description).toEqual(`${frequency} expense`);
      expect(result.next_occurrence).toEqual(new Date('2024-01-01'));
    }
  });

  it('should handle recurring transaction without end date', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const account = await db.insert(accountsTable)
      .values({
        user_id: user[0].id,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Rent',
        type: 'expense'
      })
      .returning()
      .execute();

    const testInput: CreateRecurringTransactionInput = {
      user_id: user[0].id,
      account_id: account[0].id,
      category_id: category[0].id,
      amount: -1500.00,
      description: 'Monthly rent',
      frequency: 'monthly',
      next_occurrence: new Date('2024-02-01')
      // No end_date provided
    };

    const result = await createRecurringTransaction(testInput);

    expect(result.end_date).toBeNull();
    expect(result.amount).toEqual(-1500.00);
    expect(result.frequency).toEqual('monthly');
    expect(result.is_active).toEqual(true);
    expect(result.next_occurrence).toEqual(new Date('2024-02-01'));
  });

  it('should handle large amounts correctly', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const account = await db.insert(accountsTable)
      .values({
        user_id: user[0].id,
        name: 'Investment Account',
        type: 'investment',
        balance: '100000.00'
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        user_id: user[0].id,
        name: 'Investment Returns',
        type: 'income'
      })
      .returning()
      .execute();

    const testInput: CreateRecurringTransactionInput = {
      user_id: user[0].id,
      account_id: account[0].id,
      category_id: category[0].id,
      amount: 12345.67,
      description: 'Yearly dividend',
      frequency: 'yearly',
      next_occurrence: new Date('2024-12-31'),
      end_date: new Date('2034-12-31')
    };

    const result = await createRecurringTransaction(testInput);

    expect(result.amount).toEqual(12345.67);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Yearly dividend');
    expect(result.frequency).toEqual('yearly');
    expect(result.next_occurrence).toEqual(new Date('2024-12-31'));
    expect(result.end_date).toEqual(new Date('2034-12-31'));
  });

  it('should throw error for invalid foreign key references', async () => {
    const testInput: CreateRecurringTransactionInput = {
      user_id: 999, // Non-existent user
      account_id: 999, // Non-existent account
      category_id: 999, // Non-existent category
      amount: -25.00,
      description: 'Invalid transaction',
      frequency: 'monthly',
      next_occurrence: new Date('2024-01-01')
    };

    await expect(createRecurringTransaction(testInput)).rejects.toThrow();
  });
});