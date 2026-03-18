import { chatRepository } from './chat.repository';

export const chatQueries = {
	async listConversationSummaries(userId: string) {
		const memberships = await chatRepository.listConversationsByUserId(userId);

		return memberships
			.map(({ conversation }) => {
				const participants = conversation.members.map((member) => ({
					id: member.user.id,
					name: member.user.name,
					email: member.user.email,
					role: member.user.role
				}));
				const counterpart =
					participants.find((participant) => participant.id !== userId) ?? null;
				const latestMessage = conversation.messages[0] ?? null;

				return {
					id: conversation.id,
					kind: conversation.kind,
					participants,
					counterpart,
					latestMessage: latestMessage
						? {
								id: latestMessage.id,
								body: latestMessage.body,
								createdAt: latestMessage.createdAt,
								sender: {
									id: latestMessage.sender.id,
									name: latestMessage.sender.name
								}
							}
						: null,
					updatedAt: conversation.updatedAt
				};
			})
			.sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			);
	},

	async getConversationDetails(conversationId: string, currentUserId: string) {
		const [conversation, messages] = await Promise.all([
			chatRepository.findConversationById(conversationId),
			chatRepository.listMessagesByConversationId(conversationId)
		]);

		if (!conversation) {
			return null;
		}

		const participants = conversation.members.map((member) => ({
			id: member.user.id,
			name: member.user.name,
			email: member.user.email,
			role: member.user.role
		}));

		return {
			id: conversation.id,
			kind: conversation.kind,
			participants,
			counterpart:
				participants.find((participant) => participant.id !== currentUserId) ??
				null,
			messages: messages.map((message) => ({
				id: message.id,
				conversationId: message.conversationId,
				body: message.body,
				createdAt: message.createdAt,
				sender: {
					id: message.sender.id,
					name: message.sender.name
				}
			}))
		};
	}
};
