<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import EmptyState from '$ui/components/empty-state.svelte';
	import FormField from '$ui/components/form-field.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function formatDate(value: string | Date) {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}
</script>

<section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
	<aside class="panel h-fit p-6 sm:p-8">
		<p class="kicker">Direct Chat</p>
		<h1 class="page-title mt-3">Start a conversation</h1>
		<p class="page-copy mt-4">
			Create or reopen a direct chat with another authenticated user.
		</p>

		<form class="mt-6 space-y-5" method="POST" action="?/createConversation">
			{#if form?.intent === 'create-conversation' && form?.message}
				<div
					class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{form.message}
				</div>
			{/if}

			<FormField
				label="User"
				forId="memberUserId"
				error={form?.intent === 'create-conversation'
					? form.errors?.memberUserId?.[0]
					: undefined}
				hint="Only direct 1:1 chat is enabled in the first iteration."
			>
				{#snippet children()}
					<select
						id="memberUserId"
						name="memberUserId"
						class="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
						required
					>
						<option value="">Select a user</option>
						{#each data.availableUsers as user}
							<option
								value={user.id}
								selected={form?.form?.memberUserId === user.id}
							>
								{user.name} ({user.email})
							</option>
						{/each}
					</select>
				{/snippet}
			</FormField>

			<Button type="submit" block>Open chat</Button>
		</form>
	</aside>

	<section class="panel p-6 sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Conversations</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Your active chats
				</h2>
			</div>
			<p class="text-sm text-muted">
				{data.conversations.length} conversation(s)
			</p>
		</div>

		{#if data.conversations.length === 0}
			<div class="mt-6">
				<EmptyState
					title="No conversations yet"
					copy="Start a direct chat to test realtime messaging and typing indicators."
				/>
			</div>
		{:else}
			<div class="mt-6 space-y-4">
				{#each data.conversations as conversation}
					<a
						class="block rounded-[1.75rem] border border-line bg-white/90 p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand"
						href={`/chat/${conversation.id}`}
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-display text-2xl font-semibold text-ink">
									{conversation.counterpart?.name ?? 'Direct conversation'}
								</h3>
								<p class="mt-1 text-sm text-muted">
									{conversation.counterpart?.email ?? 'Unknown participant'}
								</p>
							</div>
							<p class="text-xs uppercase tracking-[0.16em] text-muted">
								{formatDate(conversation.updatedAt)}
							</p>
						</div>

						<p class="mt-4 text-sm leading-6 text-muted">
							{#if conversation.latestMessage}
								<span class="font-semibold text-ink">
									{conversation.latestMessage.sender.id === data.auth.user?.id
										? 'You'
										: conversation.latestMessage.sender.name}:
								</span>
								{conversation.latestMessage.body}
							{:else}
								No messages yet. Open the conversation to send the first one.
							{/if}
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</section>
