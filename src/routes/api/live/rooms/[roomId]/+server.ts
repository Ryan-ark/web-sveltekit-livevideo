import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { liveService } from '$server/features/live/live.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const GET: RequestHandler = async (event) => {
	const actor = requireAuth(event);

	try {
		return json({
			room: await liveService.getRoom(actor, event.params.roomId)
		});
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
