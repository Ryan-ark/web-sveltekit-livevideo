import { error, redirect } from '@sveltejs/kit';

import type { RequestEvent } from '@sveltejs/kit';

import type { AuthActor } from './permissions';
import {
	canCreateProjects,
	canDeleteProjects,
	canEditProjects,
	canManageTasks,
	canManageUsers,
	canReadProjects,
	normalizeRole
} from './permissions';

export type AppPermission =
	| 'read-projects'
	| 'create-projects'
	| 'edit-projects'
	| 'delete-projects'
	| 'manage-tasks'
	| 'manage-users';

function canAccess(permission: AppPermission, role: AuthActor['role']) {
	switch (permission) {
		case 'read-projects':
			return canReadProjects(role);
		case 'create-projects':
			return canCreateProjects(role);
		case 'edit-projects':
			return canEditProjects(role);
		case 'delete-projects':
			return canDeleteProjects(role);
		case 'manage-tasks':
			return canManageTasks(role);
		case 'manage-users':
			return canManageUsers(role);
	}
}

export function getActor(event: RequestEvent): AuthActor | null {
	const user = event.locals.user;

	if (!user) {
		return null;
	}

	return {
		userId: user.id,
		role: normalizeRole(user.role),
		email: user.email,
		name: user.name
	};
}

export function requireAuth(event: RequestEvent, next?: string) {
	const actor = getActor(event);

	if (!actor) {
		const target = next ?? `${event.url.pathname}${event.url.search}`;
		throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
	}

	return actor;
}

export function requirePermission(
	event: RequestEvent,
	permission: AppPermission
) {
	const actor = requireAuth(event);

	if (!canAccess(permission, actor.role)) {
		throw error(403, 'You do not have permission to perform this action.');
	}

	return actor;
}
