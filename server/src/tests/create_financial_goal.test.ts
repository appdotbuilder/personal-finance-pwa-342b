import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { financialGoalsTable, usersTable } from '../db/schema';
import { type CreateFinancialGoalInput } from '../schema';
import { createFinancialGoal } from '../handlers/create_financial_goal';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

// Simple test input
const testInput: CreateFinancialGoalInput = {
  user_id: 1,
  name: 'Emergency Fund',
  target_amount: 10000.50,
  target_date: new Date('2024-12-31'),
  description: 'Save for 6 months of expenses'
};

describe('createFinancialGoal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a financial goal', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createFinancialGoal(testInput);

    // Basic field validation
    expect(result.name).toEqual('Emergency Fund');
    expect(result.user_id).toEqual(1);
    expect(result.target_amount).toEqual(10000.50);
    expect(typeof result.target_amount).toEqual('number');
    expect(result.current_amount).toEqual(0);
    expect(typeof result.current_amount).toEqual('number');
    expect(result.target_date).toBeInstanceOf(Date);
    expect(result.target_date?.toISOString().split('T')[0]).toEqual('2024-12-31');
    expect(result.status).toEqual('active');
    expect(result.description).toEqual('Save for 6 months of expenses');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save financial goal to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createFinancialGoal(testInput);

    // Query database to verify storage
    const goals = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.id, result.id))
      .execute();

    expect(goals).toHaveLength(1);
    expect(goals[0].name).toEqual('Emergency Fund');
    expect(goals[0].user_id).toEqual(1);
    expect(parseFloat(goals[0].target_amount)).toEqual(10000.50);
    expect(parseFloat(goals[0].current_amount)).toEqual(0);
    expect(goals[0].status).toEqual('active');
    expect(goals[0].description).toEqual('Save for 6 months of expenses');
    expect(goals[0].target_date).toEqual('2024-12-31'); // Date stored as string in database
    expect(goals[0].created_at).toBeInstanceOf(Date);
    expect(goals[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create financial goal without optional fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const minimalInput: CreateFinancialGoalInput = {
      user_id: 1,
      name: 'Vacation Fund',
      target_amount: 5000
    };

    const result = await createFinancialGoal(minimalInput);

    expect(result.name).toEqual('Vacation Fund');
    expect(result.target_amount).toEqual(5000);
    expect(typeof result.target_amount).toEqual('number');
    expect(result.current_amount).toEqual(0);
    expect(result.target_date).toBeNull();
    expect(result.description).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
  });

  it('should handle large target amounts correctly', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const largeAmountInput: CreateFinancialGoalInput = {
      user_id: 1,
      name: 'House Down Payment',
      target_amount: 250000.99
    };

    const result = await createFinancialGoal(largeAmountInput);

    expect(result.target_amount).toEqual(250000.99);
    expect(typeof result.target_amount).toEqual('number');

    // Verify in database
    const goals = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.id, result.id))
      .execute();

    expect(parseFloat(goals[0].target_amount)).toEqual(250000.99);
  });

  it('should reject creation for non-existent user', async () => {
    const invalidInput: CreateFinancialGoalInput = {
      user_id: 999,
      name: 'Invalid Goal',
      target_amount: 1000
    };

    await expect(createFinancialGoal(invalidInput)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should handle decimal precision correctly', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const precisionInput: CreateFinancialGoalInput = {
      user_id: 1,
      name: 'Precision Test',
      target_amount: 123.45
    };

    const result = await createFinancialGoal(precisionInput);

    expect(result.target_amount).toEqual(123.45);
    expect(typeof result.target_amount).toEqual('number');

    // Verify precision is maintained in database
    const goals = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.id, result.id))
      .execute();

    expect(parseFloat(goals[0].target_amount)).toEqual(123.45);
  });

  it('should set default values correctly', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    const result = await createFinancialGoal({
      user_id: 1,
      name: 'Default Test',
      target_amount: 1000
    });

    // Verify defaults from schema
    expect(result.current_amount).toEqual(0); // Default from database
    expect(result.status).toEqual('active'); // Default from database
    expect(result.target_date).toBeNull();
    expect(result.description).toBeNull();
  });
});