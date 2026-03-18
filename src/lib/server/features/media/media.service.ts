import { chatService } from '$server/features/chat/chat.service';
import {
	AuthorizationError,
	ConflictError,
	NotFoundError,
	ValidationError
} from '$server/shared/errors/app-error';
import { parseUuid } from '$server/shared/utils/ids';

import {
	getAblyRestClient,
	getCallChannelName,
	getChatChannelName
} from '$server/realtime/ably';

import {
	callIdSchema,
	createDirectCallSchema,
	endCallSchema,
	updateParticipantMediaStateSchema
} from './media.schema';
import { mediaRepository } from './media.repository';

import type { AuthActor } from '$server/auth/permissions';
import type {
	DirectCall,
	MediaCallLifecycleEvent,
	ParticipantMediaStateEvent,
	WebRtcIceServer
} from './media.types';

const RINGING_TIMEOUT_MS = 45_000;

function serializeCall(
	call:
		| Awaited<ReturnType<typeof mediaRepository.findCallById>>
		| Awaited<ReturnType<typeof mediaRepository.findLatestOpenCallByConversationId>>,
	currentUserId: string
): DirectCall | null {
	if (!call) {
		return null;
	}

	const participants = call.participants.map((participant) => ({
		userId: participant.userId,
		name: participant.user.name,
		email: participant.user.email,
		role: participant.role,
		joinStatus: participant.joinStatus
	}));

	return {
		id: call.id,
		conversationId: call.conversationId,
		status: call.status,
		initiatedByUserId: call.initiatedByUserId,
		startedAt: call.startedAt?.toISOString() ?? null,
		endedAt: call.endedAt?.toISOString() ?? null,
		endedReason: call.endedReason ?? null,
		currentParticipantRole:
			participants.find((participant) => participant.userId === currentUserId)?.role ??
			null,
		participants
	};
}

function toLifecycleEvent(
	type: MediaCallLifecycleEvent['type'],
	call: DirectCall
): MediaCallLifecycleEvent {
	return {
		type,
		call,
		timestamp: new Date().toISOString()
	};
}

function splitUrls(value: string | undefined) {
	return String(value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function isRingingCallStale(call: { status: string; createdAt: Date }) {
	return (
		call.status === 'ringing' &&
		Date.now() - call.createdAt.getTime() >= RINGING_TIMEOUT_MS
	);
}

export const mediaService = {
	async normalizeCallState(
		call:
			| Awaited<ReturnType<typeof mediaRepository.findCallById>>
			| Awaited<ReturnType<typeof mediaRepository.findLatestOpenCallByConversationId>>
	) {
		if (!call || !isRingingCallStale(call)) {
			return call;
		}

		const expired = await mediaRepository.expireRingingCall(call.id);

		if (expired) {
			const payload = serializeCall(expired, expired.initiatedByUserId);

			if (payload) {
				await Promise.all([
					getAblyRestClient()
						.channels.get(getChatChannelName(expired.conversationId))
						.publish('call.missed', toLifecycleEvent('call.missed', payload)),
					getAblyRestClient()
						.channels.get(getCallChannelName(expired.id))
						.publish('call.missed', toLifecycleEvent('call.missed', payload))
				]);
			}
		}

		return expired;
	},

	async getConversationActiveCall(actor: AuthActor, conversationId: string) {
		await chatService.assertConversationMembership(actor, conversationId);

		const call = await this.normalizeCallState(
			await mediaRepository.findLatestOpenCallByConversationId(
				parseUuid(conversationId, 'conversationId')
			)
		);

		return serializeCall(call, actor.userId);
	},

	async createDirectCall(actor: AuthActor, input: unknown) {
		const parsed = createDirectCallSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Call data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const conversationId = await chatService.assertConversationMembership(
			actor,
			parsed.data.conversationId
		);
		const conversation = await mediaRepository.findConversationWithMembers(
			conversationId
		);

		if (!conversation) {
			throw new NotFoundError('Conversation not found.', {
				conversationId
			});
		}

		if (conversation.kind !== 'direct' || conversation.members.length !== 2) {
			throw new ValidationError(
				'Direct calls are only available for direct conversations.'
			);
		}

		const existingCall = await this.normalizeCallState(
			await mediaRepository.findLatestOpenCallByConversationId(conversationId)
		);

		if (existingCall) {
			throw new ConflictError('This conversation already has an active call.');
		}

		const actorOpenCalls = await mediaRepository.findOpenCallsByUserId(actor.userId);
		const isActorBusy = actorOpenCalls.some((entry) =>
			['ringing', 'active'].includes(entry.callSession.status)
		);

		if (isActorBusy) {
			throw new ConflictError('You are already in another active call.');
		}

		const callee = conversation.members.find((member) => member.userId !== actor.userId);

		if (!callee) {
			throw new ValidationError('Conversation participant not found.');
		}

		const calleeOpenCalls = await mediaRepository.findOpenCallsByUserId(
			callee.userId
		);
		const isCalleeBusy = calleeOpenCalls.some((entry) =>
			['ringing', 'active'].includes(entry.callSession.status)
		);

		if (isCalleeBusy) {
			throw new ConflictError('The other participant is already busy.');
		}

		const createdCall = await mediaRepository.createDirectCall({
			conversationId,
			callerUserId: actor.userId,
			calleeUserId: callee.userId
		});
		const call = serializeCall(createdCall, actor.userId);

		if (!call) {
			throw new Error('Unable to load created call.');
		}

		await getAblyRestClient()
			.channels.get(getChatChannelName(conversationId))
			.publish('call.invited', toLifecycleEvent('call.invited', call));

		return call;
	},

	async acceptDirectCall(actor: AuthActor, callId: string) {
		const safeCallId = callIdSchema.parse(callId);
		const existing = await this.normalizeCallState(
			await mediaRepository.findCallById(safeCallId)
		);

		if (!existing) {
			throw new NotFoundError('Call not found.', { callId: safeCallId });
		}

		const participant = existing.participants.find(
			(entry) => entry.userId === actor.userId
		);

		if (!participant) {
			throw new AuthorizationError('You cannot join this call.');
		}

		if (existing.status !== 'ringing') {
			throw new ConflictError('This call is no longer ringing.');
		}

		if (participant.role !== 'callee') {
			throw new ConflictError('Only the invited participant can accept the call.');
		}

		const updatedCall = await mediaRepository.acceptCall(safeCallId, actor.userId);
		const call = serializeCall(updatedCall, actor.userId);

		if (!call) {
			throw new Error('Unable to load accepted call.');
		}

		await getAblyRestClient()
			.channels.get(getChatChannelName(call.conversationId))
			.publish('call.accepted', toLifecycleEvent('call.accepted', call));

		return call;
	},

	async declineDirectCall(actor: AuthActor, callId: string) {
		const safeCallId = callIdSchema.parse(callId);
		const existing = await this.normalizeCallState(
			await mediaRepository.findCallById(safeCallId)
		);

		if (!existing) {
			throw new NotFoundError('Call not found.', { callId: safeCallId });
		}

		const participant = existing.participants.find(
			(entry) => entry.userId === actor.userId
		);

		if (!participant) {
			throw new AuthorizationError('You cannot decline this call.');
		}

		if (existing.status !== 'ringing') {
			throw new ConflictError('This call is no longer ringing.');
		}

		const updatedCall = await mediaRepository.declineCall(safeCallId, actor.userId);
		const call = serializeCall(updatedCall, actor.userId);

		if (!call) {
			throw new Error('Unable to load declined call.');
		}

		await getAblyRestClient()
			.channels.get(getChatChannelName(call.conversationId))
			.publish('call.declined', toLifecycleEvent('call.declined', call));

		return call;
	},

	async endDirectCall(actor: AuthActor, callId: string, input: unknown) {
		const parsed = endCallSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Call end request is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const safeCallId = callIdSchema.parse(callId);
		const existing = await this.normalizeCallState(
			await mediaRepository.findCallById(safeCallId)
		);

		if (!existing) {
			throw new NotFoundError('Call not found.', { callId: safeCallId });
		}

		const isParticipant = existing.participants.some(
			(participant) => participant.userId === actor.userId
		);

		if (!isParticipant) {
			throw new AuthorizationError('You cannot end this call.');
		}

		if (!['ringing', 'active'].includes(existing.status)) {
			throw new ConflictError('This call has already ended.');
		}

		const updatedCall = await mediaRepository.endCall(
			safeCallId,
			parsed.data.endedReason?.trim() || 'ended'
		);
		const call = serializeCall(updatedCall, actor.userId);

		if (!call) {
			throw new Error('Unable to load ended call.');
		}

		await Promise.all([
			getAblyRestClient()
				.channels.get(getChatChannelName(call.conversationId))
				.publish('call.ended', toLifecycleEvent('call.ended', call)),
			getAblyRestClient()
				.channels.get(getCallChannelName(call.id))
				.publish('call.ended', toLifecycleEvent('call.ended', call))
		]);

		return call;
	},

	async getDirectCall(actor: AuthActor, callId: string) {
		const safeCallId = parseUuid(callId, 'callId');
		const call = await this.normalizeCallState(
			await mediaRepository.findCallById(safeCallId)
		);

		if (!call) {
			throw new NotFoundError('Call not found.', { callId: safeCallId });
		}

		const isParticipant = call.participants.some(
			(participant) => participant.userId === actor.userId
		);

		if (!isParticipant) {
			throw new AuthorizationError('You cannot access this call.');
		}

		const serialized = serializeCall(call, actor.userId);

		if (!serialized) {
			throw new Error('Unable to serialize call.');
		}

		return serialized;
	},

	async assertCallParticipation(actor: AuthActor, callId: string) {
		const safeCallId = parseUuid(callId, 'callId');
		const isParticipant = await mediaRepository.isCallParticipant(
			safeCallId,
			actor.userId
		);

		if (!isParticipant) {
			throw new AuthorizationError('You cannot access this call.');
		}

		return safeCallId;
	},

	async updateParticipantMediaState(
		actor: AuthActor,
		callId: string,
		input: unknown
	) {
		const parsed = updateParticipantMediaStateSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Media state is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const call = await this.getDirectCall(actor, callId);

		if (call.status !== 'active') {
			throw new ConflictError('Media state can only be updated during an active call.');
		}

		const payload: ParticipantMediaStateEvent = {
			callId: call.id,
			userId: actor.userId,
			micEnabled: parsed.data.micEnabled,
			cameraEnabled: parsed.data.cameraEnabled,
			timestamp: new Date().toISOString()
		};

		await getAblyRestClient()
			.channels.get(getCallChannelName(call.id))
			.publish('participant.media-state.updated', payload);

		return payload;
	},

	getIceServers() {
		const iceServers: WebRtcIceServer[] = [];
		const stunUrls = splitUrls(process.env.WEBRTC_STUN_URLS);
		const turnUrls = splitUrls(process.env.WEBRTC_TURN_URLS);

		if (stunUrls.length > 0) {
			iceServers.push({
				urls: stunUrls
			});
		}

		if (turnUrls.length > 0) {
			iceServers.push({
				urls: turnUrls,
				username: process.env.WEBRTC_TURN_USERNAME?.trim(),
				credential: process.env.WEBRTC_TURN_CREDENTIAL?.trim()
			});
		}

		if (iceServers.length === 0) {
			iceServers.push({
				urls: ['stun:stun.l.google.com:19302']
			});
		}

		return iceServers;
	}
};
