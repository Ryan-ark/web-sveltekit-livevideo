import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import {
	createUserSchema,
	updateUserRoleSchema
} from '$server/auth/auth.schema';
import { auth } from '$server/auth/auth';
import { requirePermission } from '$server/auth/guards';
import { appRoles } from '$server/auth/permissions';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'manage-users');

	const result = await auth.api.listUsers({
		headers: event.request.headers,
		query: {
			limit: 100,
			sortBy: 'createdAt',
			sortDirection: 'desc'
		}
	});

	return {
		roles: appRoles,
		users: result.users
	};
};

export const actions: Actions = {
	createUser: async (event) => {
		requirePermission(event, 'manage-users');

		const formData = await event.request.formData();
		const values = {
			name: String(formData.get('name') ?? ''),
			email: String(formData.get('email') ?? ''),
			password: String(formData.get('password') ?? ''),
			role: String(formData.get('role') ?? 'member')
		};

		const parsed = createUserSchema.safeParse(values);

		if (!parsed.success) {
			return fail(400, {
				intent: 'create-user',
				form: values,
				errors: parsed.error.flatten().fieldErrors,
				message: 'User details are invalid.'
			});
		}

		try {
			await auth.api.createUser({
				body: parsed.data,
				headers: event.request.headers
			});

			return {
				success: true,
				intent: 'create-user'
			};
		} catch {
			return fail(400, {
				intent: 'create-user',
				form: values,
				errors: {},
				message: 'Unable to create the user. The email may already exist.'
			});
		}
	},

	updateRole: async (event) => {
		requirePermission(event, 'manage-users');

		const formData = await event.request.formData();
		const values = {
			userId: String(formData.get('userId') ?? ''),
			role: String(formData.get('role') ?? 'member')
		};

		const parsed = updateUserRoleSchema.safeParse(values);

		if (!parsed.success) {
			return fail(400, {
				intent: 'update-role',
				userId: values.userId,
				form: values,
				errors: parsed.error.flatten().fieldErrors,
				message: 'Role update is invalid.'
			});
		}

		try {
			await auth.api.setRole({
				body: parsed.data,
				headers: event.request.headers
			});

			return {
				success: true,
				intent: 'update-role',
				userId: parsed.data.userId
			};
		} catch {
			return fail(400, {
				intent: 'update-role',
				userId: values.userId,
				form: values,
				errors: {},
				message: 'Unable to update the user role.'
			});
		}
	}
};
