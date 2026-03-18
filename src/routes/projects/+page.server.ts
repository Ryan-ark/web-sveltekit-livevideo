import type { PageServerLoad } from './$types';

import { requirePermission } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'read-projects');

	return {
		projects: await projectService.listProjects()
	};
};
