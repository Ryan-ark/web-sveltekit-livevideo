import type { PageServerLoad } from './$types';

import { requireAuth } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [summary, projects] = await Promise.all([
		projectService.getProjectSummary(),
		projectService.listProjects()
	]);

	return {
		summary,
		recentProjects: projects.slice(0, 3)
	};
};
