import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { liveService } from '$server/features/live/live.service';
import { createLiveRoomTokenRequest } from '$server/realtime/ably';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const GET: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const resourceType = event.url.searchParams.get('resourceType') ?? '';
	const resourceId = event.url.searchParams.get('resourceId') ?? '';

	try {
		if (resourceType !== 'room') {
			return json(
				{
					message: 'Unsupported realtime resource type.'
				},
				{ status: 400 }
			);
		}

		const { room } = await liveService.assertRoomAccess(actor, resourceId);
		const tokenRequest = await createLiveRoomTokenRequest(
			{
				userId: actor.userId,
				name: actor.name
			},
			room.id
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
