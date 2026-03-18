import { error, fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requirePermission } from '$server/auth/guards';
import { projectService } from '$server/features/projects/project.service';
import { taskService } from '$server/features/tasks/task.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'read-projects');

	try {
		return {
			project: await projectService.getProject(event.params.projectId)
		};
	} catch (caught) {
		const details = getHttpErrorDetails(caught);
		throw error(details.status, details.message);
	}
};

export const actions: Actions = {
	createTask: async (event) => {
		const actor = requirePermission(event, 'manage-tasks');
		const { request, params } = event;
		const formData = await request.formData();
		const values = {
			projectId: params.projectId,
			title: String(formData.get('title') ?? ''),
			details: String(formData.get('details') ?? '')
		};

		try {
			await taskService.createTask(actor, values);
			return { success: true, intent: 'create-task' };
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'create-task',
				form: values,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {},
				message: details.message
			});
		}
	},

	updateTask: async (event) => {
		const actor = requirePermission(event, 'manage-tasks');
		const { request, params } = event;
		const formData = await request.formData();
		const values = {
			id: String(formData.get('taskId') ?? ''),
			projectId: params.projectId,
			title: String(formData.get('title') ?? ''),
			details: String(formData.get('details') ?? ''),
			completed: formData.get('completed') === 'on'
		};

		try {
			await taskService.updateTask(actor, values);
			return { success: true, intent: 'update-task', taskId: values.id };
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'update-task',
				taskId: values.id,
				form: values,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {},
				message: details.message
			});
		}
	},

	deleteTask: async (event) => {
		const actor = requirePermission(event, 'manage-tasks');
		const { request, params } = event;
		const formData = await request.formData();
		const values = {
			id: String(formData.get('taskId') ?? ''),
			projectId: params.projectId
		};

		try {
			await taskService.deleteTask(actor, values);
			return { success: true, intent: 'delete-task', taskId: values.id };
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'delete-task',
				taskId: values.id,
				message: details.message
			});
		}
	}
};
