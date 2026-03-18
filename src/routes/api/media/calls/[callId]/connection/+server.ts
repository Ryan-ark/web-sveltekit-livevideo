import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { mediaService } from '$server/features/media/media.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const GET: RequestHandler = async (event) => {
	const actor = requireAuth(event);

	try {
		const call = await mediaService.getDirectCall(actor, event.params.callId);
		return json({
			call,
			iceServers: mediaService.getIceServers(),
			realtimeAuthUrl: `/api/media/realtime-token?resourceType=call&resourceId=${call.id}`
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
