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

export const liveRoomStatusEnum = pgEnum('live_room_status', [
	'idle',
	'live',
	'ended'
]);

export const liveRoomMemberRoleEnum = pgEnum('live_room_member_role', [
	'host',
	'viewer'
]);

export const liveRoomMemberStatusEnum = pgEnum('live_room_member_status', [
	'approved',
	'joined',
	'left',
	'removed'
]);

export const liveSessionStatusEnum = pgEnum('live_session_status', [
	'starting',
	'live',
	'ended',
	'failed'
]);

export const liveRooms = pgTable(
	'live_rooms',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		title: text('title').notNull(),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: liveRoomStatusEnum('status').default('idle').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		index('live_rooms_created_by_idx').on(table.createdByUserId),
		index('live_rooms_status_idx').on(table.status)
	]
);

export const liveRoomMembers = pgTable(
	'live_room_members',
	{
		roomId: uuid('room_id')
			.notNull()
			.references(() => liveRooms.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: liveRoomMemberRoleEnum('role').notNull(),
		joinStatus: liveRoomMemberStatusEnum('join_status')
			.default('approved')
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(table) => [
		primaryKey({
			columns: [table.roomId, table.userId],
			name: 'live_room_members_pk'
		}),
		index('live_room_members_user_idx').on(table.userId),
		index('live_room_members_role_idx').on(table.role)
	]
);

export const liveRoomSessions = pgTable(
	'live_room_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		roomId: uuid('room_id')
			.notNull()
			.references(() => liveRooms.id, { onDelete: 'cascade' }),
		hostUserId: text('host_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: liveSessionStatusEnum('status').default('starting').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
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
		index('live_room_sessions_room_idx').on(table.roomId),
		index('live_room_sessions_host_idx').on(table.hostUserId),
		index('live_room_sessions_status_idx').on(table.status)
	]
);
