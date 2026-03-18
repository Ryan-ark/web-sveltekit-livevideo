export const projectStatuses = ['active', 'paused', 'archived'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const appConfig = {
	name: 'Project Pulse',
	description:
		'A scalable SvelteKit CRUD starter built with Tailwind, Drizzle, and PostgreSQL.'
} as const;
