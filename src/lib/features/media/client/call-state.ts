export type DirectCallRecord = {
	status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'failed';
	currentParticipantRole: 'caller' | 'callee' | null;
};

export type DirectCallUiState =
	| 'idle'
	| 'outgoing-ringing'
	| 'incoming-ringing'
	| 'connecting-media'
	| 'active'
	| 'ended'
	| 'failed';

export function getDirectCallUiState(
	call: DirectCallRecord | null,
	isConnecting: boolean
): DirectCallUiState {
	if (!call) {
		return 'idle';
	}

	if (call.status === 'ringing') {
		return call.currentParticipantRole === 'callee'
			? 'incoming-ringing'
			: 'outgoing-ringing';
	}

	if (call.status === 'active') {
		return isConnecting ? 'connecting-media' : 'active';
	}

	if (call.status === 'failed') {
		return 'failed';
	}

	return 'ended';
}

export function getDirectCallStatusLabel(uiState: DirectCallUiState) {
	switch (uiState) {
		case 'incoming-ringing':
			return 'Incoming call';
		case 'outgoing-ringing':
			return 'Calling...';
		case 'connecting-media':
			return 'Connecting media...';
		case 'active':
			return 'Live call';
		case 'failed':
			return 'Call failed';
		case 'ended':
			return 'Call ended';
		default:
			return 'No active call';
	}
}
