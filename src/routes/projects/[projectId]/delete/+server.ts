import { redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requirePermission } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';

export const POST: RequestHandler = async (event) => {
	const actor = requirePermission(event, 'delete-projects');

	await projectService.deleteProject(actor, event.params.projectId);
	throw redirect(303, '/projects');
};
