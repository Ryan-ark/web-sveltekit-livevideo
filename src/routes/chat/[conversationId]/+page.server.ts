import { error } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { mediaService } from '$server/features/media/media.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	const actor = requireAuth(event);

	try {
		return {
			conversation: await chatService.getConversation(
				actor,
				event.params.conversationId
			),
			activeCall: await mediaService.getConversationActiveCall(
				actor,
				event.params.conversationId
			)
		};
	} catch (caught) {
		const details = getHttpErrorDetails(caught);
		throw error(details.status, details.message);
	}
};
