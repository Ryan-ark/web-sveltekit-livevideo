export type LiveRoomSummary = {
	id: string;
	title: string;
	status: 'idle' | 'live' | 'ended';
	isHost: boolean;
	canView: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type LiveRoomDetail = {
	id: string;
	title: string;
	status: 'idle' | 'live' | 'ended';
	host: {
		id: string;
		name: string;
		email: string;
	};
	members: Array<{
		userId: string;
		name: string;
		email: string;
		role: 'host' | 'viewer';
		joinStatus: 'approved' | 'joined' | 'left' | 'removed';
	}>;
	activeSession: {
		id: string;
		status: 'starting' | 'live' | 'ended' | 'failed';
		startedAt: string;
		endedAt: string | null;
	} | null;
	currentUserRole: 'host' | 'viewer' | null;
};

export type LiveRoomConnectionInfo = {
	roomId: string;
	sessionId: string;
	currentUserRole: 'host' | 'viewer';
	hostUserId: string;
	realtimeAuthUrl: string;
	iceServers: Array<{
		urls: string | string[];
		username?: string;
		credential?: string;
	}>;
};
