import { z } from 'zod';

export const createDirectCallSchema = z.object({
	conversationId: z.uuid()
});

export const callIdSchema = z.uuid();

export const endCallSchema = z.object({
	endedReason: z.string().trim().max(120).optional()
});

export const updateParticipantMediaStateSchema = z.object({
	micEnabled: z.boolean(),
	cameraEnabled: z.boolean()
});
