import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, categoriesTable } from '../db/schema';
import { type UpdateBudgetInput, type CreateUserInput, type CreateCategoryInput, type CreateBudgetInput } from '../schema';
import { updateBudget } from '../handlers/update_budget';
import { eq } from 'drizzle-orm';

describe('updateBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testBudgetId: number;

  beforeEach(async () => {
    // Create test user
    const userInput: CreateUserInput = {
      name: 'Test User',
      email: 'test@example.com'
    };

    const userResult = await db.insert(usersTable)
      .values({
        name: userInput.name,
        email: userInput.email
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test category
    const categoryInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Test Category',
      type: 'expense'
    };

    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: categoryInput.user_id,
        name: categoryInput.name,
        type: categoryInput.type
      })
      .returning()
      .execute();

    testCategoryId = categoryResult[0].id;

    // Create test budget
    const budgetInput: CreateBudgetInput = {
      user_id: testUserId,
      category_id: testCategoryId,
      amount: 500.00,
      period: 'monthly',
      start_date: new Date('2024-01-01')
    };

    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: budgetInput.user_id,
        category_id: budgetInput.category_id,
        amount: budgetInput.amount.toString(),
        period: budgetInput.period,
        start_date: budgetInput.start_date.toISOString().split('T')[0] // Convert to date string
      })
      .returning()
      .execute();

    testBudgetId = budgetResult[0].id;
  });

  it('should update budget amount', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      amount: 750.50
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.amount).toEqual(750.50);
    expect(typeof result.amount).toBe('number');
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.period).toEqual('monthly');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update budget period', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      period: 'weekly'
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.period).toEqual('weekly');
    expect(result.amount).toEqual(500.00); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update budget dates', async () => {
    const newStartDate = new Date('2024-02-01');
    const newEndDate = new Date('2024-12-31');

    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      start_date: newStartDate,
      end_date: newEndDate
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.start_date).toEqual(newStartDate);
    expect(result.end_date).toEqual(newEndDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields simultaneously', async () => {
    const newStartDate = new Date('2024-03-01');
    const newEndDate = new Date('2024-12-31');

    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      amount: 1200.75,
      period: 'yearly',
      start_date: newStartDate,
      end_date: newEndDate
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.amount).toEqual(1200.75);
    expect(typeof result.amount).toBe('number');
    expect(result.period).toEqual('yearly');
    expect(result.start_date).toEqual(newStartDate);
    expect(result.end_date).toEqual(newEndDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set end_date to null when explicitly provided', async () => {
    // First set an end_date
    await db.update(budgetsTable)
      .set({ end_date: '2024-12-31' })
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      end_date: null
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.end_date).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated budget to database', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      amount: 999.99,
      period: 'weekly'
    };

    await updateBudget(updateInput);

    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(parseFloat(budgets[0].amount)).toEqual(999.99);
    expect(budgets[0].period).toEqual('weekly');
    expect(budgets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp even with no other changes', async () => {
    // Get original updated_at
    const originalBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    const originalUpdatedAt = originalBudgets[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateBudgetInput = {
      id: testBudgetId
    };

    const result = await updateBudget(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent budget', async () => {
    const updateInput: UpdateBudgetInput = {
      id: 99999,
      amount: 100.00
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/Budget with id 99999 not found/i);
  });

  it('should handle decimal precision correctly', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      amount: 123.45 // Test precision handling (2 decimal places to match schema)
    };

    const result = await updateBudget(updateInput);

    expect(result.amount).toEqual(123.45);
    expect(typeof result.amount).toBe('number');

    // Verify precision is maintained in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    expect(parseFloat(budgets[0].amount)).toEqual(123.45);
  });
});