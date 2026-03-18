import { z } from 'zod';

const messageBodySchema = z
	.string()
	.trim()
	.min(1, 'Message cannot be empty.')
	.max(1000, 'Message cannot exceed 1000 characters.');

export const createDirectConversationSchema = z.object({
	memberUserId: z.string().min(1, 'Recipient is required.')
});

export const conversationIdSchema = z.uuid();

export const sendChatMessageSchema = z.object({
	conversationId: conversationIdSchema,
	body: messageBodySchema
});
