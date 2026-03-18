import { and, asc, desc, eq, inArray, ne, or } from 'drizzle-orm';

import { getDb } from '$server/db/client';
import {
	chatConversationMembers,
	chatConversations,
	chatMessages,
	users
} from '$server/db/schema';

export const chatRepository = {
	async listAvailableUsers(excludeUserId: string) {
		const db = getDb();

		return db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role
			})
			.from(users)
			.where(ne(users.id, excludeUserId))
			.orderBy(asc(users.name), asc(users.email));
	},

	async findDirectConversationByUserIds(userId: string, otherUserId: string) {
		const db = getDb();

		const matches = await db.query.chatConversationMembers.findMany({
			where: or(
				eq(chatConversationMembers.userId, userId),
				eq(chatConversationMembers.userId, otherUserId)
			),
			with: {
				conversation: {
					with: {
						members: true
					}
				}
			}
		});

		return (
			matches
				.map((entry) => entry.conversation)
				.find((conversation) => {
					if (
						conversation.kind !== 'direct' ||
						conversation.members.length !== 2
					) {
						return false;
					}

					const memberIds = conversation.members.map((member) => member.userId);
					return memberIds.includes(userId) && memberIds.includes(otherUserId);
				}) ?? null
		);
	},

	async createDirectConversation(input: {
		createdByUserId: string;
		memberUserIds: [string, string];
	}) {
		const db = getDb();

		return db.transaction(async (tx) => {
			const [conversation] = await tx
				.insert(chatConversations)
				.values({
					kind: 'direct',
					createdByUserId: input.createdByUserId,
					updatedAt: new Date()
				})
				.returning();

			await tx.insert(chatConversationMembers).values(
				input.memberUserIds.map((userId) => ({
					conversationId: conversation.id,
					userId
				}))
			);

			return conversation;
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

	async findConversationById(conversationId: string) {
		const db = getDb();

		return db.query.chatConversations.findFirst({
			where: eq(chatConversations.id, conversationId),
			with: {
				members: {
					with: {
						user: true
					},
					orderBy: [asc(chatConversationMembers.joinedAt)]
				}
			}
		});
	},

	async listConversationsByUserId(userId: string) {
		const db = getDb();

		return db.query.chatConversationMembers.findMany({
			where: eq(chatConversationMembers.userId, userId),
			with: {
				conversation: {
					with: {
						members: {
							with: {
								user: true
							}
						},
						messages: {
							orderBy: [desc(chatMessages.createdAt)],
							limit: 1,
							with: {
								sender: true
							}
						}
					}
				}
			},
			orderBy: [desc(chatConversationMembers.joinedAt)]
		});
	},

	async listMessagesByConversationId(conversationId: string, limit = 100) {
		const db = getDb();

		const messages = await db.query.chatMessages.findMany({
			where: eq(chatMessages.conversationId, conversationId),
			orderBy: [desc(chatMessages.createdAt)],
			limit,
			with: {
				sender: true
			}
		});

		return messages.reverse();
	},

	async createMessage(input: {
		conversationId: string;
		senderUserId: string;
		body: string;
	}) {
		const db = getDb();

		return db.transaction(async (tx) => {
			const [message] = await tx
				.insert(chatMessages)
				.values({
					conversationId: input.conversationId,
					senderUserId: input.senderUserId,
					body: input.body
				})
				.returning();

			await tx
				.update(chatConversations)
				.set({
					updatedAt: new Date()
				})
				.where(eq(chatConversations.id, input.conversationId));

			const fullMessage = await tx.query.chatMessages.findFirst({
				where: eq(chatMessages.id, message.id),
				with: {
					sender: true
				}
			});

			if (!fullMessage) {
				throw new Error('Unable to reload chat message after insert.');
			}

			return fullMessage;
		});
	},

	async findUsersByIds(userIds: string[]) {
		if (userIds.length === 0) {
			return [];
		}

		const db = getDb();

		return db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role
			})
			.from(users)
			.where(inArray(users.id, userIds));
	}
};
