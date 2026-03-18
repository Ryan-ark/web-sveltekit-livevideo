import {
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';

import { users } from './auth';

export const chatConversationKindEnum = pgEnum('chat_conversation_kind', [
	'direct'
]);

export const chatConversations = pgTable(
	'chat_conversations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		kind: chatConversationKindEnum('kind').default('direct').notNull(),
		createdByUserId: text('created_by_user_id').references(() => users.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		index('chat_conversations_created_by_idx').on(table.createdByUserId)
	]
);

export const chatConversationMembers = pgTable(
	'chat_conversation_members',
	{
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		joinedAt: timestamp('joined_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		primaryKey({
			columns: [table.conversationId, table.userId],
			name: 'chat_conversation_members_pk'
		}),
		index('chat_conversation_members_user_idx').on(table.userId)
	]
);

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		senderUserId: text('sender_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		index('chat_messages_conversation_created_idx').on(
			table.conversationId,
			table.createdAt
		),
		index('chat_messages_sender_idx').on(table.senderUserId)
	]
);
