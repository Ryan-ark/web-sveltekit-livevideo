import type { tasks } from '$server/db/schema';

export type TaskRecord = typeof tasks.$inferSelect;
export type NewTaskRecord = typeof tasks.$inferInsert;
