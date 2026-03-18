import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const projectStatusEnum = pgEnum('project_status', [
	'active',
	'paused',
	'archived'
]);

export const projects = pgTable('projects', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	status: projectStatusEnum('status').default('active').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull()
});
