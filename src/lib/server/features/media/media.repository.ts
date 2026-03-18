import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '$server/db/client';
import {
	chatConversationMembers,
	chatConversations,
	mediaCallParticipants,
	mediaCallSessions
} from '$server/db/schema';

export const mediaRepository = {
	async findConversationWithMembers(conversationId: string) {
		const db = getDb();

		return db.query.chatConversations.findFirst({
			where: eq(chatConversations.id, conversationId),
			with: {
				members: {
					with: {
						user: true
					}
				}
			}
		});
	},

	async findLatestOpenCallByConversationId(conversationId: string) {
		const db = getDb();

		return db.query.mediaCallSessions.findFirst({
			where: and(
				eq(mediaCallSessions.conversationId, conversationId),
				inArray(mediaCallSessions.status, ['ringing', 'active'])
			),
			orderBy: [desc(mediaCallSessions.updatedAt)],
			with: {
				participants: {
					with: {
						user: true
					}
				}
			}
		});
	},

	async findOpenCallsByUserId(userId: string) {
		const db = getDb();

		return db.query.mediaCallParticipants.findMany({
			where: eq(mediaCallParticipants.userId, userId),
			with: {
				callSession: true
			}
		});
	},

	async createDirectCall(input: {
		conversationId: string;
		callerUserId: string;
		calleeUserId: string;
	}) {
		const db = getDb();

		return db.transaction(async (tx) => {
			const [call] = await tx
				.insert(mediaCallSessions)
				.values({
					conversationId: input.conversationId,
					mode: 'direct_call',
					status: 'ringing',
					initiatedByUserId: input.callerUserId,
					updatedAt: new Date()
				})
				.returning();

			await tx.insert(mediaCallParticipants).values([
				{
					callSessionId: call.id,
					userId: input.callerUserId,
					role: 'caller',
					joinStatus: 'joined',
					joinedAt: new Date()
				},
				{
					callSessionId: call.id,
					userId: input.calleeUserId,
					role: 'callee',
					joinStatus: 'invited'
				}
			]);

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, call.id),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async findCallById(callId: string) {
		const db = getDb();

		return db.query.mediaCallSessions.findFirst({
			where: eq(mediaCallSessions.id, callId),
			with: {
				participants: {
					with: {
						user: true
					}
				}
			}
		});
	},

	async expireRingingCall(callId: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(mediaCallSessions)
				.set({
					status: 'missed',
					endedAt: new Date(),
					endedReason: 'missed',
					updatedAt: new Date()
				})
				.where(
					and(
						eq(mediaCallSessions.id, callId),
						eq(mediaCallSessions.status, 'ringing')
					)
				);

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'missed',
					leftAt: new Date()
				})
				.where(
					and(
						eq(mediaCallParticipants.callSessionId, callId),
						eq(mediaCallParticipants.joinStatus, 'invited')
					)
				);

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'left',
					leftAt: new Date()
				})
				.where(
					and(
						eq(mediaCallParticipants.callSessionId, callId),
						eq(mediaCallParticipants.joinStatus, 'joined')
					)
				);

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, callId),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async acceptCall(callId: string, userId: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(mediaCallSessions)
				.set({
					status: 'active',
					startedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(mediaCallSessions.id, callId));

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'joined',
					joinedAt: new Date()
				})
				.where(
					and(
						eq(mediaCallParticipants.callSessionId, callId),
						eq(mediaCallParticipants.userId, userId)
					)
				);

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, callId),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async declineCall(callId: string, userId: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(mediaCallSessions)
				.set({
					status: 'declined',
					endedAt: new Date(),
					endedReason: 'declined',
					updatedAt: new Date()
				})
				.where(eq(mediaCallSessions.id, callId));

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'declined',
					leftAt: new Date()
				})
				.where(
					and(
						eq(mediaCallParticipants.callSessionId, callId),
						eq(mediaCallParticipants.userId, userId)
					)
				);

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, callId),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async endCall(callId: string, endedReason: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(mediaCallSessions)
				.set({
					status: 'ended',
					endedAt: new Date(),
					endedReason,
					updatedAt: new Date()
				})
				.where(eq(mediaCallSessions.id, callId));

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'left',
					leftAt: new Date()
				})
				.where(eq(mediaCallParticipants.callSessionId, callId));

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, callId),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async markCallMissed(callId: string, userId: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(mediaCallSessions)
				.set({
					status: 'missed',
					endedAt: new Date(),
					endedReason: 'missed',
					updatedAt: new Date()
				})
				.where(eq(mediaCallSessions.id, callId));

			await tx
				.update(mediaCallParticipants)
				.set({
					joinStatus: 'missed',
					leftAt: new Date()
				})
				.where(
					and(
						eq(mediaCallParticipants.callSessionId, callId),
						eq(mediaCallParticipants.userId, userId)
					)
				);

			return tx.query.mediaCallSessions.findFirst({
				where: eq(mediaCallSessions.id, callId),
				with: {
					participants: {
						with: {
							user: true
						}
					}
				}
			});
		});
	},

	async isConversationMember(conversationId: string, userId: string) {
		const db = getDb();

		const membership = await db.query.chatConversationMembers.findFirst({
			where: and(
				eq(chatConversationMembers.conversationId, conversationId),
				eq(chatConversationMembers.userId, userId)
			)
		});

		return Boolean(membership);
	},

	async isCallParticipant(callId: string, userId: string) {
		const db = getDb();

		const participant = await db.query.mediaCallParticipants.findFirst({
			where: and(
				eq(mediaCallParticipants.callSessionId, callId),
				eq(mediaCallParticipants.userId, userId)
			)
		});

		return Boolean(participant);
	}
};
