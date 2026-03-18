import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { mediaService } from '$server/features/media/media.service';
import { createCallTokenRequest } from '$server/realtime/ably';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const GET: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const resourceType = event.url.searchParams.get('resourceType') ?? '';
	const resourceId = event.url.searchParams.get('resourceId') ?? '';

	try {
		if (resourceType !== 'call') {
			return json(
				{
					message: 'Unsupported realtime resource type.'
				},
				{ status: 400 }
			);
		}

		const callId = await mediaService.assertCallParticipation(actor, resourceId);
		const tokenRequest = await createCallTokenRequest(
			{
				userId: actor.userId,
				name: actor.name
			},
			callId
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
