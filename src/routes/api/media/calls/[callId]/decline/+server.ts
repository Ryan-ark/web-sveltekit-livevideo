import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { mediaService } from '$server/features/media/media.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const POST: RequestHandler = async (event) => {
	const actor = requireAuth(event);

	try {
		const call = await mediaService.declineDirectCall(actor, event.params.callId);
		return json({ call });
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
