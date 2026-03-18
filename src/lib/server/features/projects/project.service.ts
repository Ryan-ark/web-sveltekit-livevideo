import { createProjectSchema, updateProjectSchema } from './project.schema';
import { projectQueries } from './project.queries';
import { projectRepository } from './project.repository';

import type { AuthActor } from '$server/auth/permissions';
import {
	canCreateProjects,
	canDeleteProjects,
	canEditProjects
} from '$server/auth/permissions';
import {
	NotFoundError,
	AuthorizationError,
	ValidationError
} from '$server/shared/errors/app-error';
import { parseUuid } from '$server/shared/utils/ids';

export const projectService = {
	async listProjects() {
		return projectQueries.listProjects();
	},

	async getProject(projectId: string) {
		const safeProjectId = parseUuid(projectId, 'projectId');
		const project = await projectQueries.getProjectById(safeProjectId);

		if (!project) {
			throw new NotFoundError('Project not found.', {
				projectId: safeProjectId
			});
		}

		return project;
	},

	async getProjectSummary() {
		return projectQueries.getProjectSummary();
	},

	async createProject(actor: AuthActor, input: unknown) {
		if (!canCreateProjects(actor.role)) {
			throw new AuthorizationError();
		}

		const parsed = createProjectSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Project data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		return projectRepository.insert(parsed.data);
	},

	async updateProject(actor: AuthActor, input: unknown) {
		if (!canEditProjects(actor.role)) {
			throw new AuthorizationError();
		}

		const parsed = updateProjectSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Project data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const updated = await projectRepository.update(parsed.data);

		if (!updated) {
			throw new NotFoundError('Project not found.', {
				projectId: parsed.data.id
			});
		}

		return updated;
	},

	async deleteProject(actor: AuthActor, projectId: string) {
		if (!canDeleteProjects(actor.role)) {
			throw new AuthorizationError();
		}

		const safeProjectId = parseUuid(projectId, 'projectId');
		const deleted = await projectRepository.delete(safeProjectId);

		if (!deleted) {
			throw new NotFoundError('Project not found.', {
				projectId: safeProjectId
			});
		}

		return deleted;
	}
};
