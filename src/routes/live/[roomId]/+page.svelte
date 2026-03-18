<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import FormField from '$ui/components/form-field.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const room = $derived(form?.room ?? data.room);
	const isHost = $derived(room.currentUserRole === 'host');
	const approvedViewers = $derived(
		room.members.filter((member) => member.role === 'viewer')
	);
</script>

<section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
	<aside class="panel h-fit p-6 sm:p-8">
		<p class="kicker">Live Room</p>
		<h1 class="page-title mt-3">{room.title}</h1>
		<p class="mt-4 text-sm text-muted">
			Host: {room.host.name} ({room.host.email})
		</p>

		<div class="mt-6 rounded-3xl border border-line bg-canvas/60 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
				Status
			</p>
			<p class="mt-2 text-sm font-semibold text-ink">{room.status}</p>
			<p class="mt-1 text-xs text-muted">
				{#if room.activeSession}
					Session status: {room.activeSession.status}
				{:else}
					No live session started yet.
				{/if}
			</p>
		</div>

		{#if form?.message}
			<div
				class="mt-4 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{form.message}
			</div>
		{/if}

		{#if isHost}
			<div class="mt-6 flex flex-wrap gap-3">
				{#if room.status !== 'live'}
					<form method="POST" action="?/startRoom">
						<Button type="submit">Start live room</Button>
					</form>
				{/if}
				{#if room.status === 'live'}
					<form method="POST" action="?/endRoom">
						<Button type="submit" variant="danger">End live room</Button>
					</form>
				{/if}
			</div>
		{/if}

		<div class="mt-6">
			<a class="text-sm font-semibold no-underline" href="/live">
				Back to live rooms
			</a>
		</div>
	</aside>

	<section class="panel p-6 sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Approved Access</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Viewers and room access
				</h2>
			</div>
			<p class="text-sm text-muted">{approvedViewers.length} viewer(s)</p>
		</div>

		{#if isHost}
			<form class="mt-6 space-y-5" method="POST" action="?/addViewer">
				<FormField
					label="Add viewer"
					forId="userId"
					error={form?.intent === 'add-viewer' ? form.errors?.userId?.[0] : undefined}
					hint="Approve which authenticated users can access this room."
				>
					{#snippet children()}
						<select
							id="userId"
							name="userId"
							class="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
							required
						>
							<option value="">Select a user</option>
							{#each data.availableUsers as user}
								<option
									value={user.id}
									selected={form?.form?.userId === user.id}
								>
									{user.name} ({user.email})
								</option>
							{/each}
						</select>
					{/snippet}
				</FormField>

				<Button type="submit">Approve viewer</Button>
			</form>
		{/if}

		<div class="mt-6 space-y-4">
			{#each room.members as member}
				<div class="rounded-[1.5rem] border border-line bg-white/90 p-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<h3 class="font-semibold text-ink">{member.name}</h3>
							<p class="mt-1 text-sm text-muted">{member.email}</p>
						</div>
						<div class="text-right text-xs uppercase tracking-[0.16em] text-muted">
							<p>{member.role}</p>
							<p class="mt-1">{member.joinStatus}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-8 rounded-[1.75rem] border border-dashed border-line bg-canvas/40 p-6">
			<p class="text-sm font-semibold text-ink">Streaming status</p>
			<p class="mt-2 text-sm text-muted">
				Phase B foundation is now in place: room creation, approved viewers, and host start/end state.
				The actual host camera broadcast and watcher playback are still the next implementation step.
			</p>
		</div>
	</section>
</section>
