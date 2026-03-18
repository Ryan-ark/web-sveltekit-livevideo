import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { projects } from './project';

export const tasks = pgTable('tasks', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	details: text('details'),
	completed: boolean('completed').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull()
});
