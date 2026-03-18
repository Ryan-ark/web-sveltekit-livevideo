import { relations } from 'drizzle-orm';

import { accounts, sessions, users, verifications } from './auth';
import {
	chatConversationMembers,
	chatConversations,
	chatMessages
} from './chat';
import { mediaCallParticipants, mediaCallSessions } from './media';
import { liveRoomMembers, liveRooms, liveRoomSessions } from './live';
import { projects } from './project';
import { tasks } from './task';

export { accounts, sessions, users, verifications } from './auth';
export * from './chat';
export * from './media';
export * from './live';
export * from './project';
export * from './task';

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	})
}));

export const chatConversationRelations = relations(
	chatConversations,
	({ one, many }) => ({
		createdBy: one(users, {
			fields: [chatConversations.createdByUserId],
			references: [users.id]
		}),
		members: many(chatConversationMembers),
		messages: many(chatMessages)
	})
);

export const chatConversationMemberRelations = relations(
	chatConversationMembers,
	({ one }) => ({
		conversation: one(chatConversations, {
			fields: [chatConversationMembers.conversationId],
			references: [chatConversations.id]
		}),
		user: one(users, {
			fields: [chatConversationMembers.userId],
			references: [users.id]
		})
	})
);

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
	conversation: one(chatConversations, {
		fields: [chatMessages.conversationId],
		references: [chatConversations.id]
	}),
	sender: one(users, {
		fields: [chatMessages.senderUserId],
		references: [users.id]
	})
}));

export const mediaCallSessionRelations = relations(
	mediaCallSessions,
	({ one, many }) => ({
		conversation: one(chatConversations, {
			fields: [mediaCallSessions.conversationId],
			references: [chatConversations.id]
		}),
		initiatedBy: one(users, {
			fields: [mediaCallSessions.initiatedByUserId],
			references: [users.id]
		}),
		participants: many(mediaCallParticipants)
	})
);

export const mediaCallParticipantRelations = relations(
	mediaCallParticipants,
	({ one }) => ({
		callSession: one(mediaCallSessions, {
			fields: [mediaCallParticipants.callSessionId],
			references: [mediaCallSessions.id]
		}),
		user: one(users, {
			fields: [mediaCallParticipants.userId],
			references: [users.id]
		})
	})
);

export const liveRoomRelations = relations(liveRooms, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [liveRooms.createdByUserId],
		references: [users.id]
	}),
	members: many(liveRoomMembers),
	sessions: many(liveRoomSessions)
}));

export const liveRoomMemberRelations = relations(liveRoomMembers, ({ one }) => ({
	room: one(liveRooms, {
		fields: [liveRoomMembers.roomId],
		references: [liveRooms.id]
	}),
	user: one(users, {
		fields: [liveRoomMembers.userId],
		references: [users.id]
	})
}));

export const liveRoomSessionRelations = relations(
	liveRoomSessions,
	({ one }) => ({
		room: one(liveRooms, {
			fields: [liveRoomSessions.roomId],
			references: [liveRooms.id]
		}),
		host: one(users, {
			fields: [liveRoomSessions.hostUserId],
			references: [users.id]
		})
	})
);

export const projectRelations = relations(projects, ({ many }) => ({
	tasks: many(tasks)
}));

export const taskRelations = relations(tasks, ({ one }) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	})
}));
