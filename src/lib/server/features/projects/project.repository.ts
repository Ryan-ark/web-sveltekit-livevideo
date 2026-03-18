import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb } from '$server/db/client';
import { projects, tasks } from '$server/db/schema';

export const projectRepository = {
	async findAll() {
		const db = getDb();

		return db.query.projects.findMany({
			orderBy: [desc(projects.createdAt)],
			with: {
				tasks: {
					orderBy: [desc(tasks.createdAt)]
				}
			}
		});
	},

	async findById(projectId: string) {
		const db = getDb();

		return db.query.projects.findFirst({
			where: eq(projects.id, projectId),
			with: {
				tasks: {
					orderBy: [desc(tasks.createdAt)]
				}
			}
		});
	},

	async insert(input: {
		name: string;
		description: string;
		status: 'active' | 'paused' | 'archived';
	}) {
		const db = getDb();

		const [created] = await db
			.insert(projects)
			.values({
				name: input.name,
				description: input.description || null,
				status: input.status
			})
			.returning();

		return created;
	},

	async update(input: {
		id: string;
		name: string;
		description: string;
		status: 'active' | 'paused' | 'archived';
	}) {
		const db = getDb();

		const [updated] = await db
			.update(projects)
			.set({
				name: input.name,
				description: input.description || null,
				status: input.status,
				updatedAt: new Date()
			})
			.where(eq(projects.id, input.id))
			.returning();

		return updated ?? null;
	},

	async delete(projectId: string) {
		const db = getDb();

		const [deleted] = await db
			.delete(projects)
			.where(eq(projects.id, projectId))
			.returning();
		return deleted ?? null;
	},

	async getSummary() {
		const db = getDb();

		const [summary] = await db
			.select({
				totalProjects: sql<number>`count(*)::int`,
				activeProjects: sql<number>`count(*) filter (where ${projects.status} = 'active')::int`,
				totalTasks: sql<number>`(
					select count(*)::int from ${tasks}
				)`,
				completedTasks: sql<number>`(
					select count(*)::int from ${tasks} where ${tasks.completed} = true
				)`
			})
			.from(projects);

		return (
			summary ?? {
				totalProjects: 0,
				activeProjects: 0,
				totalTasks: 0,
				completedTasks: 0
			}
		);
	},

	async exists(projectId: string) {
		const db = getDb();

		const [project] = await db
			.select({ id: projects.id })
			.from(projects)
			.where(and(eq(projects.id, projectId)))
			.limit(1);

		return Boolean(project);
	}
};
