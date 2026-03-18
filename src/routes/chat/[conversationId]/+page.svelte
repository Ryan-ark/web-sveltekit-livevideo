<script lang="ts">
	import { onMount, tick } from 'svelte';

	import type { PageData } from './$types';

	import {
		createDirectCallController
	} from '$lib/features/media/client/direct-call-controller';
	import {
		getDirectCallStatusLabel,
		getDirectCallUiState
	} from '$lib/features/media/client/call-state';
	import Button from '$ui/components/button.svelte';

	type ChatMessage = PageData['conversation']['messages'][number];
	type DirectCall = NonNullable<PageData['activeCall']>;

	type TypingState = {
		userId: string;
		userName: string;
		expiresAt: number;
	};

	type PresenceEntry = {
		clientId: string | null;
		data?: {
			name?: string;
		};
	};

	type InboundRealtimeMessage = {
		data?: unknown;
	};

	type CallLifecyclePayload = {
		call?: DirectCall;
	};

	type CallConnectionInfo = {
		call: DirectCall;
		iceServers: RTCIceServer[];
		realtimeAuthUrl: string;
	};

	let { data }: { data: PageData } = $props();

	let messages = $state<ChatMessage[]>([]);
	let composer = $state('');
	let sendError = $state('');
	let sending = $state(false);
	let typingUsers = $state<TypingState[]>([]);
	let onlineUserIds = $state(new Set<string>());
	let activeCall = $state<PageData['activeCall']>(null);
	let callError = $state('');
	let callNotice = $state('');
	let isStartingCall = $state(false);
	let isAcceptingCall = $state(false);
	let isDecliningCall = $state(false);
	let isEndingCall = $state(false);
	let isConnectingCall = $state(false);
	let callConnectionState = $state('idle');
	let localVideoElement = $state<HTMLVideoElement | null>(null);
	let remoteVideoElement = $state<HTMLVideoElement | null>(null);
	let remoteMicEnabled = $state(true);
	let remoteCameraEnabled = $state(true);
	let micEnabled = $state(true);
	let cameraEnabled = $state(true);
	let messageContainer: HTMLDivElement | null = null;
	let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let typingExpiryTimer: ReturnType<typeof setTimeout> | null = null;
	let callRefreshTimer: ReturnType<typeof setInterval> | null = null;
	let lastTypingStartedAt = 0;
	let isMounted = false;
	let currentUserId = $derived(data.auth.user?.id ?? '');
	let callUiState = $derived(getDirectCallUiState(activeCall, isConnectingCall));

	function log(...args: unknown[]) {
		if (import.meta.env.DEV) {
			console.log('[chat-call-page]', ...args);
		}
	}

	const directCallController = createDirectCallController({
		onConnectionStateChange: (state) => {
			callConnectionState = state;
			isConnectingCall =
				state === 'preparing' || state === 'connecting' || state === 'new';
			if (state === 'connected') {
				callNotice = 'Media connected.';
				callError = '';
			} else if (state === 'disconnected') {
				callNotice = 'Media disconnected. Waiting to recover...';
			} else if (state === 'failed') {
				callNotice = '';
			}
		},
		onError: (message) => {
			callError = message;
			isConnectingCall = false;
		},
		onRemoteMediaStateChange: (state) => {
			remoteMicEnabled = state.micEnabled;
			remoteCameraEnabled = state.cameraEnabled;
		}
	});

	$effect(() => {
		messages = [...data.conversation.messages];
		typingUsers = [];
		onlineUserIds = new Set<string>();
		activeCall = data.activeCall ?? null;
		callError = '';
		callNotice = '';
	});

	$effect(() => {
		directCallController.setMediaElements(localVideoElement, remoteVideoElement);
	});

	$effect(() => {
		if (!isMounted) {
			return;
		}

		log('call ui state changed', {
			callUiState,
			activeCallId: activeCall?.id ?? null,
			callStatus: activeCall?.status ?? null,
			currentParticipantRole: activeCall?.currentParticipantRole ?? null,
			callConnectionState,
			isConnectingCall
		});

		if (callRefreshTimer) {
			clearInterval(callRefreshTimer);
			callRefreshTimer = null;
		}

		if (!activeCall) {
			return;
		}

		const refreshInterval = activeCall.status === 'ringing' ? 5000 : 15000;
		callRefreshTimer = setInterval(() => {
			void refreshActiveCall();
		}, refreshInterval);

		return () => {
			if (callRefreshTimer) {
				clearInterval(callRefreshTimer);
				callRefreshTimer = null;
			}
		};
	});

	$effect(() => {
		if (!isMounted) {
			return;
		}

		if (activeCall?.status === 'active') {
			void connectToActiveCall(activeCall);
			return;
		}

		isConnectingCall = false;
		callConnectionState = 'idle';
		micEnabled = true;
		cameraEnabled = true;
		remoteMicEnabled = true;
		remoteCameraEnabled = true;
		void directCallController.disconnect();
	});

	function formatMessageTime(value: string | Date) {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function isOwnMessage(message: ChatMessage) {
		return message.sender.id === currentUserId;
	}

	function upsertMessage(nextMessage: ChatMessage) {
		const existingIndex = messages.findIndex(
			(message) => message.id === nextMessage.id
		);

		if (existingIndex === -1) {
			messages = [...messages, nextMessage];
			void scrollToBottom();
			return;
		}

		messages = messages.map((message) =>
			message.id === nextMessage.id ? nextMessage : message
		);
	}

	async function scrollToBottom() {
		await tick();

		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	}

	function clearTypingUser(userId: string) {
		typingUsers = typingUsers.filter((entry) => entry.userId !== userId);
	}

	function scheduleTypingCleanup() {
		if (typingExpiryTimer) {
			clearTimeout(typingExpiryTimer);
		}

		if (typingUsers.length === 0) {
			return;
		}

		const nextExpiry = Math.min(...typingUsers.map((entry) => entry.expiresAt));
		const delay = Math.max(nextExpiry - Date.now(), 100);

		typingExpiryTimer = setTimeout(() => {
			const now = Date.now();
			typingUsers = typingUsers.filter((entry) => entry.expiresAt > now);
			scheduleTypingCleanup();
		}, delay);
	}

	function updateTypingUser(payload: {
		userId?: string;
		userName?: string;
		state?: 'started' | 'stopped';
	}) {
		if (!payload.userId || payload.userId === currentUserId) {
			return;
		}

		if (payload.state === 'stopped') {
			clearTypingUser(payload.userId);
			scheduleTypingCleanup();
			return;
		}

		const nextEntry: TypingState = {
			userId: payload.userId,
			userName: payload.userName || 'Someone',
			expiresAt: Date.now() + 4500
		};

		clearTypingUser(payload.userId);
		typingUsers = [...typingUsers, nextEntry];
		scheduleTypingCleanup();
	}

	function typingLabel() {
		if (typingUsers.length === 0) {
			return '';
		}

		if (typingUsers.length === 1) {
			return `${typingUsers[0].userName} is typing...`;
		}

		return 'Several people are typing...';
	}

	function isUserOnline(userId: string) {
		return onlineUserIds.has(userId);
	}

	function callCounterpart(call: DirectCall | null) {
		if (!call) {
			return null;
		}

		return (
			call.participants.find((participant) => participant.userId !== currentUserId) ??
			null
		);
	}

	function normalizeCallForCurrentUser(call: DirectCall): DirectCall {
		return {
			...call,
			currentParticipantRole:
				call.participants.find((participant) => participant.userId === currentUserId)
					?.role ?? null
		};
	}

	function syncCallFromPayload(payload: CallLifecyclePayload | undefined) {
		const rawCall = payload?.call;
		log('sync call from payload', payload);

		if (!rawCall || rawCall.conversationId !== data.conversation.id) {
			return;
		}

		const call = normalizeCallForCurrentUser(rawCall);

		callError = '';

		if (call.status === 'declined') {
			callNotice = 'The call was declined.';
			activeCall = null;
			return;
		}

		if (call.status === 'missed') {
			callNotice = 'The call timed out.';
			activeCall = null;
			return;
		}

		if (call.status === 'ended' || call.status === 'failed') {
			callNotice = 'The call has ended.';
			activeCall = null;
			return;
		}

		if (call.status === 'ringing') {
			callNotice =
				call.currentParticipantRole === 'callee'
					? 'Incoming call. Accept to start media.'
					: 'Waiting for the other participant to accept.';
		}

		if (call.status === 'active' && callConnectionState !== 'connected') {
			callNotice = 'Connecting media...';
		}

		activeCall = call;

		if (call.status === 'active') {
			log('active call payload received, connecting immediately', {
				callId: call.id,
				role: call.currentParticipantRole
			});
			void connectToActiveCall(call);
		}
	}

	async function refreshActiveCall() {
		if (!activeCall) {
			return;
		}

		try {
			log('refresh active call start', { callId: activeCall.id });
			const response = await fetch(`/api/media/calls/${activeCall.id}`);
			const payload = await response.json();
			log('refresh active call response', {
				callId: activeCall.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				return;
			}

			const nextCall = payload.call as DirectCall;
			syncCallFromPayload({ call: normalizeCallForCurrentUser(nextCall) });
		} catch {
			// Ignore periodic refresh failures and rely on realtime state.
		}
	}

	async function connectToActiveCall(call: DirectCall) {
		if (callConnectionState !== 'idle' && callConnectionState !== 'closed') {
			log('connectToActiveCall skipped due to state', {
				callId: call.id,
				callConnectionState
			});
			return;
		}

		callError = '';
		callNotice = 'Connecting media...';
		isConnectingCall = true;
		log('connectToActiveCall start', {
			callId: call.id,
			role: call.currentParticipantRole
		});

		try {
			const response = await fetch(`/api/media/calls/${call.id}/connection`);
			const payload = (await response.json()) as
				| CallConnectionInfo
				| { message?: string };
			log('connection endpoint response', {
				callId: call.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				throw new Error(
					'message' in payload
						? payload.message ?? 'Unable to connect the call.'
						: 'Unable to connect the call.'
				);
			}

			const connectionInfo = payload as CallConnectionInfo;

			await directCallController.connect({
				callId: call.id,
				currentUserId,
				isCaller: call.currentParticipantRole === 'caller',
				realtimeAuthUrl: connectionInfo.realtimeAuthUrl,
				iceServers: connectionInfo.iceServers
			});

			callNotice = 'Media connected.';
			micEnabled = true;
			cameraEnabled = true;
			remoteMicEnabled = true;
			remoteCameraEnabled = true;
			log('connectToActiveCall complete', { callId: call.id });
		} catch (caught) {
			log('connectToActiveCall error', caught);
			callError =
				caught instanceof Error ? caught.message : 'Unable to connect the call.';
		} finally {
			isConnectingCall = false;
		}
	}

	async function startCall() {
		if (activeCall || isStartingCall) {
			return;
		}

		isStartingCall = true;
		callError = '';
		callNotice = '';

		try {
			log('startCall request');
			const response = await fetch('/api/media/calls', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					conversationId: data.conversation.id
				})
			});
			const payload = await response.json();
			log('startCall response', {
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				callError = payload.message ?? 'Unable to start the call.';
				return;
			}

			activeCall = normalizeCallForCurrentUser(payload.call as DirectCall);
			callNotice = 'Waiting for the other participant to accept.';
		} catch {
			callError = 'Unable to start the call.';
		} finally {
			isStartingCall = false;
		}
	}

	async function acceptCall() {
		if (!activeCall || isAcceptingCall) {
			return;
		}

		isAcceptingCall = true;
		callError = '';

		try {
			log('acceptCall request', { callId: activeCall.id });
			const response = await fetch(`/api/media/calls/${activeCall.id}/accept`, {
				method: 'POST'
			});
			const payload = await response.json();
			log('acceptCall response', {
				callId: activeCall.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				callError = payload.message ?? 'Unable to accept the call.';
				return;
			}

			activeCall = normalizeCallForCurrentUser(payload.call as DirectCall);
			callNotice = 'Connecting media...';
			void connectToActiveCall(activeCall);
		} catch {
			callError = 'Unable to accept the call.';
		} finally {
			isAcceptingCall = false;
		}
	}

	async function declineCall() {
		if (!activeCall || isDecliningCall) {
			return;
		}

		isDecliningCall = true;
		callError = '';

		try {
			log('declineCall request', { callId: activeCall.id });
			const response = await fetch(`/api/media/calls/${activeCall.id}/decline`, {
				method: 'POST'
			});
			const payload = await response.json();
			log('declineCall response', {
				callId: activeCall.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				callError = payload.message ?? 'Unable to decline the call.';
				return;
			}

			activeCall = null;
			callNotice = 'Call declined.';
		} catch {
			callError = 'Unable to decline the call.';
		} finally {
			isDecliningCall = false;
		}
	}

	async function endCall() {
		if (!activeCall || isEndingCall) {
			return;
		}

		isEndingCall = true;
		callError = '';

		try {
			log('endCall request', {
				callId: activeCall.id,
				status: activeCall.status
			});
			const response = await fetch(`/api/media/calls/${activeCall.id}/end`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					endedReason:
						activeCall.status === 'ringing' ? 'cancelled' : 'participant-ended'
				})
			});
			const payload = await response.json();
			log('endCall response', {
				callId: activeCall.id,
				ok: response.ok,
				payload
			});

			if (!response.ok) {
				callError = payload.message ?? 'Unable to end the call.';
				return;
			}

			activeCall = null;
			callNotice = 'Call ended.';
		} catch {
			callError = 'Unable to end the call.';
		} finally {
			isEndingCall = false;
		}
	}

	async function toggleMicrophone() {
		micEnabled = await directCallController.toggleMicrophone();
	}

	async function toggleCamera() {
		cameraEnabled = await directCallController.toggleCamera();
	}

	onMount(() => {
		let cancelled = false;
		let cleanup: (() => Promise<void>) | undefined;

		isMounted = true;
		void scrollToBottom();

		const setupRealtime = async () => {
			const { Realtime } = await import('ably');

			if (cancelled) {
				return;
			}

			const realtime = new Realtime({
				authUrl: `/api/realtime/ably-token?conversationId=${data.conversation.id}`
			});
			const channel = realtime.channels.get(
				`private:chat:${data.conversation.id}`
			);

			await channel.attach();
			await channel.presence.enter({
				name: data.auth.user?.name ?? 'Unknown user'
			});

			const syncPresence = async () => {
				const members = (await channel.presence.get()) as PresenceEntry[];
				onlineUserIds = new Set(
					members
						.map((entry) => entry.clientId)
						.filter((value): value is string => typeof value === 'string')
				);
			};

			await syncPresence();

			const onMessageCreated = (event: InboundRealtimeMessage) => {
				if (event.data) {
					upsertMessage(event.data as ChatMessage);
				}
			};
			const onTypingStarted = (event: InboundRealtimeMessage) => {
				updateTypingUser(
					(event.data as
						| {
								userId?: string;
								userName?: string;
								state?: 'started' | 'stopped';
						  }
						| undefined) ?? {}
				);
			};
			const onTypingStopped = (event: InboundRealtimeMessage) => {
				updateTypingUser(
					(event.data as
						| {
								userId?: string;
								userName?: string;
								state?: 'started' | 'stopped';
						  }
						| undefined) ?? {}
				);
			};
			const onCallLifecycle = (event: InboundRealtimeMessage) => {
				syncCallFromPayload(
					(event.data as CallLifecyclePayload | undefined) ?? undefined
				);
			};
			const onPresenceEnter = (event: PresenceEntry) => {
				if (event.clientId) {
					onlineUserIds = new Set([...onlineUserIds, event.clientId]);
				}
			};
			const onPresenceLeave = (event: PresenceEntry) => {
				if (!event.clientId) {
					return;
				}

				const next = new Set(onlineUserIds);
				next.delete(event.clientId);
				onlineUserIds = next;
			};

			await channel.subscribe('message.created', onMessageCreated);
			await channel.subscribe('typing.started', onTypingStarted);
			await channel.subscribe('typing.stopped', onTypingStopped);
			await channel.subscribe('call.invited', onCallLifecycle);
			await channel.subscribe('call.accepted', onCallLifecycle);
			await channel.subscribe('call.declined', onCallLifecycle);
			await channel.subscribe('call.ended', onCallLifecycle);
			await channel.subscribe('call.missed', onCallLifecycle);
			await channel.presence.subscribe('enter', onPresenceEnter);
			await channel.presence.subscribe('leave', onPresenceLeave);

			cleanup = async () => {
				clearTypingIndicator(channel).catch(() => undefined);
				if (typingDebounceTimer) {
					clearTimeout(typingDebounceTimer);
				}
				if (typingExpiryTimer) {
					clearTimeout(typingExpiryTimer);
				}
				if (callRefreshTimer) {
					clearInterval(callRefreshTimer);
				}
				channel.unsubscribe('message.created', onMessageCreated);
				channel.unsubscribe('typing.started', onTypingStarted);
				channel.unsubscribe('typing.stopped', onTypingStopped);
				channel.unsubscribe('call.invited', onCallLifecycle);
				channel.unsubscribe('call.accepted', onCallLifecycle);
				channel.unsubscribe('call.declined', onCallLifecycle);
				channel.unsubscribe('call.ended', onCallLifecycle);
				channel.unsubscribe('call.missed', onCallLifecycle);
				channel.presence.unsubscribe('enter', onPresenceEnter);
				channel.presence.unsubscribe('leave', onPresenceLeave);
				try {
					await channel.presence.leave();
				} catch {
					// Ignore shutdown errors during unload.
				}
				channel.detach().catch(() => undefined);
				realtime.close();
			};

			async function clearTypingIndicator(activeChannel: typeof channel) {
				await activeChannel.publish('typing.stopped', {
					conversationId: data.conversation.id,
					userId: currentUserId,
					userName: data.auth.user?.name ?? 'Unknown user',
					state: 'stopped',
					timestamp: new Date().toISOString()
				});
			}

			const handleBeforeUnload = () => {
				void clearTypingIndicator(channel);
			};

			window.addEventListener('beforeunload', handleBeforeUnload);

			const previousCleanup = cleanup;
			cleanup = async () => {
				window.removeEventListener('beforeunload', handleBeforeUnload);
				await previousCleanup?.();
			};

			const publishTypingState = async (state: 'started' | 'stopped') => {
				await channel.publish(`typing.${state}`, {
					conversationId: data.conversation.id,
					userId: currentUserId,
					userName: data.auth.user?.name ?? 'Unknown user',
					state,
					timestamp: new Date().toISOString()
				});
			};

			const scheduleTypingStop = () => {
				if (typingDebounceTimer) {
					clearTimeout(typingDebounceTimer);
				}

				typingDebounceTimer = setTimeout(() => {
					void publishTypingState('stopped');
				}, 3500);
			};

			observeComposer = () => {
				if (!composer.trim()) {
					void publishTypingState('stopped');
					return;
				}

				const now = Date.now();
				if (now - lastTypingStartedAt > 2000) {
					lastTypingStartedAt = now;
					void publishTypingState('started');
				}

				scheduleTypingStop();
			};

			handleSendStop = () => {
				if (typingDebounceTimer) {
					clearTimeout(typingDebounceTimer);
				}

				void publishTypingState('stopped');
			};
		};

		void setupRealtime();

		return () => {
			cancelled = true;
			isMounted = false;
			void directCallController.disconnect();
			void cleanup?.();
		};
	});

	let observeComposer = () => {};
	let handleSendStop = () => {};

	async function sendMessage() {
		const trimmedBody = composer.trim();
		sendError = '';

		if (!trimmedBody || sending) {
			return;
		}

		sending = true;

		try {
			const response = await fetch(
				`/api/chat/conversations/${data.conversation.id}/messages`,
				{
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						body: trimmedBody
					})
				}
			);
			const payload = await response.json();

			if (!response.ok) {
				sendError = payload.message ?? 'Unable to send the message.';
				return;
			}

			composer = '';
			handleSendStop();
			upsertMessage(payload.message as ChatMessage);
		} catch {
			sendError = 'Unable to send the message.';
		} finally {
			sending = false;
		}
	}

	function handleComposerInput() {
		if (!isMounted) {
			return;
		}

		observeComposer();
	}

	function handleComposerBlur() {
		handleSendStop();
	}

	function handleComposerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void sendMessage();
		}
	}
</script>

<section class="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
	<aside class="panel h-fit p-6 sm:p-8">
		<p class="kicker">Conversation</p>
		<h1 class="page-title mt-3">
			{data.conversation.counterpart?.name ?? 'Direct chat'}
		</h1>
		<p class="mt-3 text-sm text-muted">
			{data.conversation.counterpart?.email ?? 'Unknown participant'}
		</p>

		<div class="mt-6 rounded-3xl border border-line bg-canvas/60 p-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
						Direct Call
					</p>
					<p class="mt-2 text-sm font-semibold text-ink">
						{getDirectCallStatusLabel(callUiState)}
					</p>
					<p class="mt-1 text-xs text-muted">
						{#if activeCall}
							With {callCounterpart(activeCall)?.name ?? 'participant'}
						{:else}
							Start a private audio/video call in this conversation.
						{/if}
					</p>
				</div>
				{#if !activeCall}
					<Button onclick={() => void startCall()} disabled={isStartingCall}>
						{isStartingCall ? 'Calling...' : 'Start call'}
					</Button>
				{/if}
			</div>

			{#if callUiState === 'incoming-ringing'}
				<div class="mt-4 flex flex-wrap gap-3">
					<Button onclick={() => void acceptCall()} disabled={isAcceptingCall}>
						{isAcceptingCall ? 'Joining...' : 'Accept'}
					</Button>
					<Button
						variant="ghost"
						onclick={() => void declineCall()}
						disabled={isDecliningCall}
					>
						{isDecliningCall ? 'Declining...' : 'Decline'}
					</Button>
				</div>
			{:else if activeCall}
				<div class="mt-4 flex flex-wrap gap-3">
					<Button
						variant={activeCall.status === 'active' ? 'danger' : 'ghost'}
						onclick={() => void endCall()}
						disabled={isEndingCall}
					>
						{isEndingCall
							? 'Ending...'
							: activeCall.status === 'active'
								? 'End call'
								: 'Cancel'}
					</Button>
					{#if activeCall.status === 'active'}
						<Button variant="ghost" onclick={() => void toggleMicrophone()}>
							{micEnabled ? 'Mute mic' : 'Unmute mic'}
						</Button>
						<Button variant="ghost" onclick={() => void toggleCamera()}>
							{cameraEnabled ? 'Camera off' : 'Camera on'}
						</Button>
					{/if}
				</div>
			{/if}

			{#if callNotice}
				<div
					class="mt-4 rounded-3xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-sm text-ink"
				>
					{callNotice}
				</div>
			{/if}

			{#if callError}
				<div
					class="mt-4 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{callError}
				</div>
			{/if}

			{#if activeCall?.status === 'active'}
				<div class="mt-4 grid gap-3">
					<div class="overflow-hidden rounded-[1.5rem] border border-line bg-ink">
						<video
							class="aspect-video w-full bg-black object-cover"
							autoplay
							playsinline
							muted
							bind:this={localVideoElement}
						></video>
						<div class="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/80">
							<span>You</span>
							<span>{micEnabled ? 'Mic on' : 'Mic off'} / {cameraEnabled ? 'Cam on' : 'Cam off'}</span>
						</div>
					</div>
					<div class="overflow-hidden rounded-[1.5rem] border border-line bg-ink">
						<video
							class="aspect-video w-full bg-black object-cover"
							autoplay
							playsinline
							bind:this={remoteVideoElement}
						></video>
						<div class="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/80">
							<span>{callCounterpart(activeCall)?.name ?? 'Participant'}</span>
							<span>{remoteMicEnabled ? 'Mic on' : 'Mic off'} / {remoteCameraEnabled ? 'Cam on' : 'Cam off'}</span>
						</div>
					</div>
					<p class="text-xs uppercase tracking-[0.16em] text-muted">
						Connection: {callConnectionState}
					</p>
				</div>
			{/if}
		</div>

		<div class="mt-6 rounded-3xl border border-line bg-canvas/60 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
				Status
			</p>
			<p class="mt-2 text-sm text-ink">
				{#if data.conversation.counterpart && isUserOnline(data.conversation.counterpart.id)}
					Online now
				{:else}
					Offline
				{/if}
			</p>
		</div>

		<div class="mt-6 rounded-3xl border border-line bg-canvas/60 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
				Participants
			</p>
			<div class="mt-3 space-y-3">
				{#each data.conversation.participants as participant}
					<div class="flex items-center justify-between gap-3 text-sm">
						<div>
							<p class="font-semibold text-ink">{participant.name}</p>
							<p class="text-muted">{participant.email}</p>
						</div>
						<span
							class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isUserOnline(participant.id) ? 'bg-brand-soft text-brand-strong' : 'bg-canvas text-muted'}`}
						>
							{isUserOnline(participant.id) ? 'Online' : 'Offline'}
						</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="mt-6">
			<a class="text-sm font-semibold no-underline" href="/chat">
				Back to conversations
			</a>
		</div>
	</aside>

	<section class="panel flex min-h-[42rem] flex-col p-6 sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Realtime Chat</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Live messages with typing indicators
				</h2>
			</div>
			<p class="text-sm text-muted">{messages.length} message(s)</p>
		</div>

		<div
			class="mt-6 flex-1 space-y-4 overflow-y-auto rounded-[2rem] border border-line bg-canvas/40 p-4"
			bind:this={messageContainer}
		>
			{#if messages.length === 0}
				<div
					class="rounded-3xl border border-dashed border-line bg-white/70 px-4 py-6 text-sm text-muted"
				>
					No messages yet. Send the first one to begin the realtime test.
				</div>
			{:else}
				{#each messages as message}
					<div
						class={`max-w-[80%] rounded-[1.5rem] px-4 py-3 ${isOwnMessage(message) ? 'ml-auto bg-brand text-white' : 'bg-white text-ink'}`}
					>
						<div class="flex items-center justify-between gap-4 text-xs">
							<p class={isOwnMessage(message) ? 'text-white/80' : 'text-muted'}>
								{isOwnMessage(message) ? 'You' : message.sender.name}
							</p>
							<p class={isOwnMessage(message) ? 'text-white/80' : 'text-muted'}>
								{formatMessageTime(message.createdAt)}
							</p>
						</div>
						<p class="mt-2 whitespace-pre-wrap text-sm leading-6">
							{message.body}
						</p>
					</div>
				{/each}
			{/if}
		</div>

		<div class="mt-4 min-h-6 px-2 text-sm text-muted">{typingLabel()}</div>

		{#if sendError}
			<div
				class="mt-2 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{sendError}
			</div>
		{/if}

		<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
			<label class="flex-1">
				<span class="sr-only">Message</span>
				<textarea
					class="min-h-[7rem] w-full rounded-[1.5rem] border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
					placeholder="Write a message. Press Enter to send and Shift+Enter for a new line."
					bind:value={composer}
					oninput={handleComposerInput}
					onblur={handleComposerBlur}
					onkeydown={handleComposerKeydown}
				></textarea>
			</label>
			<Button
				class="sm:min-w-[9rem]"
				onclick={() => void sendMessage()}
				disabled={sending}
			>
				{sending ? 'Sending...' : 'Send'}
			</Button>
		</div>
	</section>
</section>
