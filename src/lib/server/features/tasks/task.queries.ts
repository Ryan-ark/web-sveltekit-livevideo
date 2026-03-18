import { taskRepository } from './task.repository';

export const taskQueries = {
	listTasksByProjectId: (projectId: string) =>
		taskRepository.findByProjectId(projectId)
};
