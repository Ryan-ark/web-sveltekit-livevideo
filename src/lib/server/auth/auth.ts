import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';

import { getAuthOptions } from './options';

const authOptions = getAuthOptions();

export const auth = betterAuth({
	...authOptions,
	plugins: [sveltekitCookies(getRequestEvent), ...(authOptions.plugins ?? [])]
});

export type AuthSession = typeof auth.$Infer.Session.session;
export type AuthUser = typeof auth.$Infer.Session.user & {
	role?: string | null;
	banned?: boolean | null;
	banReason?: string | null;
};
