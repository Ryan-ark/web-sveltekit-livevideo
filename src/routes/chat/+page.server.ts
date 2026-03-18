import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

import { requireAuth } from '$server/auth/guards';
import { chatService } from '$server/features/chat/chat.service';
import { getHttpErrorDetails } from '$server/shared/errors/http-error-map';

export const load: PageServerLoad = async (event) => {
	const actor = requireAuth(event);

	return {
		conversations: await chatService.listConversations(actor),
		availableUsers: await chatService.listAvailableUsers(actor)
	};
};

export const actions: Actions = {
	createConversation: async (event) => {
		const actor = requireAuth(event);
		const formData = await event.request.formData();
		const values = {
			memberUserId: String(formData.get('memberUserId') ?? '')
		};

		try {
			const conversation = await chatService.createOrGetDirectConversation(
				actor,
				values
			);
			throw redirect(303, `/chat/${conversation.id}`);
		} catch (caught) {
			if (caught instanceof Response) {
				throw caught;
			}

			const details = getHttpErrorDetails(caught);
			return fail(details.status, {
				intent: 'create-conversation',
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
