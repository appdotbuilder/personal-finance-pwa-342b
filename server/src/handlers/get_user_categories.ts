import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserCategories(userId: number): Promise<Category[]> {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user categories:', error);
    throw error;
  }
}