import {
	createTaskSchema,
	deleteTaskSchema,
	updateTaskSchema
} from './task.schema';
import { taskQueries } from './task.queries';
import { taskRepository } from './task.repository';

import type { AuthActor } from '$server/auth/permissions';
import { canManageTasks } from '$server/auth/permissions';
import { projectRepository } from '$server/features/projects/project.repository';
import {
	NotFoundError,
	AuthorizationError,
	ValidationError
} from '$server/shared/errors/app-error';

export const taskService = {
	async listTasksByProjectId(projectId: string) {
		return taskQueries.listTasksByProjectId(projectId);
	},

	async createTask(actor: AuthActor, input: unknown) {
		if (!canManageTasks(actor.role)) {
			throw new AuthorizationError();
		}

		const parsed = createTaskSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Task data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const projectExists = await projectRepository.exists(parsed.data.projectId);

		if (!projectExists) {
			throw new NotFoundError('Project not found.', {
				projectId: parsed.data.projectId
			});
		}

		return taskRepository.insert(parsed.data);
	},

	async updateTask(actor: AuthActor, input: unknown) {
		if (!canManageTasks(actor.role)) {
			throw new AuthorizationError();
		}

		const parsed = updateTaskSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Task data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const updated = await taskRepository.update(parsed.data);

		if (!updated) {
			throw new NotFoundError('Task not found.', { taskId: parsed.data.id });
		}

		return updated;
	},

	async deleteTask(actor: AuthActor, input: unknown) {
		if (!canManageTasks(actor.role)) {
			throw new AuthorizationError();
		}

		const parsed = deleteTaskSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Task data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const deleted = await taskRepository.delete(parsed.data.id);

		if (!deleted) {
			throw new NotFoundError('Task not found.', { taskId: parsed.data.id });
		}

		return deleted;
	}
};
