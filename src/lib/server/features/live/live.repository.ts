import { and, asc, desc, eq } from 'drizzle-orm';

import { getDb } from '$server/db/client';
import { liveRoomMembers, liveRooms, liveRoomSessions } from '$server/db/schema';

export const liveRepository = {
	async listRoomsForUser(userId: string) {
		const db = getDb();

		return db.query.liveRoomMembers.findMany({
			where: eq(liveRoomMembers.userId, userId),
			with: {
				room: {
					with: {
						sessions: {
							orderBy: [desc(liveRoomSessions.startedAt)],
							limit: 1
						}
					}
				}
			},
			orderBy: [desc(liveRoomMembers.updatedAt)]
		});
	},

	async createRoom(input: { title: string; hostUserId: string }) {
		const db = getDb();

		return db.transaction(async (tx) => {
			const [room] = await tx
				.insert(liveRooms)
				.values({
					title: input.title,
					createdByUserId: input.hostUserId,
					status: 'idle',
					updatedAt: new Date()
				})
				.returning();

			await tx.insert(liveRoomMembers).values({
				roomId: room.id,
				userId: input.hostUserId,
				role: 'host',
				joinStatus: 'approved',
				updatedAt: new Date()
			});

			return room;
		});
	},

	async findRoomById(roomId: string) {
		const db = getDb();

		return db.query.liveRooms.findFirst({
			where: eq(liveRooms.id, roomId),
			with: {
				createdBy: true,
				members: {
					with: {
						user: true
					},
					orderBy: [asc(liveRoomMembers.createdAt)]
				},
				sessions: {
					orderBy: [desc(liveRoomSessions.startedAt)],
					limit: 1
				}
			}
		});
	},

	async isRoomMember(roomId: string, userId: string) {
		const db = getDb();
		const membership = await db.query.liveRoomMembers.findFirst({
			where: and(eq(liveRoomMembers.roomId, roomId), eq(liveRoomMembers.userId, userId))
		});

		return membership;
	},

	async addViewer(roomId: string, userId: string) {
		const db = getDb();

		await db
			.insert(liveRoomMembers)
			.values({
				roomId,
				userId,
				role: 'viewer',
				joinStatus: 'approved',
				updatedAt: new Date()
			})
			.onConflictDoUpdate({
				target: [liveRoomMembers.roomId, liveRoomMembers.userId],
				set: {
					role: 'viewer',
					joinStatus: 'approved',
					updatedAt: new Date()
				}
			});
	},

	async startSession(roomId: string, hostUserId: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(liveRooms)
				.set({
					status: 'live',
					updatedAt: new Date()
				})
				.where(eq(liveRooms.id, roomId));

			const [session] = await tx
				.insert(liveRoomSessions)
				.values({
					roomId,
					hostUserId,
					status: 'live',
					updatedAt: new Date()
				})
				.returning();

			return session;
		});
	},

	async endSession(roomId: string, endedReason: string) {
		const db = getDb();

		return db.transaction(async (tx) => {
			await tx
				.update(liveRooms)
				.set({
					status: 'ended',
					updatedAt: new Date()
				})
				.where(eq(liveRooms.id, roomId));

			const [session] = await tx
				.update(liveRoomSessions)
				.set({
					status: 'ended',
					endedAt: new Date(),
					endedReason,
					updatedAt: new Date()
				})
				.where(and(eq(liveRoomSessions.roomId, roomId), eq(liveRoomSessions.status, 'live')))
				.returning();

			return session ?? null;
		});
	}
};
