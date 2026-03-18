import { z } from 'zod';

export const taskIdSchema = z.uuid();

const taskDetailsSchema = z
	.string()
	.trim()
	.max(500, 'Task details must be 500 characters or fewer.')
	.default('');

export const createTaskSchema = z.object({
	projectId: z.uuid(),
	title: z
		.string()
		.trim()
		.min(2, 'Task title must be at least 2 characters.')
		.max(120),
	details: taskDetailsSchema
});

export const updateTaskSchema = createTaskSchema.extend({
	id: taskIdSchema,
	completed: z.boolean().default(false)
});

export const deleteTaskSchema = z.object({
	id: taskIdSchema,
	projectId: z.uuid()
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
