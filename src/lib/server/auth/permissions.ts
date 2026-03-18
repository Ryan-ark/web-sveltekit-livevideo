import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

export const appRoles = ['admin', 'manager', 'member'] as const;

export type AppRole = (typeof appRoles)[number];

export type AuthActor = {
	userId: string;
	role: AppRole;
	email: string;
	name: string;
};

const statement = {
	...defaultStatements
} as const;

export const adminAccessControl = createAccessControl(statement);

export const adminRole = adminAccessControl.newRole({
	...adminAc.statements
});

export const managerRole = adminAccessControl.newRole({
	user: [],
	session: []
});

export const memberRole = adminAccessControl.newRole({
	user: [],
	session: []
});

export const adminRoles = {
	admin: adminRole,
	manager: managerRole,
	member: memberRole
} as const;

export function normalizeRole(role: string | null | undefined): AppRole {
	const rawRoles = String(role ?? 'member')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);

	if (rawRoles.includes('admin')) {
		return 'admin';
	}

	if (rawRoles.includes('manager')) {
		return 'manager';
	}

	return 'member';
}

export function canManageUsers(role: AppRole) {
	return role === 'admin';
}

export function canCreateProjects(role: AppRole) {
	return role === 'admin' || role === 'manager';
}

export function canEditProjects(role: AppRole) {
	return role === 'admin' || role === 'manager';
}

export function canDeleteProjects(role: AppRole) {
	return role === 'admin';
}

export function canManageTasks(role: AppRole) {
	return role === 'admin' || role === 'manager';
}

export function canReadProjects(role: AppRole) {
	return role === 'admin' || role === 'manager' || role === 'member';
}
