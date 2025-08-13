import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, accountsTable } from '../db/schema';
import { type CreateUserInput, type CreateAccountInput } from '../schema';
import { getUserAccounts } from '../handlers/get_user_accounts';

describe('getUserAccounts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all accounts for a user', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create test accounts
    await db.insert(accountsTable)
      .values([
        {
          user_id: user.id,
          name: 'Checking Account',
          type: 'checking',
          balance: '1000.50',
          description: 'Primary checking account'
        },
        {
          user_id: user.id,
          name: 'Savings Account',
          type: 'savings',
          balance: '5000.00',
          description: 'Emergency savings'
        }
      ])
      .execute();

    const result = await getUserAccounts(user.id);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].name).toEqual('Checking Account');
    expect(result[0].type).toEqual('checking');
    expect(result[0].balance).toEqual(1000.50);
    expect(typeof result[0].balance).toBe('number');
    expect(result[0].description).toEqual('Primary checking account');
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].user_id).toEqual(user.id);
    expect(result[1].name).toEqual('Savings Account');
    expect(result[1].type).toEqual('savings');
    expect(result[1].balance).toEqual(5000.00);
    expect(typeof result[1].balance).toBe('number');
    expect(result[1].description).toEqual('Emergency savings');
  });

  it('should return empty array for user with no accounts', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'User Without Accounts',
        email: 'noaccounts@example.com'
      })
      .returning()
      .execute();

    const result = await getUserAccounts(user.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return only accounts for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        name: 'User One',
        email: 'user1@example.com'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        name: 'User Two',
        email: 'user2@example.com'
      })
      .returning()
      .execute();

    // Create accounts for both users
    await db.insert(accountsTable)
      .values([
        {
          user_id: user1.id,
          name: 'User1 Checking',
          type: 'checking',
          balance: '1000.00',
          description: null
        },
        {
          user_id: user2.id,
          name: 'User2 Checking',
          type: 'checking',
          balance: '2000.00',
          description: null
        },
        {
          user_id: user1.id,
          name: 'User1 Savings',
          type: 'savings',
          balance: '3000.00',
          description: null
        }
      ])
      .execute();

    const result = await getUserAccounts(user1.id);

    expect(result).toHaveLength(2);
    result.forEach(account => {
      expect(account.user_id).toEqual(user1.id);
    });

    const user1AccountNames = result.map(a => a.name);
    expect(user1AccountNames).toContain('User1 Checking');
    expect(user1AccountNames).toContain('User1 Savings');
    expect(user1AccountNames).not.toContain('User2 Checking');
  });

  it('should handle different account types correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        name: 'Multi Account User',
        email: 'multi@example.com'
      })
      .returning()
      .execute();

    // Create accounts of different types
    await db.insert(accountsTable)
      .values([
        {
          user_id: user.id,
          name: 'Checking',
          type: 'checking',
          balance: '1000.00',
          description: null
        },
        {
          user_id: user.id,
          name: 'Savings',
          type: 'savings',
          balance: '5000.00',
          description: null
        },
        {
          user_id: user.id,
          name: 'Credit Card',
          type: 'credit_card',
          balance: '-500.50',
          description: null
        },
        {
          user_id: user.id,
          name: 'Investment',
          type: 'investment',
          balance: '10000.75',
          description: null
        }
      ])
      .execute();

    const result = await getUserAccounts(user.id);

    expect(result).toHaveLength(4);
    
    const accountTypes = result.map(a => a.type);
    expect(accountTypes).toContain('checking');
    expect(accountTypes).toContain('savings');
    expect(accountTypes).toContain('credit_card');
    expect(accountTypes).toContain('investment');

    // Verify negative balance handling
    const creditCard = result.find(a => a.type === 'credit_card');
    expect(creditCard?.balance).toEqual(-500.50);
    expect(typeof creditCard?.balance).toBe('number');
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getUserAccounts(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});