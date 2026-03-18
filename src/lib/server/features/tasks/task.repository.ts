import { asc, eq } from 'drizzle-orm';

import { getDb } from '$server/db/client';
import { tasks } from '$server/db/schema';

export const taskRepository = {
	async findByProjectId(projectId: string) {
		const db = getDb();

		return db.query.tasks.findMany({
			where: eq(tasks.projectId, projectId),
			orderBy: [asc(tasks.createdAt)]
		});
	},

	async insert(input: { projectId: string; title: string; details: string }) {
		const db = getDb();

		const [created] = await db
			.insert(tasks)
			.values({
				projectId: input.projectId,
				title: input.title,
				details: input.details || null
			})
			.returning();

		return created;
	},

	async update(input: {
		id: string;
		projectId: string;
		title: string;
		details: string;
		completed: boolean;
	}) {
		const db = getDb();

		const [updated] = await db
			.update(tasks)
			.set({
				title: input.title,
				details: input.details || null,
				completed: input.completed,
				updatedAt: new Date()
			})
			.where(eq(tasks.id, input.id))
			.returning();

		return updated ?? null;
	},

	async delete(taskId: string) {
		const db = getDb();
		const [deleted] = await db
			.delete(tasks)
			.where(eq(tasks.id, taskId))
			.returning();
		return deleted ?? null;
	}
};
