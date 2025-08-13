import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { getUserCategories } from '../handlers/get_user_categories';

describe('getUserCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all categories for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test categories for the user
    const categoryData = [
      {
        user_id: userId,
        name: 'Groceries',
        type: 'expense' as const,
        color: '#FF5733'
      },
      {
        user_id: userId,
        name: 'Salary',
        type: 'income' as const,
        color: '#33FF57'
      },
      {
        user_id: userId,
        name: 'Entertainment',
        type: 'expense' as const
      }
    ];

    await db.insert(categoriesTable)
      .values(categoryData)
      .execute();

    // Get categories
    const categories = await getUserCategories(userId);

    // Verify results
    expect(categories).toHaveLength(3);
    
    // Check each category has correct structure
    categories.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.user_id).toBe(userId);
      expect(category.name).toBeDefined();
      expect(category.type).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
      expect(['income', 'expense']).toContain(category.type);
    });

    // Check specific categories exist
    const categoryNames = categories.map(c => c.name);
    expect(categoryNames).toContain('Groceries');
    expect(categoryNames).toContain('Salary');
    expect(categoryNames).toContain('Entertainment');

    // Check category types
    const groceryCategory = categories.find(c => c.name === 'Groceries');
    expect(groceryCategory?.type).toBe('expense');
    expect(groceryCategory?.color).toBe('#FF5733');

    const salaryCategory = categories.find(c => c.name === 'Salary');
    expect(salaryCategory?.type).toBe('income');
    expect(salaryCategory?.color).toBe('#33FF57');

    const entertainmentCategory = categories.find(c => c.name === 'Entertainment');
    expect(entertainmentCategory?.type).toBe('expense');
    expect(entertainmentCategory?.color).toBeNull();
  });

  it('should return empty array for user with no categories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Get categories (should be empty)
    const categories = await getUserCategories(userId);

    expect(categories).toHaveLength(0);
    expect(categories).toEqual([]);
  });

  it('should only return categories for specified user', async () => {
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

    // Create categories for both users
    await db.insert(categoriesTable)
      .values([
        {
          user_id: user1Id,
          name: 'User 1 Category',
          type: 'expense' as const
        },
        {
          user_id: user2Id,
          name: 'User 2 Category',
          type: 'income' as const
        }
      ])
      .execute();

    // Get categories for user 1
    const user1Categories = await getUserCategories(user1Id);

    // Should only return user 1's categories
    expect(user1Categories).toHaveLength(1);
    expect(user1Categories[0].name).toBe('User 1 Category');
    expect(user1Categories[0].user_id).toBe(user1Id);
    expect(user1Categories[0].type).toBe('expense');

    // Get categories for user 2
    const user2Categories = await getUserCategories(user2Id);

    // Should only return user 2's categories
    expect(user2Categories).toHaveLength(1);
    expect(user2Categories[0].name).toBe('User 2 Category');
    expect(user2Categories[0].user_id).toBe(user2Id);
    expect(user2Categories[0].type).toBe('income');
  });

  it('should handle categories with parent-child relationships', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create parent category
    const parentCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Transportation',
        type: 'expense' as const
      })
      .returning()
      .execute();

    const parentCategoryId = parentCategoryResult[0].id;

    // Create subcategory
    await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Gas',
        type: 'expense' as const,
        parent_category_id: parentCategoryId
      })
      .execute();

    // Get all categories
    const categories = await getUserCategories(userId);

    expect(categories).toHaveLength(2);

    const parentCategory = categories.find(c => c.name === 'Transportation');
    const subCategory = categories.find(c => c.name === 'Gas');

    expect(parentCategory?.parent_category_id).toBeNull();
    expect(subCategory?.parent_category_id).toBe(parentCategoryId);
  });

  it('should return categories with all required fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create category with all fields
    await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'income' as const,
        color: '#FFFFFF'
      })
      .execute();

    const categories = await getUserCategories(userId);

    expect(categories).toHaveLength(1);
    const category = categories[0];

    // Verify all required fields are present and have correct types
    expect(typeof category.id).toBe('number');
    expect(typeof category.user_id).toBe('number');
    expect(typeof category.name).toBe('string');
    expect(['income', 'expense']).toContain(category.type);
    expect(category.color === null || typeof category.color === 'string').toBe(true);
    expect(category.parent_category_id === null || typeof category.parent_category_id === 'number').toBe(true);
    expect(category.created_at).toBeInstanceOf(Date);
  });
});