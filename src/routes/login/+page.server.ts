import { fail, isRedirect, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { auth } from '$server/auth/auth';
import { loginSchema } from '$server/auth/auth.schema';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.isAuthenticated) {
		throw redirect(303, url.searchParams.get('next') || '/');
	}

	return {
		next: url.searchParams.get('next') || '/projects'
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const values = {
			email: String(formData.get('email') ?? ''),
			password: String(formData.get('password') ?? '')
		};

		const parsed = loginSchema.safeParse(values);

		if (!parsed.success) {
			return fail(400, {
				form: values,
				errors: parsed.error.flatten().fieldErrors,
				message: 'Enter a valid email address and password.'
			});
		}

		try {
			await auth.api.signInEmail({
				body: {
					email: parsed.data.email,
					password: parsed.data.password
				},
				headers: request.headers
			});

			throw redirect(303, url.searchParams.get('next') || '/projects');
		} catch (caught) {
			if (isRedirect(caught)) {
				throw caught;
			}

			return fail(400, {
				form: values,
				errors: {},
				message: 'Email or password is incorrect.'
			});
		}
	}
};
