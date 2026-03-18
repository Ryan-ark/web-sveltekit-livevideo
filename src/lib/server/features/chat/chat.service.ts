import { getAblyRestClient, getChatChannelName } from '$server/realtime/ably';
import {
	AuthorizationError,
	NotFoundError,
	ValidationError
} from '$server/shared/errors/app-error';
import { parseUuid } from '$server/shared/utils/ids';

import {
	createDirectConversationSchema,
	sendChatMessageSchema
} from './chat.schema';
import { chatQueries } from './chat.queries';
import { chatRepository } from './chat.repository';

import type { AuthActor } from '$server/auth/permissions';
import type { ChatMessageEvent } from './chat.types';

function toMessageEvent(
	message: Awaited<ReturnType<typeof chatRepository.createMessage>>
) {
	return {
		id: message.id,
		conversationId: message.conversationId,
		body: message.body,
		createdAt: message.createdAt.toISOString(),
		sender: {
			id: message.sender.id,
			name: message.sender.name
		}
	} satisfies ChatMessageEvent;
}

export const chatService = {
	async listAvailableUsers(actor: AuthActor) {
		return chatRepository.listAvailableUsers(actor.userId);
	},

	async listConversations(actor: AuthActor) {
		return chatQueries.listConversationSummaries(actor.userId);
	},

	async getConversation(actor: AuthActor, conversationId: string) {
		const safeConversationId = parseUuid(conversationId, 'conversationId');
		const isMember = await chatRepository.isConversationMember(
			safeConversationId,
			actor.userId
		);

		if (!isMember) {
			throw new AuthorizationError('You cannot access this conversation.');
		}

		const conversation = await chatQueries.getConversationDetails(
			safeConversationId,
			actor.userId
		);

		if (!conversation) {
			throw new NotFoundError('Conversation not found.', {
				conversationId: safeConversationId
			});
		}

		return conversation;
	},

	async createOrGetDirectConversation(actor: AuthActor, input: unknown) {
		const parsed = createDirectConversationSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Conversation data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		if (parsed.data.memberUserId === actor.userId) {
			throw new ValidationError(
				'You cannot start a direct conversation with yourself.',
				{
					fieldErrors: {
						memberUserId: ['Choose another user.']
					}
				}
			);
		}

		const [recipient] = await chatRepository.findUsersByIds([
			parsed.data.memberUserId
		]);

		if (!recipient) {
			throw new NotFoundError('User not found.', {
				userId: parsed.data.memberUserId
			});
		}

		const existing = await chatRepository.findDirectConversationByUserIds(
			actor.userId,
			parsed.data.memberUserId
		);

		if (existing) {
			return existing;
		}

		return chatRepository.createDirectConversation({
			createdByUserId: actor.userId,
			memberUserIds: [actor.userId, parsed.data.memberUserId]
		});
	},

	async createMessage(actor: AuthActor, input: unknown) {
		const parsed = sendChatMessageSchema.safeParse(input);

		if (!parsed.success) {
			throw new ValidationError('Message data is invalid.', {
				fieldErrors: parsed.error.flatten().fieldErrors
			});
		}

		const isMember = await chatRepository.isConversationMember(
			parsed.data.conversationId,
			actor.userId
		);

		if (!isMember) {
			throw new AuthorizationError(
				'You cannot send messages to this conversation.'
			);
		}

		const message = await chatRepository.createMessage({
			conversationId: parsed.data.conversationId,
			senderUserId: actor.userId,
			body: parsed.data.body
		});

		const payload = toMessageEvent(message);

		await getAblyRestClient()
			.channels.get(getChatChannelName(parsed.data.conversationId))
			.publish('message.created', payload);

		return payload;
	},

	async assertConversationMembership(actor: AuthActor, conversationId: string) {
		const safeConversationId = parseUuid(conversationId, 'conversationId');
		const isMember = await chatRepository.isConversationMember(
			safeConversationId,
			actor.userId
		);

		if (!isMember) {
			throw new AuthorizationError('You cannot access this conversation.');
		}

		return safeConversationId;
	}
};
