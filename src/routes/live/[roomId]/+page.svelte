<script lang="ts">
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	import { createLiveRoomController } from '$lib/features/live/client/live-room-controller';
	import Button from '$ui/components/button.svelte';
	import FormField from '$ui/components/form-field.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type LiveRoom = PageData['room'];
	type LiveRoomConnectionInfo = {
		roomId: string;
		sessionId: string;
		currentUserRole: 'host' | 'viewer';
		hostUserId: string;
		realtimeAuthUrl: string;
		iceServers: RTCIceServer[];
	};

	let roomState = $state<LiveRoom | null>(null);
	const room = $derived(roomState ?? data.room);
	const isHost = $derived(room.currentUserRole === 'host');
	const approvedViewers = $derived(
		room.members.filter((member) => member.role === 'viewer')
	);
	let localVideoElement = $state<HTMLVideoElement | null>(null);
	let remoteVideoElement = $state<HTMLVideoElement | null>(null);
	let liveConnectionState = $state('idle');
	let liveNotice = $state('');
	let liveError = $state('');
	let isConnectingLive = $state(false);
	let roomRefreshTimer: ReturnType<typeof setInterval> | null = null;
	let isMounted = $state(false);
	const currentUserId = $derived(data.auth.user?.id ?? '');

	function log(...args: unknown[]) {
		if (import.meta.env.DEV) {
			console.log('[live-room-page]', ...args);
		}
	}

	const liveRoomController = createLiveRoomController({
		onConnectionStateChange: (state) => {
			liveConnectionState = state;
			isConnectingLive = state === 'preparing' || state === 'connecting' || state === 'new';

			if (state === 'connected') {
				liveNotice = isHost ? 'Broadcast connected.' : 'Live stream connected.';
				liveError = '';
			} else if (state === 'disconnected') {
				liveNotice = isHost
					? 'Viewer disconnected. Waiting for reconnect...'
					: 'Host disconnected. Waiting for reconnect...';
			}
		},
		onError: (message) => {
			liveError = message;
			isConnectingLive = false;
		}
	});

	$effect(() => {
		roomState = form?.room ?? data.room;
	});

	$effect(() => {
		liveRoomController.setMediaElements(localVideoElement, remoteVideoElement);
	});

	$effect(() => {
		if (!isMounted) {
			return;
		}

		if (roomRefreshTimer) {
			clearInterval(roomRefreshTimer);
			roomRefreshTimer = null;
		}

		roomRefreshTimer = setInterval(() => {
			void refreshRoom();
		}, room.status === 'live' ? 10000 : 5000);

		return () => {
			if (roomRefreshTimer) {
				clearInterval(roomRefreshTimer);
				roomRefreshTimer = null;
			}
		};
	});

	$effect(() => {
		if (!isMounted) {
			return;
		}

		if (room.status === 'live' && room.activeSession) {
			void connectToLiveRoom();
			return;
		}

		liveNotice = room.status === 'ended' ? 'This live room has ended.' : '';
		isConnectingLive = false;
		liveConnectionState = 'idle';
		void liveRoomController.disconnect();
	});

	async function refreshRoom() {
		try {
			const response = await fetch(`/api/live/rooms/${room.id}`);
			const payload = await response.json();
			log('refresh room response', {
				roomId: room.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				return;
			}

			roomState = payload.room as LiveRoom;
		} catch {
			// Ignore polling failures and keep current room snapshot.
		}
	}

	async function connectToLiveRoom() {
		if (liveConnectionState !== 'idle' && liveConnectionState !== 'closed') {
			log('connectToLiveRoom skipped due to state', {
				roomId: room.id,
				liveConnectionState
			});
			return;
		}

		liveError = '';
		liveNotice = isHost ? 'Starting camera and broadcast...' : 'Connecting to host stream...';
		isConnectingLive = true;
		log('connectToLiveRoom start', {
			roomId: room.id,
			role: room.currentUserRole
		});

		try {
			const response = await fetch(`/api/live/rooms/${room.id}/connection`);
			const payload = (await response.json()) as
				| LiveRoomConnectionInfo
				| { message?: string };
			log('connection endpoint response', {
				roomId: room.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				throw new Error(
					'message' in payload
						? payload.message ?? 'Unable to connect the live room.'
						: 'Unable to connect the live room.'
				);
			}

			await liveRoomController.connect({
				...(payload as LiveRoomConnectionInfo),
				currentUserId
			});

			liveNotice = isHost ? 'Broadcast connected.' : 'Live stream connected.';
			log('connectToLiveRoom complete', { roomId: room.id });
		} catch (caught) {
			log('connectToLiveRoom error', caught);
			liveError =
				caught instanceof Error ? caught.message : 'Unable to connect the live room.';
		} finally {
			isConnectingLive = false;
		}
	}

	onMount(() => {
		isMounted = true;

		return () => {
			isMounted = false;
			if (roomRefreshTimer) {
				clearInterval(roomRefreshTimer);
			}
			void liveRoomController.disconnect();
		};
	});
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

		{#if liveNotice}
			<div
				class="mt-4 rounded-3xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-sm text-ink"
			>
				{liveNotice}
			</div>
		{/if}

		{#if form?.message}
			<div
				class="mt-4 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{form.message}
			</div>
		{/if}

		{#if liveError}
			<div
				class="mt-4 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{liveError}
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

		<div class="mt-8 grid gap-4">
			{#if room.status === 'live'}
				{#if isHost}
					<div class="overflow-hidden rounded-[1.75rem] border border-line bg-ink">
						<video
							class="aspect-video w-full bg-black object-cover"
							autoplay
							playsinline
							muted
							bind:this={localVideoElement}
						></video>
						<div class="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/80">
							<span>You are live</span>
							<span>{isConnectingLive ? 'Connecting' : liveConnectionState}</span>
						</div>
					</div>
				{:else}
					<div class="overflow-hidden rounded-[1.75rem] border border-line bg-ink">
						<video
							class="aspect-video w-full bg-black object-cover"
							autoplay
							playsinline
							bind:this={remoteVideoElement}
						></video>
						<div class="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/80">
							<span>{room.host.name}</span>
							<span>{isConnectingLive ? 'Connecting' : liveConnectionState}</span>
						</div>
					</div>
				{/if}
			{:else}
				<div class="rounded-[1.75rem] border border-dashed border-line bg-canvas/40 p-6">
					<p class="text-sm font-semibold text-ink">Streaming status</p>
					<p class="mt-2 text-sm text-muted">
						{#if isHost}
							Start the live room to open your camera preview and begin broadcasting to approved viewers.
						{:else}
							When the host starts this room, the live video will appear here automatically.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</section>
</section>
