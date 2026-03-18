export type DirectCallStatus =
	| 'ringing'
	| 'active'
	| 'ended'
	| 'declined'
	| 'missed'
	| 'failed';

export type DirectCallParticipant = {
	userId: string;
	name: string;
	email: string;
	role: 'caller' | 'callee';
	joinStatus: 'invited' | 'joined' | 'declined' | 'missed' | 'left';
};

export type DirectCall = {
	id: string;
	conversationId: string;
	status: DirectCallStatus;
	initiatedByUserId: string;
	startedAt: string | null;
	endedAt: string | null;
	endedReason: string | null;
	currentParticipantRole: 'caller' | 'callee' | null;
	participants: DirectCallParticipant[];
};

export type MediaCallLifecycleEvent = {
	type:
		| 'call.invited'
		| 'call.accepted'
		| 'call.declined'
		| 'call.ended'
		| 'call.missed';
	call: DirectCall;
	timestamp: string;
};

export type ParticipantMediaStateEvent = {
	callId: string;
	userId: string;
	micEnabled: boolean;
	cameraEnabled: boolean;
	timestamp: string;
};

export type WebRtcSignalPayload = {
	callId: string;
	fromUserId: string;
	description?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
};

export type WebRtcIceServer = {
	urls: string | string[];
	username?: string;
	credential?: string;
};
