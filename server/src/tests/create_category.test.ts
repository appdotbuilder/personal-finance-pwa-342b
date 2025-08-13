import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user for all tests
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  it('should create a basic income category', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Salary',
      type: 'income'
    };

    const result = await createCategory(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Salary');
    expect(result.type).toEqual('income');
    expect(result.color).toBeNull();
    expect(result.parent_category_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a basic expense category', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Groceries',
      type: 'expense'
    };

    const result = await createCategory(input);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Groceries');
    expect(result.type).toEqual('expense');
    expect(result.color).toBeNull();
    expect(result.parent_category_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category with color', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Entertainment',
      type: 'expense',
      color: '#FF5733'
    };

    const result = await createCategory(input);

    expect(result.name).toEqual('Entertainment');
    expect(result.type).toEqual('expense');
    expect(result.color).toEqual('#FF5733');
  });

  it('should create a subcategory with valid parent', async () => {
    // First create a parent category
    const parentInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Food',
      type: 'expense'
    };
    const parentCategory = await createCategory(parentInput);

    // Then create a subcategory
    const subcategoryInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Restaurants',
      type: 'expense',
      parent_category_id: parentCategory.id
    };

    const result = await createCategory(subcategoryInput);

    expect(result.name).toEqual('Restaurants');
    expect(result.type).toEqual('expense');
    expect(result.parent_category_id).toEqual(parentCategory.id);
  });

  it('should save category to database', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Investment Income',
      type: 'income',
      color: '#00AA00'
    };

    const result = await createCategory(input);

    // Verify it's actually saved in the database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Investment Income');
    expect(categories[0].type).toEqual('income');
    expect(categories[0].color).toEqual('#00AA00');
    expect(categories[0].user_id).toEqual(testUserId);
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateCategoryInput = {
      user_id: 99999, // Non-existent user ID
      name: 'Test Category',
      type: 'expense'
    };

    await expect(createCategory(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error for non-existent parent category', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Subcategory',
      type: 'expense',
      parent_category_id: 99999 // Non-existent parent category ID
    };

    await expect(createCategory(input)).rejects.toThrow(/Parent category with id 99999 not found/i);
  });

  it('should throw error when parent category belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        name: 'Other User',
        email: 'other@example.com'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create a category for the other user
    const otherUserCategoryInput: CreateCategoryInput = {
      user_id: otherUserId,
      name: 'Other User Category',
      type: 'expense'
    };
    const otherUserCategory = await createCategory(otherUserCategoryInput);

    // Try to create a subcategory for testUser with otherUser's category as parent
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Invalid Subcategory',
      type: 'expense',
      parent_category_id: otherUserCategory.id
    };

    await expect(createCategory(input)).rejects.toThrow(/Parent category does not belong to user/i);
  });

  it('should create multiple categories for the same user', async () => {
    const inputs: CreateCategoryInput[] = [
      {
        user_id: testUserId,
        name: 'Salary',
        type: 'income'
      },
      {
        user_id: testUserId,
        name: 'Freelance',
        type: 'income'
      },
      {
        user_id: testUserId,
        name: 'Utilities',
        type: 'expense'
      }
    ];

    const results = await Promise.all(inputs.map(input => createCategory(input)));

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(testUserId);
      expect(result.name).toEqual(inputs[index].name);
      expect(result.type).toEqual(inputs[index].type);
    });

    // Verify all categories are saved in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, testUserId))
      .execute();

    expect(allCategories).toHaveLength(3);
  });

  it('should handle null values correctly', async () => {
    const input: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Basic Category',
      type: 'expense',
      color: null,
      parent_category_id: null
    };

    const result = await createCategory(input);

    expect(result.color).toBeNull();
    expect(result.parent_category_id).toBeNull();
  });
});