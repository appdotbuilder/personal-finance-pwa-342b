import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, financialGoalsTable } from '../db/schema';
import { type UpdateFinancialGoalInput } from '../schema';
import { updateFinancialGoal } from '../handlers/update_financial_goal';
import { eq } from 'drizzle-orm';

describe('updateFinancialGoal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testGoalId: number;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create a test financial goal
    const goalResult = await db.insert(financialGoalsTable)
      .values({
        user_id: testUserId,
        name: 'Original Goal',
        target_amount: '10000.00',
        current_amount: '2500.50',
        target_date: '2024-12-31', // Use string format for date column
        status: 'active',
        description: 'Original description'
      })
      .returning()
      .execute();
    
    testGoalId = goalResult[0].id;
  });

  it('should update a financial goal name', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      name: 'Updated Goal Name'
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.name).toEqual('Updated Goal Name');
    expect(result.target_amount).toEqual(10000);
    expect(result.current_amount).toEqual(2500.5);
    expect(result.status).toEqual('active');
    expect(result.target_date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update target amount', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      target_amount: 15000.75
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.name).toEqual('Original Goal');
    expect(result.target_amount).toEqual(15000.75);
    expect(result.current_amount).toEqual(2500.5);
    expect(typeof result.target_amount).toBe('number');
  });

  it('should update current amount', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      current_amount: 5000.25
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.current_amount).toEqual(5000.25);
    expect(result.target_amount).toEqual(10000);
    expect(typeof result.current_amount).toBe('number');
  });

  it('should update goal status', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      status: 'completed'
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.status).toEqual('completed');
    expect(result.name).toEqual('Original Goal');
  });

  it('should update target date', async () => {
    const newDate = new Date('2025-06-15');
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      target_date: newDate
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.target_date).toBeInstanceOf(Date);
    expect(result.target_date?.toISOString().split('T')[0]).toEqual('2025-06-15');
    expect(result.name).toEqual('Original Goal');
  });

  it('should update description', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      description: 'Updated description'
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Original Goal');
  });

  it('should set description to null', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      description: null
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Goal');
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      name: 'Multi-Update Goal',
      target_amount: 20000,
      current_amount: 7500.33,
      status: 'paused',
      description: 'Multiple fields updated'
    };

    const result = await updateFinancialGoal(input);

    expect(result.id).toEqual(testGoalId);
    expect(result.name).toEqual('Multi-Update Goal');
    expect(result.target_amount).toEqual(20000);
    expect(result.current_amount).toEqual(7500.33);
    expect(result.status).toEqual('paused');
    expect(result.description).toEqual('Multiple fields updated');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      name: 'Database Test Goal',
      current_amount: 3333.33
    };

    await updateFinancialGoal(input);

    // Verify the changes were saved to database
    const goals = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.id, testGoalId))
      .execute();

    expect(goals).toHaveLength(1);
    expect(goals[0].name).toEqual('Database Test Goal');
    expect(parseFloat(goals[0].current_amount)).toEqual(3333.33);
    expect(goals[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent goal', async () => {
    const input: UpdateFinancialGoalInput = {
      id: 999999,
      name: 'Non-existent Goal'
    };

    await expect(updateFinancialGoal(input)).rejects.toThrow(/not found/i);
  });

  it('should handle zero amounts correctly', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      current_amount: 0
    };

    const result = await updateFinancialGoal(input);

    expect(result.current_amount).toEqual(0);
    expect(typeof result.current_amount).toBe('number');
  });

  it('should preserve unchanged fields', async () => {
    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      name: 'Only Name Changed'
    };

    const result = await updateFinancialGoal(input);

    // All other fields should remain unchanged
    expect(result.name).toEqual('Only Name Changed');
    expect(result.target_amount).toEqual(10000);
    expect(result.current_amount).toEqual(2500.5);
    expect(result.status).toEqual('active');
    expect(result.description).toEqual('Original description');
    expect(result.target_date).toBeInstanceOf(Date);
    expect(result.user_id).toEqual(testUserId);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalGoal = await db.select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.id, testGoalId))
      .execute();

    const originalTimestamp = originalGoal[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFinancialGoalInput = {
      id: testGoalId,
      name: 'Timestamp Test'
    };

    const result = await updateFinancialGoal(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });
});