import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateBudgetInput } from '../schema';
import { createBudget } from '../handlers/create_budget';
import { eq } from 'drizzle-orm';

describe('createBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let categoryId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;
  });

  const testInput: CreateBudgetInput = {
    user_id: 0, // Will be set in beforeEach
    category_id: 0, // Will be set in beforeEach
    amount: 500.00,
    period: 'monthly',
    start_date: new Date('2024-01-01')
  };

  it('should create a budget with required fields', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: categoryId
    };

    const result = await createBudget(input);

    // Basic field validation
    expect(result.user_id).toBe(userId);
    expect(result.category_id).toBe(categoryId);
    expect(result.amount).toBe(500.00);
    expect(typeof result.amount).toBe('number');
    expect(result.period).toBe('monthly');
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.start_date.getTime()).toBe(new Date('2024-01-01').getTime());
    expect(result.end_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a budget with end_date', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: categoryId,
      end_date: new Date('2024-12-31')
    };

    const result = await createBudget(input);

    expect(result.end_date).toBeInstanceOf(Date);
    expect(result.end_date!.getTime()).toBe(new Date('2024-12-31').getTime());
  });

  it('should save budget to database correctly', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: categoryId
    };

    const result = await createBudget(input);

    // Query database to verify data was saved correctly
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets).toHaveLength(1);
    const savedBudget = budgets[0];
    expect(savedBudget.user_id).toBe(userId);
    expect(savedBudget.category_id).toBe(categoryId);
    expect(parseFloat(savedBudget.amount)).toBe(500.00);
    expect(savedBudget.period).toBe('monthly');
    // Database stores dates as strings, so we compare string representations
    expect(savedBudget.start_date).toBe('2024-01-01');
    expect(savedBudget.end_date).toBeNull();
    expect(savedBudget.created_at).toBeInstanceOf(Date);
    expect(savedBudget.updated_at).toBeInstanceOf(Date);
  });

  it('should create budget with different periods', async () => {
    const periods = ['weekly', 'monthly', 'yearly'] as const;

    for (const period of periods) {
      const input = {
        ...testInput,
        user_id: userId,
        category_id: categoryId,
        period,
        amount: 100 + Math.random() * 100 // Different amounts to avoid conflicts
      };

      const result = await createBudget(input);
      expect(result.period).toBe(period);
    }
  });

  it('should create budget with decimal amounts', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: categoryId,
      amount: 123.45
    };

    const result = await createBudget(input);

    expect(result.amount).toBe(123.45);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const savedBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(parseFloat(savedBudgets[0].amount)).toBe(123.45);
  });

  it('should handle large amounts correctly', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: categoryId,
      amount: 999999.99
    };

    const result = await createBudget(input);

    expect(result.amount).toBe(999999.99);
    expect(typeof result.amount).toBe('number');
  });

  it('should throw error for non-existent user_id', async () => {
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user
      category_id: categoryId
    };

    await expect(createBudget(input)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should throw error for non-existent category_id', async () => {
    const input = {
      ...testInput,
      user_id: userId,
      category_id: 99999 // Non-existent category
    };

    await expect(createBudget(input)).rejects.toThrow(/foreign key constraint/i);
  });
});