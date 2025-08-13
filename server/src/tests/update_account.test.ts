import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { accountsTable, usersTable } from '../db/schema';
import { type UpdateAccountInput, type CreateUserInput, type CreateAccountInput } from '../schema';
import { updateAccount } from '../handlers/update_account';
import { eq } from 'drizzle-orm';

// Test user input
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

// Test account input
const testAccount: CreateAccountInput = {
  user_id: 1, // Will be set after user creation
  name: 'Test Account',
  type: 'checking',
  balance: 1000.00,
  description: 'Original description'
};

describe('updateAccount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let accountId: number;

  beforeEach(async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email
      })
      .returning()
      .execute();

    userId = userResult[0].id;

    // Create account
    const accountResult = await db.insert(accountsTable)
      .values({
        user_id: userId,
        name: testAccount.name,
        type: testAccount.type,
        balance: testAccount.balance.toString(),
        description: testAccount.description
      })
      .returning()
      .execute();

    accountId = accountResult[0].id;
  });

  it('should update account name', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      name: 'Updated Account Name'
    };

    const result = await updateAccount(updateInput);

    expect(result.id).toEqual(accountId);
    expect(result.name).toEqual('Updated Account Name');
    expect(result.balance).toEqual(1000.00); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.balance === 'number').toBe(true);
  });

  it('should update account balance', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      balance: 2500.75
    };

    const result = await updateAccount(updateInput);

    expect(result.id).toEqual(accountId);
    expect(result.balance).toEqual(2500.75);
    expect(result.name).toEqual('Test Account'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(typeof result.balance === 'number').toBe(true);
  });

  it('should update account description', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      description: 'Updated description'
    };

    const result = await updateAccount(updateInput);

    expect(result.id).toEqual(accountId);
    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Test Account'); // Should remain unchanged
    expect(result.balance).toEqual(1000.00); // Should remain unchanged
  });

  it('should update account description to null', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      description: null
    };

    const result = await updateAccount(updateInput);

    expect(result.id).toEqual(accountId);
    expect(result.description).toBeNull();
    expect(result.name).toEqual('Test Account'); // Should remain unchanged
    expect(result.balance).toEqual(1000.00); // Should remain unchanged
  });

  it('should update multiple fields simultaneously', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      name: 'Multi Update Account',
      balance: 3000.25,
      description: 'Multi field update'
    };

    const result = await updateAccount(updateInput);

    expect(result.id).toEqual(accountId);
    expect(result.name).toEqual('Multi Update Account');
    expect(result.balance).toEqual(3000.25);
    expect(result.description).toEqual('Multi field update');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.balance === 'number').toBe(true);
  });

  it('should save updated account to database', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      name: 'DB Test Account',
      balance: 1500.50
    };

    await updateAccount(updateInput);

    // Verify the account was updated in the database
    const accounts = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId))
      .execute();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toEqual('DB Test Account');
    expect(parseFloat(accounts[0].balance)).toEqual(1500.50);
    expect(accounts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero balance update', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      balance: 0
    };

    const result = await updateAccount(updateInput);

    expect(result.balance).toEqual(0);
    expect(typeof result.balance === 'number').toBe(true);
  });

  it('should handle negative balance update', async () => {
    const updateInput: UpdateAccountInput = {
      id: accountId,
      balance: -500.25
    };

    const result = await updateAccount(updateInput);

    expect(result.balance).toEqual(-500.25);
    expect(typeof result.balance === 'number').toBe(true);
  });

  it('should throw error when account not found', async () => {
    const updateInput: UpdateAccountInput = {
      id: 99999, // Non-existent account ID
      name: 'Non-existent Account'
    };

    await expect(updateAccount(updateInput)).rejects.toThrow(/Account with id 99999 not found/i);
  });

  it('should update updated_at timestamp', async () => {
    // Get original updated_at
    const originalAccount = await db.select()
      .from(accountsTable)
      .where(eq(accountsTable.id, accountId))
      .execute();

    const originalUpdatedAt = originalAccount[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateAccountInput = {
      id: accountId,
      name: 'Timestamp Test Account'
    };

    const result = await updateAccount(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});