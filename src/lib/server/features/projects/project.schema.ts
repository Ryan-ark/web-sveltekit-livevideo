import { z } from 'zod';

import { projectStatuses } from '$config/app';

const descriptionSchema = z
	.string()
	.trim()
	.max(500, 'Description must be 500 characters or fewer.')
	.default('');

export const projectIdSchema = z.uuid();

export const createProjectSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Project name must be at least 2 characters.')
		.max(120),
	description: descriptionSchema,
	status: z.enum(projectStatuses).default('active')
});

export const updateProjectSchema = createProjectSchema.extend({
	id: projectIdSchema
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
