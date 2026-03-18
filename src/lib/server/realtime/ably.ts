import Ably from 'ably';

const DEFAULT_CHANNEL_CAPABILITY_OPERATIONS = [
	'subscribe',
	'presence',
	'history',
	'publish'
];

let restClient: Ably.Rest | null = null;

export type ChatRealtimeIdentity = {
	userId: string;
	name: string;
};

export function getAblyApiKey() {
	const apiKey = process.env.ABLY_API_KEY?.trim();

	if (!apiKey) {
		throw new Error(
			'ABLY_API_KEY is required for realtime chat. Set it in your environment before using chat routes.'
		);
	}

	return apiKey;
}

export function getAblyRestClient() {
	if (!restClient) {
		restClient = new Ably.Rest({
			key: getAblyApiKey()
		});
	}

	return restClient;
}

export function getChatChannelName(conversationId: string) {
	return `private:chat:${conversationId}`;
}

export function getCallChannelName(callId: string) {
	return `private:call:${callId}`;
}

async function createScopedTokenRequest(
	identity: ChatRealtimeIdentity,
	channelName: string
) {
	const client = getAblyRestClient();

	return client.auth.createTokenRequest({
		clientId: identity.userId,
		capability: JSON.stringify({
			[channelName]: DEFAULT_CHANNEL_CAPABILITY_OPERATIONS
		})
	});
}

export async function createChatTokenRequest(
	identity: ChatRealtimeIdentity,
	conversationId: string
) {
	const channelName = getChatChannelName(conversationId);
	return createScopedTokenRequest(identity, channelName);
}

export async function createCallTokenRequest(
	identity: ChatRealtimeIdentity,
	callId: string
) {
	return createScopedTokenRequest(identity, getCallChannelName(callId));
}
