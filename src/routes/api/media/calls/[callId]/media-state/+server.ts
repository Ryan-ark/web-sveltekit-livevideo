import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { requireAuth } from '$server/auth/guards';
import { mediaService } from '$server/features/media/media.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const POST: RequestHandler = async (event) => {
	const actor = requireAuth(event);
	const body = await event.request.json().catch(() => ({}));

	try {
		const mediaState = await mediaService.updateParticipantMediaState(
			actor,
			event.params.callId,
			{
				micEnabled: body?.micEnabled,
				cameraEnabled: body?.cameraEnabled
			}
		);

		return json({ mediaState });
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
