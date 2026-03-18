import { projectRepository } from './project.repository';

export const projectQueries = {
	listProjects: () => projectRepository.findAll(),
	getProjectById: (projectId: string) => projectRepository.findById(projectId),
	getProjectSummary: () => projectRepository.getSummary()
};
