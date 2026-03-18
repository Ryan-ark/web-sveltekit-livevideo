import { error, fail, isRedirect, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { projectStatuses } from '$config/app';
import { requirePermission } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'edit-projects');

	try {
		return {
			project: await projectService.getProject(event.params.projectId),
			statuses: projectStatuses
		};
	} catch (caught) {
		const details = getHttpErrorDetails(caught);
		throw error(details.status, details.message);
	}
};

export const actions: Actions = {
	default: async (event) => {
		const actor = requirePermission(event, 'edit-projects');
		const { request, params } = event;
		const formData = await request.formData();
		const values = {
			id: params.projectId,
			name: String(formData.get('name') ?? ''),
			description: String(formData.get('description') ?? ''),
			status: String(formData.get('status') ?? 'active')
		};

		try {
			await projectService.updateProject(actor, values);
			throw redirect(303, `/projects/${params.projectId}`);
		} catch (caught) {
			if (isRedirect(caught)) {
				throw caught;
			}

			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'edit-project',
				form: values,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {},
				message: details.message
			});
		}
	}
};
