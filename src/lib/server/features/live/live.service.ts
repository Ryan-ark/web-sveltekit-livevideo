import { chatService } from '$server/features/chat/chat.service';
import {
	AuthorizationError,
	NotFoundError,
	ValidationError
} from '$server/shared/errors/app-error';
import { parseUuid } from '$server/shared/utils/ids';

import { addLiveViewerSchema, createLiveRoomSchema } from './live.schema';
import { liveRepository } from './live.repository';

import type { AuthActor } from '$server/auth/permissions';
import type { LiveRoomDetail, LiveRoomSummary } from './live.types';

function toSummary(
	roomMembership: Awaited<ReturnType<typeof liveRepository.listRoomsForUser>>[number],
	userId: string
): LiveRoomSummary {
	return {
		id: roomMembership.room.id,
		title: roomMembership.room.title,
		status: roomMembership.room.status,
		isHost: roomMembership.role === 'host',
		canView: roomMembership.joinStatus !== 'removed',
		createdAt: roomMembership.room.createdAt,
		updatedAt: roomMembership.room.updatedAt
	};
}

function toDetail(
	room: NonNullable<Awaited<ReturnType<typeof liveRepository.findRoomById>>>,
	userId: string
): LiveRoomDetail {
	const currentMembership = room.members.find((member) => member.userId === userId) ?? null;
	const activeSession = room.sessions[0] ?? null;

	return {
		id: room.id,
		title: room.title,
		status: room.status,
		host: {
			id: room.createdBy.id,
			name: room.createdBy.name,
			email: room.createdBy.email
		},
		members: room.members.map((member) => ({
			userId: member.userId,
			name: member.user.name,
			email: member.user.email,
			role: member.role,
			joinStatus: member.joinStatus
		})),
		activeSession: activeSession
			? {
					id: activeSession.id,
					status: activeSession.status,
					startedAt: activeSession.startedAt.toISOString(),
					endedAt: activeSession.endedAt?.toISOString() ?? null
				}
			: null,
		currentUserRole: currentMembership?.role ?? null
	};
}

export const liveService = {
	async listRooms(actor: AuthActor) {
		const memberships = await liveRepository.listRoomsForUser(actor.userId);
		return memberships.map((membership) => toSummary(membership, actor.userId));
	},

	async createRoom(actor: AuthActor, input: unknown) {
		const parsed = createLiveRoomSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Live room data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		return liveRepository.createRoom({
			title: parsed.data.title,
			hostUserId: actor.userId
		});
	},

	async getRoom(actor: AuthActor, roomId: string) {
		const safeRoomId = parseUuid(roomId, 'roomId');
		const room = await liveRepository.findRoomById(safeRoomId);

		if (!room) {
			throw new NotFoundError('Live room not found.', { roomId: safeRoomId });
		}

		const membership = room.members.find((member) => member.userId === actor.userId);

		if (!membership) {
			throw new AuthorizationError('You cannot access this live room.');
		}

		return toDetail(room, actor.userId);
	},

	async addViewer(actor: AuthActor, roomId: string, input: unknown) {
		const parsed = addLiveViewerSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Viewer data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const safeRoomId = parseUuid(roomId, 'roomId');
		const room = await liveRepository.findRoomById(safeRoomId);

		if (!room) {
			throw new NotFoundError('Live room not found.', { roomId: safeRoomId });
		}

		const membership = room.members.find((member) => member.userId === actor.userId);

		if (!membership || membership.role !== 'host') {
			throw new AuthorizationError('Only the host can manage viewers.');
		}

		if (parsed.data.userId === actor.userId) {
			throw new ValidationError('Host is already part of the room.');
		}

		const [user] = await chatService.listAvailableUsers(actor).then((users) =>
			users.filter((entry) => entry.id === parsed.data.userId)
		);

		if (!user) {
			throw new NotFoundError('Viewer not found.', { userId: parsed.data.userId });
		}

		await liveRepository.addViewer(safeRoomId, parsed.data.userId);
		return this.getRoom(actor, safeRoomId);
	},

	async startRoom(actor: AuthActor, roomId: string) {
		const safeRoomId = parseUuid(roomId, 'roomId');
		const room = await liveRepository.findRoomById(safeRoomId);

		if (!room) {
			throw new NotFoundError('Live room not found.', { roomId: safeRoomId });
		}

		const membership = room.members.find((member) => member.userId === actor.userId);

		if (!membership || membership.role !== 'host') {
			throw new AuthorizationError('Only the host can start the live room.');
		}

		await liveRepository.startSession(safeRoomId, actor.userId);
		return this.getRoom(actor, safeRoomId);
	},

	async endRoom(actor: AuthActor, roomId: string) {
		const safeRoomId = parseUuid(roomId, 'roomId');
		const room = await liveRepository.findRoomById(safeRoomId);

		if (!room) {
			throw new NotFoundError('Live room not found.', { roomId: safeRoomId });
		}

		const membership = room.members.find((member) => member.userId === actor.userId);

		if (!membership || membership.role !== 'host') {
			throw new AuthorizationError('Only the host can end the live room.');
		}

		await liveRepository.endSession(safeRoomId, 'host-ended');
		return this.getRoom(actor, safeRoomId);
	}
};
