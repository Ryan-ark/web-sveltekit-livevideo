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
import { chatConversations } from './chat';

export const mediaCallModeEnum = pgEnum('media_call_mode', ['direct_call']);

export const mediaCallStatusEnum = pgEnum('media_call_status', [
	'ringing',
	'active',
	'ended',
	'declined',
	'missed',
	'failed'
]);

export const mediaParticipantRoleEnum = pgEnum('media_participant_role', [
	'caller',
	'callee'
]);

export const mediaParticipantJoinStatusEnum = pgEnum(
	'media_participant_join_status',
	['invited', 'joined', 'declined', 'missed', 'left']
);

export const mediaCallSessions = pgTable(
	'media_call_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => chatConversations.id, { onDelete: 'cascade' }),
		mode: mediaCallModeEnum('mode').default('direct_call').notNull(),
		status: mediaCallStatusEnum('status').default('ringing').notNull(),
		initiatedByUserId: text('initiated_by_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at', { withTimezone: true }),
		endedAt: timestamp('ended_at', { withTimezone: true }),
		endedReason: text('ended_reason'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		index('media_call_sessions_conversation_idx').on(table.conversationId),
		index('media_call_sessions_initiated_by_idx').on(table.initiatedByUserId),
		index('media_call_sessions_status_idx').on(table.status),
		index('media_call_sessions_updated_idx').on(table.updatedAt)
	]
);

export const mediaCallParticipants = pgTable(
	'media_call_participants',
	{
		callSessionId: uuid('call_session_id')
			.notNull()
			.references(() => mediaCallSessions.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: mediaParticipantRoleEnum('role').notNull(),
		joinStatus: mediaParticipantJoinStatusEnum('join_status')
			.default('invited')
			.notNull(),
		joinedAt: timestamp('joined_at', { withTimezone: true }),
		leftAt: timestamp('left_at', { withTimezone: true })
	},
	(table) => [
		primaryKey({
			columns: [table.callSessionId, table.userId],
			name: 'media_call_participants_pk'
		}),
		index('media_call_participants_user_idx').on(table.userId),
		index('media_call_participants_role_idx').on(table.role)
	]
);
