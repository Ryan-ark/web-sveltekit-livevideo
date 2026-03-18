import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { createChatTokenRequest } from '$server/realtime/ably';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const GET: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const conversationId = event.url.searchParams.get('conversationId') ?? '';

	try {
		const safeConversationId = await chatService.assertConversationMembership(
			actor,
			conversationId
		);
		const tokenRequest = await createChatTokenRequest(
			{
				userId: actor.userId,
				name: actor.name
			},
			safeConversationId
		);

		return json(tokenRequest);
	} catch (caught) {
		const details = getHttpErrorDetails(caught);
		return json(
			{
				message: details.message
			},
			{ status: details.status }
		);
	}
};
