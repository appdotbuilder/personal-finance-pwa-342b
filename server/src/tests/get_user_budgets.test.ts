import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, budgetsTable } from '../db/schema';
import { getUserBudgets } from '../handlers/get_user_budgets';

describe('getUserBudgets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no budgets', async () => {
    // Create a user but no budgets
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const result = await getUserBudgets(user.id);
    expect(result).toEqual([]);
  });

  it('should return all budgets for a specific user', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' }
      ])
      .returning()
      .execute();

    // Create categories for both users
    const [category1] = await db.insert(categoriesTable)
      .values({
        user_id: user1.id,
        name: 'Groceries',
        type: 'expense'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values({
        user_id: user2.id,
        name: 'Transportation',
        type: 'expense'
      })
      .returning()
      .execute();

    // Create budgets for both users
    await db.insert(budgetsTable)
      .values([
        {
          user_id: user1.id,
          category_id: category1.id,
          amount: '500.00',
          period: 'monthly',
          start_date: '2024-01-01'
        },
        {
          user_id: user1.id,
          category_id: category1.id,
          amount: '100.00',
          period: 'weekly',
          start_date: '2024-01-01'
        },
        {
          user_id: user2.id,
          category_id: category2.id,
          amount: '200.00',
          period: 'monthly',
          start_date: '2024-01-01'
        }
      ])
      .execute();

    const result = await getUserBudgets(user1.id);

    expect(result).toHaveLength(2);
    
    // Verify all returned budgets belong to user1
    result.forEach(budget => {
      expect(budget.user_id).toBe(user1.id);
      expect(budget.category_id).toBe(category1.id);
      expect(typeof budget.amount).toBe('number');
    });

    // Verify specific budget data
    const monthlyBudget = result.find(b => b.period === 'monthly');
    const weeklyBudget = result.find(b => b.period === 'weekly');

    expect(monthlyBudget).toBeDefined();
    expect(monthlyBudget!.amount).toBe(500);
    expect(monthlyBudget!.start_date).toEqual(new Date('2024-01-01'));

    expect(weeklyBudget).toBeDefined();
    expect(weeklyBudget!.amount).toBe(100);
    expect(weeklyBudget!.start_date).toEqual(new Date('2024-01-01'));
  });

  it('should handle budgets with different periods and end dates', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create category
    const [category] = await db.insert(categoriesTable)
      .values({
        user_id: user.id,
        name: 'Entertainment',
        type: 'expense'
      })
      .returning()
      .execute();

    // Create budgets with different configurations
    await db.insert(budgetsTable)
      .values([
        {
          user_id: user.id,
          category_id: category.id,
          amount: '1000.00',
          period: 'yearly',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        },
        {
          user_id: user.id,
          category_id: category.id,
          amount: '50.00',
          period: 'weekly',
          start_date: '2024-01-01'
          // no end_date (null)
        }
      ])
      .execute();

    const result = await getUserBudgets(user.id);

    expect(result).toHaveLength(2);

    const yearlyBudget = result.find(b => b.period === 'yearly');
    const weeklyBudget = result.find(b => b.period === 'weekly');

    expect(yearlyBudget).toBeDefined();
    expect(yearlyBudget!.amount).toBe(1000);
    expect(yearlyBudget!.end_date).toEqual(new Date('2024-12-31'));

    expect(weeklyBudget).toBeDefined();
    expect(weeklyBudget!.amount).toBe(50);
    expect(weeklyBudget!.end_date).toBeNull();
  });

  it('should handle decimal amounts correctly', async () => {
    // Create user and category
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        user_id: user.id,
        name: 'Food',
        type: 'expense'
      })
      .returning()
      .execute();

    // Create budget with decimal amount
    await db.insert(budgetsTable)
      .values({
        user_id: user.id,
        category_id: category.id,
        amount: '299.99',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    const result = await getUserBudgets(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(299.99);
    expect(typeof result[0].amount).toBe('number');
  });

  it('should include all required budget fields', async () => {
    // Create user and category
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        user_id: user.id,
        name: 'Utilities',
        type: 'expense'
      })
      .returning()
      .execute();

    await db.insert(budgetsTable)
      .values({
        user_id: user.id,
        category_id: category.id,
        amount: '150.00',
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .execute();

    const result = await getUserBudgets(user.id);

    expect(result).toHaveLength(1);
    
    const budget = result[0];
    expect(budget.id).toBeDefined();
    expect(budget.user_id).toBe(user.id);
    expect(budget.category_id).toBe(category.id);
    expect(budget.amount).toBe(150);
    expect(budget.period).toBe('monthly');
    expect(budget.start_date).toEqual(new Date('2024-01-01'));
    expect(budget.end_date).toBeNull();
    expect(budget.created_at).toBeInstanceOf(Date);
    expect(budget.updated_at).toBeInstanceOf(Date);
  });
});