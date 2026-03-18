import { createAuthClient } from 'better-auth/svelte';
import { adminClient } from 'better-auth/client/plugins';

import { adminAccessControl, adminRoles } from '$server/auth/permissions';

export const authClient = createAuthClient({
	plugins: [
		adminClient({
			ac: adminAccessControl,
			roles: adminRoles
		})
	]
});
