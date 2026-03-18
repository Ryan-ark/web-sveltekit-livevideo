import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin } from 'better-auth/plugins';

import { getServerEnv } from '../../config/env.server';
import { getDb } from '../db/client';
import { adminAccessControl, adminRoles } from './permissions';

export function getAuthOptions() {
	const env = getServerEnv();

	return {
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(getDb(), {
			provider: 'pg' as const,
			usePlural: true
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: true
		},
		plugins: [
			admin({
				ac: adminAccessControl,
				roles: adminRoles,
				defaultRole: 'member'
			})
		]
	};
}
