import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

import { auth } from '$server/auth/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = crypto.randomUUID();
	event.locals.user = null;
	event.locals.session = null;
	event.locals.isAuthenticated = false;

	if (!building) {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		event.locals.user = session?.user ?? null;
		event.locals.session = session?.session ?? null;
		event.locals.isAuthenticated = Boolean(session?.user && session?.session);
	}

	return svelteKitHandler({
		auth,
		event,
		resolve,
		building
	});
};
