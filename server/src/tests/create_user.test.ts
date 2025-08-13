import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Verify user properties
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different emails', async () => {
    const user1Input: CreateUserInput = {
      name: 'Alice Smith',
      email: 'alice@example.com'
    };

    const user2Input: CreateUserInput = {
      name: 'Bob Johnson',
      email: 'bob@example.com'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    // Verify both users were created with different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('alice@example.com');
    expect(user2.email).toEqual('bob@example.com');

    // Verify both exist in database
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(2);
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create user with same email
    const duplicateInput: CreateUserInput = {
      name: 'Jane Doe',
      email: 'john.doe@example.com' // Same email as testInput
    };

    // Should throw error due to unique constraint on email
    await expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle special characters in name and email', async () => {
    const specialInput: CreateUserInput = {
      name: "O'Connor-Smith",
      email: 'test+special@sub-domain.example.co.uk'
    };

    const result = await createUser(specialInput);

    expect(result.name).toEqual("O'Connor-Smith");
    expect(result.email).toEqual('test+special@sub-domain.example.co.uk');
    expect(result.id).toBeDefined();
  });
});