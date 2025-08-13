import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsTable, usersTable } from '../db/schema';
import { type CreateAccountInput } from '../schema';
import { createAccount } from '../handlers/create_account';
import { eq } from 'drizzle-orm';

describe('createAccount', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });
  
  afterEach(resetDB);

  it('should create a checking account with all fields', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'Main Checking',
      type: 'checking',
      balance: 1500.50,
      description: 'Primary checking account'
    };

    const result = await createAccount(testInput);

    // Verify all fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Main Checking');
    expect(result.type).toEqual('checking');
    expect(result.balance).toEqual(1500.50);
    expect(typeof result.balance).toBe('number');
    expect(result.description).toEqual('Primary checking account');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create account without description (optional field)', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'Savings Account',
      type: 'savings',
      balance: 5000.00
    };

    const result = await createAccount(testInput);

    expect(result.name).toEqual('Savings Account');
    expect(result.type).toEqual('savings');
    expect(result.balance).toEqual(5000.00);
    expect(result.description).toBeNull();
  });

  it('should save account to database correctly', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'Investment Account',
      type: 'investment',
      balance: 25000.99,
      description: 'Long-term investments'
    };

    const result = await createAccount(testInput);

    // Query the database to verify the record was saved
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, result.id))
      .execute();

    expect(accounts).toHaveLength(1);
    const dbAccount = accounts[0];
    
    expect(dbAccount.user_id).toEqual(testUserId);
    expect(dbAccount.name).toEqual('Investment Account');
    expect(dbAccount.type).toEqual('investment');
    expect(parseFloat(dbAccount.balance)).toEqual(25000.99); // DB stores as string
    expect(dbAccount.description).toEqual('Long-term investments');
    expect(dbAccount.created_at).toBeInstanceOf(Date);
    expect(dbAccount.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different account types', async () => {
    const accountTypes = [
      'checking',
      'savings', 
      'credit_card',
      'investment',
      'cash',
      'loan'
    ] as const;

    for (const accountType of accountTypes) {
      const testInput: CreateAccountInput = {
        user_id: testUserId,
        name: `${accountType} account`,
        type: accountType,
        balance: 1000.00
      };

      const result = await createAccount(testInput);
      expect(result.type).toEqual(accountType);
      expect(result.name).toEqual(`${accountType} account`);
    }
  });

  it('should handle zero balance', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'New Account',
      type: 'checking',
      balance: 0.00
    };

    const result = await createAccount(testInput);
    expect(result.balance).toEqual(0.00);
    expect(typeof result.balance).toBe('number');
  });

  it('should handle negative balance (for loan accounts)', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'Credit Card Debt',
      type: 'credit_card',
      balance: -500.75
    };

    const result = await createAccount(testInput);
    expect(result.balance).toEqual(-500.75);
    expect(typeof result.balance).toBe('number');
  });

  it('should handle high precision decimal amounts', async () => {
    const testInput: CreateAccountInput = {
      user_id: testUserId,
      name: 'Precise Account',
      type: 'savings',
      balance: 1234.56
    };

    const result = await createAccount(testInput);
    expect(result.balance).toEqual(1234.56);
  });

  it('should throw error for non-existent user_id', async () => {
    const testInput: CreateAccountInput = {
      user_id: 99999, // Non-existent user ID
      name: 'Invalid Account',
      type: 'checking',
      balance: 100.00
    };

    expect(createAccount(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});