import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  accountsTable, 
  categoriesTable, 
  transactionsTable, 
  budgetsTable, 
  financialGoalsTable 
} from '../db/schema';
import { type GetFinancialSummaryInput } from '../schema';
import { getFinancialSummary } from '../handlers/get_financial_summary';

describe('getFinancialSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return financial summary with all data', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    // Create test accounts
    const accountResult = await db.insert(accountsTable).values([
      {
        user_id: userId,
        name: 'Checking Account',
        type: 'checking',
        balance: '1000.00'
      },
      {
        user_id: userId,
        name: 'Savings Account',
        type: 'savings',
        balance: '5000.00'
      }
    ]).returning().execute();

    // Create test categories
    const categoryResult = await db.insert(categoriesTable).values([
      {
        user_id: userId,
        name: 'Salary',
        type: 'income'
      },
      {
        user_id: userId,
        name: 'Groceries',
        type: 'expense'
      },
      {
        user_id: userId,
        name: 'Utilities',
        type: 'expense'
      }
    ]).returning().execute();

    const incomeCategory = categoryResult.find(c => c.type === 'income')!;
    const groceriesCategory = categoryResult.find(c => c.name === 'Groceries')!;
    const utilitiesCategory = categoryResult.find(c => c.name === 'Utilities')!;

    // Create test transactions
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: incomeCategory.id,
        amount: '3000.00',
        description: 'Monthly salary',
        transaction_date: '2024-01-15'
      },
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: groceriesCategory.id,
        amount: '500.00',
        description: 'Weekly groceries',
        transaction_date: '2024-01-10'
      },
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: utilitiesCategory.id,
        amount: '150.00',
        description: 'Electric bill',
        transaction_date: '2024-01-05'
      }
    ]).execute();

    // Create test budget
    const budgetResult = await db.insert(budgetsTable).values({
      user_id: userId,
      category_id: groceriesCategory.id,
      amount: '600.00',
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }).returning().execute();

    // Create test financial goal
    await db.insert(financialGoalsTable).values({
      user_id: userId,
      name: 'Emergency Fund',
      target_amount: '10000.00',
      current_amount: '2500.00',
      target_date: '2024-12-31',
      status: 'active',
      description: 'Build emergency fund'
    }).execute();

    const input: GetFinancialSummaryInput = {
      user_id: userId
    };

    const result = await getFinancialSummary(input);

    // Verify totals
    expect(result.total_income).toEqual(3000.00);
    expect(result.total_expenses).toEqual(650.00); // 500 + 150
    expect(result.net_income).toEqual(2350.00); // 3000 - 650

    // Verify account balances
    expect(result.account_balances).toEqual({
      'Checking Account': 1000.00,
      'Savings Account': 5000.00
    });

    // Verify budget status
    expect(result.budget_status).toHaveLength(1);
    expect(result.budget_status[0].budget.id).toEqual(budgetResult[0].id);
    expect(result.budget_status[0].budget.amount).toEqual(600.00);
    expect(result.budget_status[0].spent_amount).toEqual(500.00);
    expect(result.budget_status[0].remaining_amount).toEqual(100.00);
    expect(result.budget_status[0].percentage_used).toBeCloseTo(83.33, 2);

    // Verify goal progress
    expect(result.goal_progress).toHaveLength(1);
    expect(result.goal_progress[0].name).toEqual('Emergency Fund');
    expect(result.goal_progress[0].target_amount).toEqual(10000.00);
    expect(result.goal_progress[0].current_amount).toEqual(2500.00);
  });

  it('should filter transactions by date range', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    // Create test account and category
    const accountResult = await db.insert(accountsTable).values({
      user_id: userId,
      name: 'Test Account',
      type: 'checking',
      balance: '1000.00'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      user_id: userId,
      name: 'Test Income',
      type: 'income'
    }).returning().execute();

    // Create transactions in different date ranges
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: categoryResult[0].id,
        amount: '1000.00',
        description: 'January income',
        transaction_date: '2024-01-15'
      },
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: categoryResult[0].id,
        amount: '1000.00',
        description: 'February income',
        transaction_date: '2024-02-15'
      }
    ]).execute();

    const input: GetFinancialSummaryInput = {
      user_id: userId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialSummary(input);

    // Should only include January transaction
    expect(result.total_income).toEqual(1000.00);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(1000.00);
  });

  it('should return empty summary for user with no data', async () => {
    // Create test user with no financial data
    const userResult = await db.insert(usersTable).values({
      name: 'Empty User',
      email: 'empty@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    const input: GetFinancialSummaryInput = {
      user_id: userId
    };

    const result = await getFinancialSummary(input);

    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
    expect(result.account_balances).toEqual({});
    expect(result.budget_status).toEqual([]);
    expect(result.goal_progress).toEqual([]);
  });

  it('should handle budget with no spending', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable).values({
      user_id: userId,
      name: 'Entertainment',
      type: 'expense'
    }).returning().execute();

    // Create budget with no transactions
    const budgetResult = await db.insert(budgetsTable).values({
      user_id: userId,
      category_id: categoryResult[0].id,
      amount: '300.00',
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }).returning().execute();

    const input: GetFinancialSummaryInput = {
      user_id: userId
    };

    const result = await getFinancialSummary(input);

    expect(result.budget_status).toHaveLength(1);
    expect(result.budget_status[0].budget.id).toEqual(budgetResult[0].id);
    expect(result.budget_status[0].spent_amount).toEqual(0);
    expect(result.budget_status[0].remaining_amount).toEqual(300.00);
    expect(result.budget_status[0].percentage_used).toEqual(0);
  });

  it('should handle budget with overspending', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    // Create test account and category
    const accountResult = await db.insert(accountsTable).values({
      user_id: userId,
      name: 'Test Account',
      type: 'checking',
      balance: '1000.00'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      user_id: userId,
      name: 'Dining Out',
      type: 'expense'
    }).returning().execute();

    // Create budget
    const budgetResult = await db.insert(budgetsTable).values({
      user_id: userId,
      category_id: categoryResult[0].id,
      amount: '200.00',
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }).returning().execute();

    // Create transaction that exceeds budget
    await db.insert(transactionsTable).values({
      user_id: userId,
      account_id: accountResult[0].id,
      category_id: categoryResult[0].id,
      amount: '350.00',
      description: 'Expensive dinner',
      transaction_date: '2024-01-15'
    }).execute();

    const input: GetFinancialSummaryInput = {
      user_id: userId
    };

    const result = await getFinancialSummary(input);

    expect(result.budget_status).toHaveLength(1);
    expect(result.budget_status[0].spent_amount).toEqual(350.00);
    expect(result.budget_status[0].remaining_amount).toEqual(-150.00);
    expect(result.budget_status[0].percentage_used).toEqual(175.00);
  });

  it('should respect budget date ranges for spending calculation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    const userId = userResult[0].id;

    // Create test account and category
    const accountResult = await db.insert(accountsTable).values({
      user_id: userId,
      name: 'Test Account',
      type: 'checking',
      balance: '1000.00'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      user_id: userId,
      name: 'Gas',
      type: 'expense'
    }).returning().execute();

    // Create budget for January only
    const budgetResult = await db.insert(budgetsTable).values({
      user_id: userId,
      category_id: categoryResult[0].id,
      amount: '150.00',
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    }).returning().execute();

    // Create transactions - one in January (should count), one in February (should not count)
    await db.insert(transactionsTable).values([
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: categoryResult[0].id,
        amount: '75.00',
        description: 'January gas',
        transaction_date: '2024-01-15'
      },
      {
        user_id: userId,
        account_id: accountResult[0].id,
        category_id: categoryResult[0].id,
        amount: '80.00',
        description: 'February gas',
        transaction_date: '2024-02-15'
      }
    ]).execute();

    const input: GetFinancialSummaryInput = {
      user_id: userId
    };

    const result = await getFinancialSummary(input);

    expect(result.budget_status).toHaveLength(1);
    // Should only count the January transaction (75.00) not the February one
    expect(result.budget_status[0].spent_amount).toEqual(75.00);
    expect(result.budget_status[0].remaining_amount).toEqual(75.00);
    expect(result.budget_status[0].percentage_used).toEqual(50.00);
  });
});