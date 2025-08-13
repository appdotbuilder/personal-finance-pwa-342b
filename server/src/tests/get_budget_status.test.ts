import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable, categoriesTable, budgetsTable, transactionsTable } from '../db/schema';
import { type GetUserBudgetStatusInput } from '../schema';
import { getBudgetStatus } from '../handlers/get_budget_status';

describe('getBudgetStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no budgets', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userResult[0].id
    };

    const result = await getBudgetStatus(input);
    expect(result).toEqual([]);
  });

  it('should calculate budget status with transactions', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();
    const accountId = accountResult[0].id;

    // Create expense category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Groceries',
        type: 'expense'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budget
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '500.00',
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      .returning()
      .execute();

    // Create transactions
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '150.00',
        description: 'Grocery shopping 1',
        transaction_date: '2024-01-15'
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount: '100.00',
        description: 'Grocery shopping 2',
        transaction_date: '2024-01-20'
      })
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].budget.id).toEqual(budgetResult[0].id);
    expect(result[0].budget.amount).toEqual(500);
    expect(result[0].spent_amount).toEqual(250);
    expect(result[0].remaining_amount).toEqual(250);
    expect(result[0].percentage_used).toEqual(50);
  });

  it('should filter budgets by period', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Utilities',
        type: 'expense'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budgets with different periods
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '200.00',
        period: 'weekly',
        start_date: '2024-01-01'
      })
      .execute();

    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryId,
        amount: '800.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId,
      period: 'monthly'
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].budget.period).toEqual('monthly');
    expect(result[0].budget.amount).toEqual(800);
  });

  it('should filter budgets by category', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create categories
    const foodCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        type: 'expense'
      })
      .returning()
      .execute();

    const entertainmentCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Entertainment',
        type: 'expense'
      })
      .returning()
      .execute();

    const categoriesResult = [foodCategoryResult[0], entertainmentCategoryResult[0]];

    // Create budgets for different categories
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoriesResult[0].id,
        amount: '300.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoriesResult[1].id,
        amount: '150.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId,
      category_id: categoriesResult[0].id
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].budget.category_id).toEqual(categoriesResult[0].id);
    expect(result[0].budget.amount).toEqual(300);
  });

  it('should handle budget with no transactions (zero spending)', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Savings',
        type: 'expense'
      })
      .returning()
      .execute();

    // Create budget without any transactions
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryResult[0].id,
        amount: '1000.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].spent_amount).toEqual(0);
    expect(result[0].remaining_amount).toEqual(1000);
    expect(result[0].percentage_used).toEqual(0);
  });

  it('should handle budget overspending', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Shopping',
        type: 'expense'
      })
      .returning()
      .execute();

    // Create budget
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: categoryResult[0].id,
        amount: '100.00',
        period: 'weekly',
        start_date: '2024-01-01',
        end_date: '2024-01-07'
      })
      .execute();

    // Create transaction that exceeds budget
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: categoryResult[0].id,
        amount: '150.00',
        description: 'Overspent shopping',
        transaction_date: '2024-01-05'
      })
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].spent_amount).toEqual(150);
    expect(result[0].remaining_amount).toEqual(-50);
    expect(result[0].percentage_used).toEqual(100); // Capped at 100%
  });

  it('should only count expense transactions, not income', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: 'Test Account',
        type: 'checking',
        balance: '1000.00'
      })
      .returning()
      .execute();

    // Create expense and income categories
    const expenseCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Food',
        type: 'expense'
      })
      .returning()
      .execute();

    const incomeCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Salary',
        type: 'income'
      })
      .returning()
      .execute();

    const categoriesResult = [expenseCategoryResult[0], incomeCategoryResult[0]];

    const expenseCategoryId = categoriesResult[0].id;
    const incomeCategoryId = categoriesResult[1].id;

    // Create budget for expense category
    await db.insert(budgetsTable)
      .values({
        user_id: userId,
        category_id: expenseCategoryId,
        amount: '300.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    // Create both expense and income transactions
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: expenseCategoryId,
        amount: '100.00',
        description: 'Food expense',
        transaction_date: '2024-01-15'
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: incomeCategoryId,
        amount: '2000.00',
        description: 'Salary income',
        transaction_date: '2024-01-01'
      })
      .execute();

    const input: GetUserBudgetStatusInput = {
      user_id: userId
    };

    const result = await getBudgetStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].spent_amount).toEqual(100); // Only expense transaction counted
    expect(result[0].remaining_amount).toEqual(200);
    expect(result[0].percentage_used).toBeCloseTo(33.33, 2);
  });
});