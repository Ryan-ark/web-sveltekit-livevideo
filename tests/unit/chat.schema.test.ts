import { describe, expect, it } from 'vitest';

import {
	createDirectConversationSchema,
	sendChatMessageSchema
} from '../../src/lib/server/features/chat/chat.schema';

describe('chat schema', () => {
	it('accepts a valid direct conversation request', () => {
		const result = createDirectConversationSchema.safeParse({
			memberUserId: 'user_123'
		});

		expect(result.success).toBe(true);
	});

	it('rejects an empty message body', () => {
		const result = sendChatMessageSchema.safeParse({
			conversationId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
			body: '   '
		});

		expect(result.success).toBe(false);
	});

	it('rejects an invalid conversation id', () => {
		const result = sendChatMessageSchema.safeParse({
			conversationId: 'invalid-id',
			body: 'Hello there'
		});

		expect(result.success).toBe(false);
	});
});
