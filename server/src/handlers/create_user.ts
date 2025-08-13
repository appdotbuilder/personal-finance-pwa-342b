import { type CreateUserInput, type User } from '../schema';

export async function createUser(input: CreateUserInput): Promise<User> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user and persisting it in the database.
    return {
        id: 1,
        name: input.name,
        email: input.email,
        created_at: new Date(),
        updated_at: new Date()
    } as User;
}