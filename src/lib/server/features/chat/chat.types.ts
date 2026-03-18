export type ChatParticipant = {
	id: string;
	name: string;
	email: string;
	role: string | null;
};

export type ChatMessageEvent = {
	id: string;
	conversationId: string;
	body: string;
	createdAt: string;
	sender: {
		id: string;
		name: string;
	};
};

export type ChatTypingEvent = {
	conversationId: string;
	userId: string;
	userName: string;
	state: 'started' | 'stopped';
	timestamp: string;
};
