import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { mediaService } from '$server/features/media/media.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const POST: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const body = await event.request.json();

	try {
		const call = await mediaService.createDirectCall(actor, {
			conversationId: body?.conversationId ?? ''
		});

		return json({ call }, { status: 201 });
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
