import {
	attachLocalTracks,
	createAnswerDescription,
	createOfferDescription,
	stopMediaStream
} from '$lib/features/media/client/webrtc';

import type { BrowserIceServer } from '$lib/features/media/client/webrtc';

type LiveRoomConnectionInfo = {
	roomId: string;
	sessionId: string;
	currentUserId: string;
	currentUserRole: 'host' | 'viewer';
	hostUserId: string;
	realtimeAuthUrl: string;
	iceServers: BrowserIceServer[];
};

type PresenceMember = {
	clientId: string | null;
};

type InboundRealtimeMessage = {
	data?: unknown;
};

type LiveSignalPayload = {
	roomId?: string;
	sessionId?: string;
	fromUserId?: string;
	targetUserId?: string;
	description?: RTCSessionDescriptionInit;
	candidates?: RTCIceCandidateInit[];
};

type ControllerCallbacks = {
	onConnectionStateChange: (state: string) => void;
	onError: (message: string) => void;
};

type ViewerPeerState = {
	peerConnection: RTCPeerConnection;
	pendingIceCandidates: RTCIceCandidateInit[];
	iceFlushTimer: ReturnType<typeof setTimeout> | null;
};

function createRemoteMediaStream() {
	return new MediaStream();
}

export function createLiveRoomController(callbacks: ControllerCallbacks) {
	let localVideoElement: HTMLVideoElement | null = null;
	let remoteVideoElement: HTMLVideoElement | null = null;
	let localStream: MediaStream | null = null;
	let remoteStream: MediaStream | null = null;
	let viewerPeerConnection: RTCPeerConnection | null = null;
	let viewerPendingIceCandidates: RTCIceCandidateInit[] = [];
	let viewerIceFlushTimer: ReturnType<typeof setTimeout> | null = null;
	let hostViewerPeers = new Map<string, ViewerPeerState>();
	let roomRealtimeClient: { close: () => void; channels: { get: (name: string) => any } } | null =
		null;
	let roomChannel: any = null;
	let connectedRoomId: string | null = null;
	let currentConnectionInfo: LiveRoomConnectionInfo | null = null;

	function log(...args: unknown[]) {
		if (import.meta.env.DEV) {
			console.log('[live-room]', ...args);
		}
	}

	function playVideoElement(element: HTMLVideoElement | null, label: string) {
		if (!element) {
			return;
		}

		void element
			.play()
			.then(() => {
				log(`${label} video play() resolved`);
			})
			.catch((error) => {
				log(`${label} video play() rejected`, error);
			});
	}

	function bindMediaElements() {
		if (localVideoElement) {
			localVideoElement.srcObject = localStream;
			log('local video srcObject updated', {
				trackCount: localStream?.getTracks().length ?? 0
			});
			playVideoElement(localVideoElement, 'local');
		}

		if (remoteVideoElement) {
			remoteVideoElement.srcObject = remoteStream;
			log('remote video srcObject updated', {
				trackCount: remoteStream?.getTracks().length ?? 0
			});
			playVideoElement(remoteVideoElement, 'remote');
		}
	}

	function closeViewerPeer(viewerUserId: string) {
		const viewerPeer = hostViewerPeers.get(viewerUserId);

		if (!viewerPeer) {
			return;
		}

		if (viewerPeer.iceFlushTimer) {
			clearTimeout(viewerPeer.iceFlushTimer);
		}

		viewerPeer.peerConnection.close();
		hostViewerPeers.delete(viewerUserId);
		log('closed host peer for viewer', { viewerUserId });
	}

	async function publishSignal(
		eventName: 'live.offer' | 'live.answer' | 'live.ice-candidate-batch',
		payload: Record<string, unknown>
	) {
		if (!roomChannel) {
			return;
		}

		await roomChannel.publish(eventName, payload);
	}

	async function flushViewerIceCandidates(viewerUserId: string) {
		const viewerPeer = hostViewerPeers.get(viewerUserId);

		if (!viewerPeer || !currentConnectionInfo || viewerPeer.pendingIceCandidates.length === 0) {
			return;
		}

		const candidates = [...viewerPeer.pendingIceCandidates];
		viewerPeer.pendingIceCandidates = [];
		viewerPeer.iceFlushTimer = null;
		log('flushing host ice candidates', {
			viewerUserId,
			count: candidates.length
		});

		await publishSignal('live.ice-candidate-batch', {
			roomId: currentConnectionInfo.roomId,
			sessionId: currentConnectionInfo.sessionId,
			fromUserId: currentConnectionInfo.currentUserId,
			targetUserId: viewerUserId,
			candidates
		});
	}

	function scheduleViewerIceFlush(viewerUserId: string) {
		const viewerPeer = hostViewerPeers.get(viewerUserId);

		if (!viewerPeer || viewerPeer.iceFlushTimer) {
			return;
		}

		viewerPeer.iceFlushTimer = setTimeout(() => {
			void flushViewerIceCandidates(viewerUserId);
		}, 120);
	}

	async function flushViewerRoleIceCandidates() {
		if (
			!roomChannel ||
			!currentConnectionInfo ||
			viewerPendingIceCandidates.length === 0
		) {
			return;
		}

		const candidates = [...viewerPendingIceCandidates];
		viewerPendingIceCandidates = [];
		viewerIceFlushTimer = null;
		log('flushing viewer ice candidates', {
			count: candidates.length
		});

		await publishSignal('live.ice-candidate-batch', {
			roomId: currentConnectionInfo.roomId,
			sessionId: currentConnectionInfo.sessionId,
			fromUserId: currentConnectionInfo.currentUserId,
			targetUserId: currentConnectionInfo.hostUserId,
			candidates
		});
	}

	function scheduleViewerRoleIceFlush() {
		if (viewerIceFlushTimer) {
			return;
		}

		viewerIceFlushTimer = setTimeout(() => {
			void flushViewerRoleIceCandidates();
		}, 120);
	}

	function createViewerPeerConnection(connectionInfo: LiveRoomConnectionInfo) {
		const nextRemoteStream = createRemoteMediaStream();
		const nextPeerConnection = new RTCPeerConnection({
			iceServers: connectionInfo.iceServers
		});

		nextPeerConnection.ontrack = (event) => {
			log('viewer remote track received', {
				streamCount: event.streams.length,
				trackKind: event.track.kind,
				trackId: event.track.id
			});

			for (const track of event.streams[0]?.getTracks() ?? []) {
				if (!nextRemoteStream.getTracks().some((entry) => entry.id === track.id)) {
					nextRemoteStream.addTrack(track);
				}
			}

			remoteStream = nextRemoteStream;
			bindMediaElements();
		};

		nextPeerConnection.onicecandidate = (event) => {
			if (!event.candidate) {
				return;
			}

			log('queueing viewer ice candidate');
			viewerPendingIceCandidates = [
				...viewerPendingIceCandidates,
				event.candidate.toJSON()
			];
			scheduleViewerRoleIceFlush();
		};

		nextPeerConnection.onconnectionstatechange = () => {
			callbacks.onConnectionStateChange(nextPeerConnection.connectionState);
			log('viewer connection state', nextPeerConnection.connectionState);
		};

		nextPeerConnection.oniceconnectionstatechange = () => {
			log('viewer ice connection state', nextPeerConnection.iceConnectionState);
		};

		nextPeerConnection.onsignalingstatechange = () => {
			log('viewer signaling state', nextPeerConnection.signalingState);
		};

		viewerPeerConnection = nextPeerConnection;
		remoteStream = nextRemoteStream;
		bindMediaElements();
		return nextPeerConnection;
	}

	function createHostPeerConnection(
		connectionInfo: LiveRoomConnectionInfo,
		viewerUserId: string
	) {
		const nextPeerConnection = new RTCPeerConnection({
			iceServers: connectionInfo.iceServers
		});

		if (localStream) {
			attachLocalTracks(nextPeerConnection, localStream);
		}

		nextPeerConnection.onicecandidate = (event) => {
			if (!event.candidate) {
				return;
			}

			log('queueing host ice candidate', { viewerUserId });
			const viewerPeer = hostViewerPeers.get(viewerUserId);

			if (!viewerPeer) {
				return;
			}

			viewerPeer.pendingIceCandidates = [
				...viewerPeer.pendingIceCandidates,
				event.candidate.toJSON()
			];
			scheduleViewerIceFlush(viewerUserId);
		};

		nextPeerConnection.onconnectionstatechange = () => {
			log('host peer connection state', {
				viewerUserId,
				state: nextPeerConnection.connectionState
			});
			callbacks.onConnectionStateChange(nextPeerConnection.connectionState);
		};

		nextPeerConnection.oniceconnectionstatechange = () => {
			log('host peer ice connection state', {
				viewerUserId,
				state: nextPeerConnection.iceConnectionState
			});
		};

		nextPeerConnection.onsignalingstatechange = () => {
			log('host peer signaling state', {
				viewerUserId,
				state: nextPeerConnection.signalingState
			});
		};

		hostViewerPeers.set(viewerUserId, {
			peerConnection: nextPeerConnection,
			pendingIceCandidates: [],
			iceFlushTimer: null
		});
		return nextPeerConnection;
	}

	async function sendOfferToViewer(
		connectionInfo: LiveRoomConnectionInfo,
		viewerUserId: string,
		options?: RTCOfferOptions
	) {
		closeViewerPeer(viewerUserId);

		const peerConnection = createHostPeerConnection(connectionInfo, viewerUserId);
		log('creating host offer', { viewerUserId, options });
		const offer = await createOfferDescription(peerConnection, options);

		await publishSignal('live.offer', {
			roomId: connectionInfo.roomId,
			sessionId: connectionInfo.sessionId,
			fromUserId: connectionInfo.currentUserId,
			targetUserId: viewerUserId,
			description: offer
		});
	}

	return {
		setMediaElements(localEl: HTMLVideoElement | null, remoteEl: HTMLVideoElement | null) {
			localVideoElement = localEl;
			remoteVideoElement = remoteEl;
			bindMediaElements();
		},

		async connect(connectionInfo: LiveRoomConnectionInfo) {
			if (connectedRoomId === connectionInfo.roomId && roomChannel) {
				log('connect skipped, already connected', { roomId: connectionInfo.roomId });
				bindMediaElements();
				return;
			}

			await this.disconnect();
			currentConnectionInfo = connectionInfo;
			callbacks.onConnectionStateChange('preparing');
			log('connect start', connectionInfo);

			try {
				if (connectionInfo.currentUserRole === 'host') {
					localStream = await navigator.mediaDevices.getUserMedia({
						audio: true,
						video: true
					});
					bindMediaElements();
				} else {
					localStream = null;
					remoteStream = createRemoteMediaStream();
					bindMediaElements();
				}

				const { Realtime } = await import('ably');
				const realtime = new Realtime({
					authUrl: connectionInfo.realtimeAuthUrl
				});
				const channel = realtime.channels.get(`private:live-room:${connectionInfo.roomId}`);

				const onPresenceEnter = (member: PresenceMember) => {
					if (!member.clientId || member.clientId === connectionInfo.currentUserId) {
						return;
					}

					log('presence enter', { clientId: member.clientId });

					if (connectionInfo.currentUserRole === 'host') {
						void sendOfferToViewer(connectionInfo, member.clientId, {
							iceRestart: true
						});
					}
				};

				const onPresenceLeave = (member: PresenceMember) => {
					if (!member.clientId || member.clientId === connectionInfo.currentUserId) {
						return;
					}

					log('presence leave', { clientId: member.clientId });

					if (connectionInfo.currentUserRole === 'host') {
						closeViewerPeer(member.clientId);
						return;
					}

					if (member.clientId === connectionInfo.hostUserId) {
						viewerPeerConnection?.close();
						viewerPeerConnection = null;
						stopMediaStream(remoteStream);
						remoteStream = createRemoteMediaStream();
						callbacks.onConnectionStateChange('disconnected');
						bindMediaElements();
					}
				};

				const onOffer = async (event: InboundRealtimeMessage) => {
					if (connectionInfo.currentUserRole !== 'viewer') {
						return;
					}

					const payload = (event.data as LiveSignalPayload | undefined) ?? {};
					log('offer event received', payload);

					if (
						payload.targetUserId !== connectionInfo.currentUserId ||
						payload.fromUserId !== connectionInfo.hostUserId ||
						!payload.description
					) {
						return;
					}

					let peerConnection = viewerPeerConnection;

					if (!peerConnection || peerConnection.connectionState === 'closed') {
						peerConnection = createViewerPeerConnection(connectionInfo);
					}

					await peerConnection.setRemoteDescription(
						new RTCSessionDescription(payload.description)
					);
					const answer = await createAnswerDescription(peerConnection);

					await publishSignal('live.answer', {
						roomId: connectionInfo.roomId,
						sessionId: connectionInfo.sessionId,
						fromUserId: connectionInfo.currentUserId,
						targetUserId: connectionInfo.hostUserId,
						description: answer
					});
				};

				const onAnswer = async (event: InboundRealtimeMessage) => {
					if (connectionInfo.currentUserRole !== 'host') {
						return;
					}

					const payload = (event.data as LiveSignalPayload | undefined) ?? {};
					log('answer event received', payload);

					if (
						payload.targetUserId !== connectionInfo.currentUserId ||
						!payload.fromUserId ||
						!payload.description
					) {
						return;
					}

					const viewerPeer = hostViewerPeers.get(payload.fromUserId);

					if (!viewerPeer) {
						return;
					}

					await viewerPeer.peerConnection.setRemoteDescription(
						new RTCSessionDescription(payload.description)
					);
				};

				const onIceBatch = async (event: InboundRealtimeMessage) => {
					const payload = (event.data as LiveSignalPayload | undefined) ?? {};
					log('ice batch event received', {
						fromUserId: payload.fromUserId,
						targetUserId: payload.targetUserId,
						count: payload.candidates?.length ?? 0
					});

					if (
						payload.targetUserId !== connectionInfo.currentUserId ||
						!payload.fromUserId ||
						!payload.candidates
					) {
						return;
					}

					if (connectionInfo.currentUserRole === 'host') {
						const viewerPeer = hostViewerPeers.get(payload.fromUserId);

						if (!viewerPeer) {
							return;
						}

						for (const candidate of payload.candidates) {
							await viewerPeer.peerConnection.addIceCandidate(
								new RTCIceCandidate(candidate)
							);
						}

						return;
					}

					const peerConnection =
						viewerPeerConnection ?? createViewerPeerConnection(connectionInfo);

					for (const candidate of payload.candidates) {
						await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
					}
				};

				await channel.attach();
				await channel.presence.enter();
				await channel.presence.subscribe('enter', onPresenceEnter);
				await channel.presence.subscribe('leave', onPresenceLeave);
				await channel.subscribe('live.offer', onOffer);
				await channel.subscribe('live.answer', onAnswer);
				await channel.subscribe('live.ice-candidate-batch', onIceBatch);

				roomRealtimeClient = realtime;
				roomChannel = channel;
				connectedRoomId = connectionInfo.roomId;
				log('channel ready', { roomId: connectionInfo.roomId });

				if (connectionInfo.currentUserRole === 'host') {
					const members = (await channel.presence.get()) as PresenceMember[];

					for (const member of members) {
						if (!member.clientId || member.clientId === connectionInfo.currentUserId) {
							continue;
						}

						await sendOfferToViewer(connectionInfo, member.clientId);
					}
				}
			} catch (caught) {
				log('connect error', caught);
				await this.disconnect();
				callbacks.onError(
					caught instanceof Error ? caught.message : 'Unable to connect the live room.'
				);
			}
		},

		async disconnect() {
			log('disconnect start', { roomId: connectedRoomId });

			if (roomChannel) {
				try {
					await roomChannel.presence.leave();
					roomChannel.unsubscribe();
					roomChannel.presence.unsubscribe();
					await roomChannel.detach();
				} catch {
					// Ignore cleanup failures.
				}
			}

			if (viewerIceFlushTimer) {
				clearTimeout(viewerIceFlushTimer);
				viewerIceFlushTimer = null;
			}

			viewerPendingIceCandidates = [];
			viewerPeerConnection?.close();
			viewerPeerConnection = null;

			for (const viewerUserId of hostViewerPeers.keys()) {
				closeViewerPeer(viewerUserId);
			}

			roomRealtimeClient?.close();
			roomRealtimeClient = null;
			roomChannel = null;
			currentConnectionInfo = null;
			connectedRoomId = null;
			stopMediaStream(localStream);
			stopMediaStream(remoteStream);
			localStream = null;
			remoteStream = null;
			callbacks.onConnectionStateChange('idle');
			bindMediaElements();
			log('disconnect complete');
		}
	};
}
