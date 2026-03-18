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
		<p class="kicker">Live Rooms</p>
		<h1 class="page-title mt-3">Create a private live room</h1>
		<p class="page-copy mt-4">
			Start the Phase B room workflow. Hosts create rooms first, then approve viewers.
		</p>

		<form class="mt-6 space-y-5" method="POST" action="?/createRoom">
			{#if form?.intent === 'create-live-room' && form?.message}
				<div
					class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{form.message}
				</div>
			{/if}

			<FormField
				label="Room title"
				forId="title"
				error={form?.intent === 'create-live-room' ? form.errors?.title?.[0] : undefined}
				hint="This creates the room shell. Streaming is added in the next phase."
			>
				{#snippet children()}
					<input
						id="title"
						name="title"
						class="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
						value={form?.form?.title ?? ''}
						placeholder="Weekly demo room"
						required
					/>
				{/snippet}
			</FormField>

			<Button type="submit" block>Create room</Button>
		</form>
	</aside>

	<section class="panel p-6 sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Your Rooms</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Private live room access
				</h2>
			</div>
			<p class="text-sm text-muted">{data.rooms.length} room(s)</p>
		</div>

		{#if data.rooms.length === 0}
			<div class="mt-6">
				<EmptyState
					title="No live rooms yet"
					copy="Create the first room to start configuring a host and approved viewers."
				/>
			</div>
		{:else}
			<div class="mt-6 space-y-4">
				{#each data.rooms as room}
					<a
						class="block rounded-[1.75rem] border border-line bg-white/90 p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand"
						href={`/live/${room.id}`}
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-display text-2xl font-semibold text-ink">
									{room.title}
								</h3>
								<p class="mt-1 text-sm text-muted">
									{room.isHost ? 'You are the host' : 'Viewer access granted'}
								</p>
							</div>
							<div class="text-right text-xs uppercase tracking-[0.16em] text-muted">
								<p>{room.status}</p>
								<p class="mt-1">{formatDate(room.updatedAt)}</p>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</section>
