import { fail, isRedirect, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { projectStatuses } from '$config/app';
import { requirePermission } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'create-projects');

	return {
		statuses: projectStatuses
	};
};

export const actions: Actions = {
	default: async (event) => {
		const actor = requirePermission(event, 'create-projects');
		const { request } = event;
		const formData = await request.formData();
		const values = {
			name: String(formData.get('name') ?? ''),
			description: String(formData.get('description') ?? ''),
			status: String(formData.get('status') ?? 'active')
		};

		try {
			const project = await projectService.createProject(actor, values);
			throw redirect(303, `/projects/${project.id}`);
		} catch (error) {
			if (isRedirect(error)) {
				throw error;
			}

			const details = getHttpErrorDetails(error);

			return fail(details.status, {
				intent: 'create-project',
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
