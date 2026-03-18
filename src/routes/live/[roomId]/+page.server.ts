import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { liveService } from '$server/features/live/live.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	const actor = requireAuth(event);

	return {
		room: await liveService.getRoom(actor, event.params.roomId),
		availableUsers: await chatService.listAvailableUsers(actor)
	};
};

export const actions: Actions = {
	addViewer: async (event) => {
		const actor = requireAuth(event);
		const formData = await event.request.formData();
		const values = {
			userId: String(formData.get('userId') ?? '')
		};

		try {
			return {
				intent: 'add-viewer',
				room: await liveService.addViewer(actor, event.params.roomId, values)
			};
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'add-viewer',
				form: values,
				errors:
					(details.details?.fieldErrors as
						| Record<string, string[] | undefined>
						| undefined) ?? {},
				message: details.message
			});
		}
	},

	startRoom: async (event) => {
		const actor = requireAuth(event);

		try {
			return {
				intent: 'start-room',
				room: await liveService.startRoom(actor, event.params.roomId)
			};
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'start-room',
				message: details.message
			});
		}
	},

	endRoom: async (event) => {
		const actor = requireAuth(event);

		try {
			return {
				intent: 'end-room',
				room: await liveService.endRoom(actor, event.params.roomId)
			};
		} catch (caught) {
			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'end-room',
				message: details.message
			});
		}
	}
};
