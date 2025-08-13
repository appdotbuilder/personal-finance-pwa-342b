import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  accountsTable, 
  categoriesTable, 
  recurringTransactionsTable,
  transactionsTable 
} from '../db/schema';
import { processRecurringTransactions } from '../handlers/process_recurring_transactions';
import { eq, and } from 'drizzle-orm';
import type { 
  CreateUserInput, 
  CreateAccountInput, 
  CreateCategoryInput,
  CreateRecurringTransactionInput 
} from '../schema';

// Test data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

const testAccount: CreateAccountInput = {
  user_id: 1,
  name: 'Checking Account',
  type: 'checking',
  balance: 1000.00
};

const testCategory: CreateCategoryInput = {
  user_id: 1,
  name: 'Utilities',
  type: 'expense'
};

describe('processRecurringTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  async function setupPrerequisites() {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    // Create account
    const accountResult = await db.insert(accountsTable)
      .values({
        ...testAccount,
        balance: testAccount.balance.toString()
      })
      .returning()
      .execute();

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    return {
      user: userResult[0],
      account: accountResult[0],
      category: categoryResult[0]
    };
  }

  it('should process due recurring transactions', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a due recurring transaction
    const recurringTransactionInput: CreateRecurringTransactionInput = {
      user_id: user.id,
      account_id: account.id,
      category_id: category.id,
      amount: -100.00,
      description: 'Monthly utility bill',
      frequency: 'monthly',
      next_occurrence: today
    };

    await db.insert(recurringTransactionsTable)
      .values({
        user_id: recurringTransactionInput.user_id,
        account_id: recurringTransactionInput.account_id,
        category_id: recurringTransactionInput.category_id,
        amount: recurringTransactionInput.amount.toString(),
        description: recurringTransactionInput.description,
        frequency: recurringTransactionInput.frequency,
        next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0]
      })
      .execute();

    // Process recurring transactions
    const result = await processRecurringTransactions();

    expect(result.processed).toBe(1);

    // Verify transaction was created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, user.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toBe(-100.00);
    expect(transactions[0].description).toBe('Monthly utility bill');
    expect(transactions[0].transaction_date).toEqual(today.toISOString().split('T')[0]);
  });

  it('should update next occurrence date correctly', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a weekly recurring transaction
    const recurringTransactionInput: CreateRecurringTransactionInput = {
      user_id: user.id,
      account_id: account.id,
      category_id: category.id,
      amount: -50.00,
      description: 'Weekly subscription',
      frequency: 'weekly',
      next_occurrence: today
    };

    const recurringResult = await db.insert(recurringTransactionsTable)
      .values({
        user_id: recurringTransactionInput.user_id,
        account_id: recurringTransactionInput.account_id,
        category_id: recurringTransactionInput.category_id,
        amount: recurringTransactionInput.amount.toString(),
        description: recurringTransactionInput.description,
        frequency: recurringTransactionInput.frequency,
        next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const recurringId = recurringResult[0].id;

    // Process recurring transactions
    await processRecurringTransactions();

    // Verify next occurrence was updated (should be 7 days later)
    const updatedRecurring = await db.select()
      .from(recurringTransactionsTable)
      .where(eq(recurringTransactionsTable.id, recurringId))
      .execute();

    const expectedNextDate = new Date(today);
    expectedNextDate.setDate(expectedNextDate.getDate() + 7);

    expect(updatedRecurring[0].next_occurrence).toEqual(expectedNextDate.toISOString().split('T')[0]);
    expect(updatedRecurring[0].is_active).toBe(true);
  });

  it('should handle different frequencies correctly', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
    const expectedDays = [1, 7, 30, 365]; // Approximate for monthly/yearly

    for (let i = 0; i < frequencies.length; i++) {
      const frequency = frequencies[i];
      
      const recurringTransactionInput: CreateRecurringTransactionInput = {
        user_id: user.id,
        account_id: account.id,
        category_id: category.id,
        amount: -25.00,
        description: `${frequency} transaction`,
        frequency: frequency,
        next_occurrence: today
      };

      const recurringResult = await db.insert(recurringTransactionsTable)
        .values({
          user_id: recurringTransactionInput.user_id,
          account_id: recurringTransactionInput.account_id,
          category_id: recurringTransactionInput.category_id,
          amount: recurringTransactionInput.amount.toString(),
          description: recurringTransactionInput.description,
          frequency: recurringTransactionInput.frequency,
          next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0]
        })
        .returning()
        .execute();

      const recurringId = recurringResult[0].id;

      // Process this specific transaction
      await processRecurringTransactions();

      // Check next occurrence
      const updatedRecurring = await db.select()
        .from(recurringTransactionsTable)
        .where(eq(recurringTransactionsTable.id, recurringId))
        .execute();

      const nextOccurrence = new Date(updatedRecurring[0].next_occurrence);
      const daysDifference = Math.floor((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (frequency === 'monthly') {
        // Monthly should add 1 month (28-31 days depending on month)
        expect(daysDifference).toBeGreaterThanOrEqual(28);
        expect(daysDifference).toBeLessThanOrEqual(31);
      } else if (frequency === 'yearly') {
        // Yearly should add 1 year (365 or 366 days)
        expect(daysDifference).toBeGreaterThanOrEqual(365);
        expect(daysDifference).toBeLessThanOrEqual(366);
      } else {
        expect(daysDifference).toBe(expectedDays[i]);
      }
    }
  });

  it('should deactivate recurring transactions past end date', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5); // End date is 5 days from now

    const recurringTransactionInput: CreateRecurringTransactionInput = {
      user_id: user.id,
      account_id: account.id,
      category_id: category.id,
      amount: -75.00,
      description: 'Limited time subscription',
      frequency: 'weekly',
      next_occurrence: today,
      end_date: endDate
    };

    const recurringResult = await db.insert(recurringTransactionsTable)
      .values({
        user_id: recurringTransactionInput.user_id,
        account_id: recurringTransactionInput.account_id,
        category_id: recurringTransactionInput.category_id,
        amount: recurringTransactionInput.amount.toString(),
        description: recurringTransactionInput.description,
        frequency: recurringTransactionInput.frequency,
        next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0],
        end_date: recurringTransactionInput.end_date?.toISOString().split('T')[0]
      })
      .returning()
      .execute();

    const recurringId = recurringResult[0].id;

    // Process recurring transactions
    await processRecurringTransactions();

    // Check that it was deactivated (next occurrence would be 7 days later, past end date)
    const updatedRecurring = await db.select()
      .from(recurringTransactionsTable)
      .where(eq(recurringTransactionsTable.id, recurringId))
      .execute();

    expect(updatedRecurring[0].is_active).toBe(false);

    // Verify transaction was still created for this occurrence
    const transactions = await db.select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, user.id),
          eq(transactionsTable.description, 'Limited time subscription')
        )
      )
      .execute();

    expect(transactions).toHaveLength(1);
  });

  it('should skip inactive recurring transactions', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurringTransactionInput: CreateRecurringTransactionInput = {
      user_id: user.id,
      account_id: account.id,
      category_id: category.id,
      amount: -30.00,
      description: 'Inactive subscription',
      frequency: 'monthly',
      next_occurrence: today
    };

    // Create inactive recurring transaction
    await db.insert(recurringTransactionsTable)
      .values({
        user_id: recurringTransactionInput.user_id,
        account_id: recurringTransactionInput.account_id,
        category_id: recurringTransactionInput.category_id,
        amount: recurringTransactionInput.amount.toString(),
        description: recurringTransactionInput.description,
        frequency: recurringTransactionInput.frequency,
        next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0],
        is_active: false
      })
      .execute();

    // Process recurring transactions
    const result = await processRecurringTransactions();

    expect(result.processed).toBe(0);

    // Verify no transaction was created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, user.id))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should skip recurring transactions not yet due', async () => {
    const { user, account, category } = await setupPrerequisites();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future

    const recurringTransactionInput: CreateRecurringTransactionInput = {
      user_id: user.id,
      account_id: account.id,
      category_id: category.id,
      amount: -40.00,
      description: 'Future subscription',
      frequency: 'monthly',
      next_occurrence: futureDate
    };

    await db.insert(recurringTransactionsTable)
      .values({
        user_id: recurringTransactionInput.user_id,
        account_id: recurringTransactionInput.account_id,
        category_id: recurringTransactionInput.category_id,
        amount: recurringTransactionInput.amount.toString(),
        description: recurringTransactionInput.description,
        frequency: recurringTransactionInput.frequency,
        next_occurrence: recurringTransactionInput.next_occurrence.toISOString().split('T')[0]
      })
      .execute();

    // Process recurring transactions
    const result = await processRecurringTransactions();

    expect(result.processed).toBe(0);

    // Verify no transaction was created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, user.id))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should process multiple due recurring transactions', async () => {
    const { user, account, category } = await setupPrerequisites();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create multiple due recurring transactions
    const recurringTransactions = [
      {
        user_id: user.id,
        account_id: account.id,
        category_id: category.id,
        amount: -100.00,
        description: 'Rent',
        frequency: 'monthly' as const,
        next_occurrence: today
      },
      {
        user_id: user.id,
        account_id: account.id,
        category_id: category.id,
        amount: -50.00,
        description: 'Internet',
        frequency: 'monthly' as const,
        next_occurrence: today
      },
      {
        user_id: user.id,
        account_id: account.id,
        category_id: category.id,
        amount: -25.00,
        description: 'Streaming service',
        frequency: 'monthly' as const,
        next_occurrence: today
      }
    ];

    for (const transaction of recurringTransactions) {
      await db.insert(recurringTransactionsTable)
        .values({
          user_id: transaction.user_id,
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          amount: transaction.amount.toString(),
          description: transaction.description,
          frequency: transaction.frequency,
          next_occurrence: transaction.next_occurrence.toISOString().split('T')[0]
        })
        .execute();
    }

    // Process recurring transactions
    const result = await processRecurringTransactions();

    expect(result.processed).toBe(3);

    // Verify all transactions were created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, user.id))
      .execute();

    expect(transactions).toHaveLength(3);

    // Verify transaction amounts
    const amounts = transactions.map(t => parseFloat(t.amount)).sort((a, b) => a - b);
    expect(amounts).toEqual([-100.00, -50.00, -25.00]);
  });
});