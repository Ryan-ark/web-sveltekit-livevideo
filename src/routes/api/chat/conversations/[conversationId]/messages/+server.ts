import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const POST: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const { conversationId } = event.params;
	const body = await event.request.json();

	try {
		const message = await chatService.createMessage(actor, {
			conversationId,
			body: body?.body ?? ''
		});

		return json({
			message
		});
	} catch (caught) {
		const details = getHttpErrorDetails(caught);
		return json(
			{
				message: details.message,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {}
			},
			{ status: details.status }
		);
	}
};
