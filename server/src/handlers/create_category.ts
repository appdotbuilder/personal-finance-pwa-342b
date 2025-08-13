import { db } from '../db';
import { categoriesTable, usersTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    // Verify the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // If parent_category_id is provided, verify it exists and belongs to the same user
    if (input.parent_category_id) {
      const parentCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.parent_category_id))
        .execute();

      if (parentCategory.length === 0) {
        throw new Error(`Parent category with id ${input.parent_category_id} not found`);
      }

      if (parentCategory[0].user_id !== input.user_id) {
        throw new Error(`Parent category does not belong to user ${input.user_id}`);
      }
    }

    // Insert the category
    const result = await db.insert(categoriesTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        type: input.type,
        color: input.color || null,
        parent_category_id: input.parent_category_id || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
}