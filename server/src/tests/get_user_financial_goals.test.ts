import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, financialGoalsTable } from '../db/schema';
import { type CreateUserInput, type CreateFinancialGoalInput } from '../schema';
import { getUserFinancialGoals } from '../handlers/get_user_financial_goals';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

const testGoal1: CreateFinancialGoalInput = {
  user_id: 1, // Will be set after user creation
  name: 'Emergency Fund',
  target_amount: 10000.00,
  target_date: new Date('2024-12-31'),
  description: 'Build emergency fund for 6 months expenses'
};

const testGoal2: CreateFinancialGoalInput = {
  user_id: 1, // Will be set after user creation
  name: 'Vacation Fund',
  target_amount: 5000.50,
  description: 'Save for European vacation'
};

describe('getUserFinancialGoals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return financial goals for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test goals
    await db.insert(financialGoalsTable)
      .values([
        {
          user_id: userId,
          name: testGoal1.name,
          target_amount: testGoal1.target_amount.toString(),
          target_date: testGoal1.target_date ? testGoal1.target_date.toISOString().split('T')[0] : null,
          description: testGoal1.description || null
        },
        {
          user_id: userId,
          name: testGoal2.name,
          target_amount: testGoal2.target_amount.toString(),
          target_date: testGoal2.target_date ? testGoal2.target_date.toISOString().split('T')[0] : null,
          description: testGoal2.description || null
        }
      ])
      .execute();

    // Test the handler
    const result = await getUserFinancialGoals(userId);

    expect(result).toHaveLength(2);
    
    // Verify first goal
    const goal1 = result.find(g => g.name === 'Emergency Fund');
    expect(goal1).toBeDefined();
    expect(goal1!.user_id).toEqual(userId);
    expect(goal1!.target_amount).toEqual(10000.00);
    expect(typeof goal1!.target_amount).toBe('number');
    expect(goal1!.current_amount).toEqual(0);
    expect(typeof goal1!.current_amount).toBe('number');
    expect(goal1!.status).toEqual('active');
    expect(goal1!.description).toEqual('Build emergency fund for 6 months expenses');
    expect(goal1!.target_date).toEqual(new Date('2024-12-31'));
    expect(goal1!.created_at).toBeInstanceOf(Date);
    expect(goal1!.updated_at).toBeInstanceOf(Date);

    // Verify second goal
    const goal2 = result.find(g => g.name === 'Vacation Fund');
    expect(goal2).toBeDefined();
    expect(goal2!.target_amount).toEqual(5000.50);
    expect(goal2!.current_amount).toEqual(0);
    expect(goal2!.target_date).toBeNull();
    expect(goal2!.description).toEqual('Save for European vacation');
  });

  it('should return empty array for user with no financial goals', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test the handler without creating any goals
    const result = await getUserFinancialGoals(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return goals only for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com'
      })
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create goals for both users
    await db.insert(financialGoalsTable)
      .values([
        {
          user_id: user1Id,
          name: 'User 1 Goal',
          target_amount: '1000.00',
          target_date: null,
          description: null
        },
        {
          user_id: user2Id,
          name: 'User 2 Goal',
          target_amount: '2000.00',
          target_date: null,
          description: null
        }
      ])
      .execute();

    // Test that each user gets only their own goals
    const user1Goals = await getUserFinancialGoals(user1Id);
    const user2Goals = await getUserFinancialGoals(user2Id);

    expect(user1Goals).toHaveLength(1);
    expect(user1Goals[0].name).toEqual('User 1 Goal');
    expect(user1Goals[0].user_id).toEqual(user1Id);

    expect(user2Goals).toHaveLength(1);
    expect(user2Goals[0].name).toEqual('User 2 Goal');
    expect(user2Goals[0].user_id).toEqual(user2Id);
  });

  it('should handle goals with various statuses and amounts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create goals with different statuses and current amounts
    await db.insert(financialGoalsTable)
      .values([
        {
          user_id: userId,
          name: 'Active Goal',
          target_amount: '1000.00',
          current_amount: '250.75',
          status: 'active',
          target_date: null,
          description: null
        },
        {
          user_id: userId,
          name: 'Completed Goal',
          target_amount: '500.00',
          current_amount: '500.00',
          status: 'completed',
          target_date: null,
          description: null
        },
        {
          user_id: userId,
          name: 'Paused Goal',
          target_amount: '2000.00',
          current_amount: '100.25',
          status: 'paused',
          target_date: null,
          description: null
        }
      ])
      .execute();

    // Test the handler
    const result = await getUserFinancialGoals(userId);

    expect(result).toHaveLength(3);

    // Find and verify each goal
    const activeGoal = result.find(g => g.name === 'Active Goal');
    expect(activeGoal!.status).toEqual('active');
    expect(activeGoal!.target_amount).toEqual(1000.00);
    expect(activeGoal!.current_amount).toEqual(250.75);

    const completedGoal = result.find(g => g.name === 'Completed Goal');
    expect(completedGoal!.status).toEqual('completed');
    expect(completedGoal!.target_amount).toEqual(500.00);
    expect(completedGoal!.current_amount).toEqual(500.00);

    const pausedGoal = result.find(g => g.name === 'Paused Goal');
    expect(pausedGoal!.status).toEqual('paused');
    expect(pausedGoal!.target_amount).toEqual(2000.00);
    expect(pausedGoal!.current_amount).toEqual(100.25);
  });

  it('should verify database isolation between tests', async () => {
    // Verify that the database is clean at the start of each test
    const allGoals = await db.select()
      .from(financialGoalsTable)
      .execute();
    
    expect(allGoals).toHaveLength(0);

    const allUsers = await db.select()
      .from(usersTable)
      .execute();
    
    expect(allUsers).toHaveLength(0);
  });
});