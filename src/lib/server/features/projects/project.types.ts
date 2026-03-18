import type { projects } from '$server/db/schema';

export type ProjectRecord = typeof projects.$inferSelect;
export type NewProjectRecord = typeof projects.$inferInsert;

export interface ProjectFormShape {
	name: string;
	description: string;
	status: 'active' | 'paused' | 'archived';
}

export interface ProjectSummary {
	totalProjects: number;
	activeProjects: number;
	totalTasks: number;
	completedTasks: number;
}
