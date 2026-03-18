import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { liveService } from '$server/features/live/live.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	const actor = requireAuth(event);

	return {
		rooms: await liveService.listRooms(actor),
		availableUsers: await chatService.listAvailableUsers(actor)
	};
};

export const actions: Actions = {
	createRoom: async (event) => {
		const actor = requireAuth(event);
		const formData = await event.request.formData();
		const values = {
			title: String(formData.get('title') ?? '')
		};

		try {
			const room = await liveService.createRoom(actor, values);
			throw redirect(303, `/live/${room.id}`);
		} catch (caught) {
			if (caught instanceof Response) {
				throw caught;
			}

			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'create-live-room',
				form: values,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {},
				message: details.message
			});
		}
	}
};
