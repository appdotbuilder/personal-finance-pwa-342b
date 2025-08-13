import { type CreateRecurringTransactionInput, type RecurringTransaction } from '../schema';

export async function createRecurringTransaction(input: CreateRecurringTransactionInput): Promise<RecurringTransaction> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new recurring transaction template.
    return {
        id: 1,
        user_id: input.user_id,
        account_id: input.account_id,
        category_id: input.category_id,
        amount: input.amount,
        description: input.description,
        frequency: input.frequency,
        next_occurrence: input.next_occurrence,
        end_date: input.end_date || null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    } as RecurringTransaction;
}