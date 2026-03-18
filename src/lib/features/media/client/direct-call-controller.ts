import {
	attachLocalTracks,
	createAnswerDescription,
	createOfferDescription,
	createPeerConnection,
	createRemoteMediaStream,
	stopMediaStream
} from './webrtc';

import type { BrowserIceServer } from './webrtc';

type DirectCallConnectionInfo = {
	callId: string;
	currentUserId: string;
	isCaller: boolean;
	realtimeAuthUrl: string;
	iceServers: BrowserIceServer[];
};

type CallSignalPayload = {
	callId?: string;
	fromUserId?: string;
	description?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
};

type ParticipantMediaStatePayload = {
	callId?: string;
	userId?: string;
	micEnabled?: boolean;
	cameraEnabled?: boolean;
};

type InboundRealtimeMessage = {
	data?: unknown;
};

type PresenceMember = {
	clientId: string | null;
};

type ControllerCallbacks = {
	onConnectionStateChange: (state: string) => void;
	onError: (message: string) => void;
	onRemoteMediaStateChange: (state: {
		micEnabled: boolean;
		cameraEnabled: boolean;
	}) => void;
};

export function createDirectCallController(callbacks: ControllerCallbacks) {
	let localVideoElement: HTMLVideoElement | null = null;
	let remoteVideoElement: HTMLVideoElement | null = null;
	let localStream: MediaStream | null = null;
	let remoteStream: MediaStream | null = null;
	let peerConnection: RTCPeerConnection | null = null;
	let callRealtimeClient: { close: () => void; channels: { get: (name: string) => any } } | null =
		null;
	let callChannel: any = null;
	let connectedCallId: string | null = null;
	let hasSentOffer = false;
	let localMicEnabled = true;
	let localCameraEnabled = true;
	let pendingIceCandidates: RTCIceCandidateInit[] = [];
	let iceFlushTimer: ReturnType<typeof setTimeout> | null = null;
	let remoteParticipantPresent = false;

	function log(...args: unknown[]) {
		if (import.meta.env.DEV) {
			console.log('[direct-call]', ...args);
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

	async function publishSignal(
		eventName:
			| 'webrtc.offer'
			| 'webrtc.answer'
			| 'webrtc.ice-candidate',
		payload: Record<string, unknown>
	) {
		if (!callChannel) {
			return;
		}

		await callChannel.publish(eventName, payload);
	}

	async function flushIceCandidates(connectionInfo: DirectCallConnectionInfo) {
		if (!callChannel || pendingIceCandidates.length === 0) {
			return;
		}

		const candidates = [...pendingIceCandidates];
		pendingIceCandidates = [];
		iceFlushTimer = null;
		log('flushing ice candidates', {
			callId: connectionInfo.callId,
			count: candidates.length
		});

		await callChannel.publish('webrtc.ice-candidate-batch', {
			callId: connectionInfo.callId,
			fromUserId: connectionInfo.currentUserId,
			candidates
		});
	}

	function scheduleIceFlush(connectionInfo: DirectCallConnectionInfo) {
		if (iceFlushTimer) {
			return;
		}

		iceFlushTimer = setTimeout(() => {
			void flushIceCandidates(connectionInfo);
		}, 120);
	}

	async function persistLocalMediaState() {
		if (!connectedCallId) {
			return;
		}

		await fetch(`/api/media/calls/${connectedCallId}/media-state`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				micEnabled: localMicEnabled,
				cameraEnabled: localCameraEnabled
			})
		}).catch(() => undefined);
	}

	async function sendOffer(
		connectionInfo: DirectCallConnectionInfo,
		options?: {
			iceRestart?: boolean;
			force?: boolean;
		}
	) {
		if (!peerConnection || !callChannel || hasSentOffer) {
			if (!options?.force) {
				return;
			}
		}

		if (!peerConnection || !callChannel) {
			return;
		}

		hasSentOffer = true;
		log('creating offer', {
			iceRestart: options?.iceRestart ?? false,
			force: options?.force ?? false,
			signalingState: peerConnection.signalingState,
			connectionState: peerConnection.connectionState,
			iceConnectionState: peerConnection.iceConnectionState
		});
		const offer = await createOfferDescription(
			peerConnection,
			options?.iceRestart ? { iceRestart: true } : undefined
		);

		await publishSignal('webrtc.offer', {
			callId: connectionInfo.callId,
			fromUserId: connectionInfo.currentUserId,
			description: offer
		});
	}

	return {
		setMediaElements(localEl: HTMLVideoElement | null, remoteEl: HTMLVideoElement | null) {
			localVideoElement = localEl;
			remoteVideoElement = remoteEl;
			bindMediaElements();
		},

		async connect(connectionInfo: DirectCallConnectionInfo) {
			if (connectedCallId === connectionInfo.callId && peerConnection) {
				log('connect skipped, already connected', {
					callId: connectionInfo.callId
				});
				bindMediaElements();
				return;
			}

			await this.disconnect();
			log('connect start', {
				callId: connectionInfo.callId,
				currentUserId: connectionInfo.currentUserId,
				isCaller: connectionInfo.isCaller
			});
			callbacks.onConnectionStateChange('preparing');
			localMicEnabled = true;
			localCameraEnabled = true;

			try {
				log('requesting local media');
				const nextLocalStream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: true
				});
				const nextRemoteStream = createRemoteMediaStream();
				const nextPeerConnection = createPeerConnection(
					connectionInfo.iceServers,
					nextRemoteStream
				);
				nextPeerConnection.ontrack = (event) => {
					log('remote track received', {
						streamCount: event.streams.length,
						trackKind: event.track.kind,
						trackId: event.track.id
					});

					for (const track of event.streams[0]?.getTracks() ?? []) {
						if (!nextRemoteStream.getTracks().some((entry) => entry.id === track.id)) {
							nextRemoteStream.addTrack(track);
						}
					}

					bindMediaElements();
				};

				attachLocalTracks(nextPeerConnection, nextLocalStream);

				nextPeerConnection.onicecandidate = (event) => {
					if (!event.candidate) {
						return;
					}

					log('queueing ice candidate');
					pendingIceCandidates = [
						...pendingIceCandidates,
						event.candidate.toJSON()
					];
					scheduleIceFlush(connectionInfo);
				};

				nextPeerConnection.onconnectionstatechange = () => {
					callbacks.onConnectionStateChange(nextPeerConnection.connectionState);
					log('connection state', nextPeerConnection.connectionState);

					if (nextPeerConnection.connectionState === 'failed') {
						callbacks.onError('The media connection failed.');
					}
				};

				nextPeerConnection.oniceconnectionstatechange = () => {
					log('ice connection state', nextPeerConnection.iceConnectionState);

					if (
						connectionInfo.isCaller &&
						remoteParticipantPresent &&
						(nextPeerConnection.iceConnectionState === 'disconnected' ||
							nextPeerConnection.iceConnectionState === 'failed')
					) {
						hasSentOffer = false;
						log('ice reconnect trigger, sending restarted offer');
						void sendOffer(connectionInfo, {
							iceRestart: true,
							force: true
						});
					}
				};

				nextPeerConnection.onicegatheringstatechange = () => {
					log('ice gathering state', nextPeerConnection.iceGatheringState);
				};

				nextPeerConnection.onsignalingstatechange = () => {
					log('signaling state', nextPeerConnection.signalingState);
				};

				const { Realtime } = await import('ably');
				const realtime = new Realtime({
					authUrl: connectionInfo.realtimeAuthUrl
				});
				const channel = realtime.channels.get(
					`private:call:${connectionInfo.callId}`
				);
				log('ably realtime created', {
					callId: connectionInfo.callId
				});

				const maybeSendOffer = async () => {
					if (!connectionInfo.isCaller) {
						log('not caller, skipping initial offer check');
						return;
					}

					const members = (await channel.presence.get()) as PresenceMember[];
					remoteParticipantPresent = members.some(
						(member) => member.clientId && member.clientId !== connectionInfo.currentUserId
					);
					log('presence snapshot', {
						callId: connectionInfo.callId,
						members: members.map((member) => member.clientId)
					});

					if (remoteParticipantPresent) {
						log('remote participant present, sending offer');
						await sendOffer(connectionInfo);
						return;
					}

					log('remote participant not present yet, waiting for presence enter');
				};

				const onPresenceEnter = (member: PresenceMember) => {
					if (!member.clientId || member.clientId === connectionInfo.currentUserId) {
						return;
					}

					remoteParticipantPresent = true;
					log('remote participant entered presence');
					if (connectionInfo.isCaller) {
						const shouldRestartIce =
							Boolean(peerConnection?.currentRemoteDescription) ||
							peerConnection?.connectionState === 'disconnected' ||
							peerConnection?.iceConnectionState === 'disconnected' ||
							peerConnection?.iceConnectionState === 'failed';
						hasSentOffer = false;
						void sendOffer(connectionInfo, {
							iceRestart: shouldRestartIce,
							force: true
						});
					}
				};

				const onPresenceLeave = (member: PresenceMember) => {
					if (!member.clientId || member.clientId === connectionInfo.currentUserId) {
						return;
					}

					remoteParticipantPresent = false;
					hasSentOffer = false;
					log('remote participant left presence');
					callbacks.onConnectionStateChange('disconnected');
				};

				const onOffer = async (event: InboundRealtimeMessage) => {
					const signal = (event.data as CallSignalPayload | undefined) ?? {};
					log('offer event received', {
						callId: connectionInfo.callId,
						fromUserId: signal.fromUserId,
						hasDescription: Boolean(signal.description)
					});

					if (
						signal.fromUserId === connectionInfo.currentUserId ||
						!signal.description ||
						!peerConnection
					) {
						return;
					}

					log('received offer');
					await peerConnection.setRemoteDescription(
						new RTCSessionDescription(signal.description)
					);
					const answer = await createAnswerDescription(peerConnection);

					await publishSignal('webrtc.answer', {
						callId: connectionInfo.callId,
						fromUserId: connectionInfo.currentUserId,
						description: answer
					});
				};

				const onAnswer = async (event: InboundRealtimeMessage) => {
					const signal = (event.data as CallSignalPayload | undefined) ?? {};
					log('answer event received', {
						callId: connectionInfo.callId,
						fromUserId: signal.fromUserId,
						hasDescription: Boolean(signal.description)
					});

					if (
						signal.fromUserId === connectionInfo.currentUserId ||
						!signal.description ||
						!peerConnection
					) {
						return;
					}

					if (peerConnection.currentRemoteDescription) {
						log('ignoring duplicate answer');
						return;
					}

					log('received answer');
					await peerConnection.setRemoteDescription(
						new RTCSessionDescription(signal.description)
					);
				};

				const onIceCandidate = async (event: InboundRealtimeMessage) => {
					const signal = (event.data as CallSignalPayload | undefined) ?? {};
					log('ice candidate event received', {
						callId: connectionInfo.callId,
						fromUserId: signal.fromUserId,
						hasCandidate: Boolean(signal.candidate)
					});

					if (
						signal.fromUserId === connectionInfo.currentUserId ||
						!signal.candidate ||
						!peerConnection
					) {
						return;
					}

					log('received ice candidate');
					await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
				};

				const onIceCandidateBatch = async (event: InboundRealtimeMessage) => {
					const signal =
						(event.data as
							| {
									callId?: string;
									fromUserId?: string;
									candidates?: RTCIceCandidateInit[];
							  }
							| undefined) ?? {};
					log('ice candidate batch event received', {
						callId: connectionInfo.callId,
						fromUserId: signal.fromUserId,
						count: signal.candidates?.length ?? 0
					});

					if (
						signal.fromUserId === connectionInfo.currentUserId ||
						!signal.candidates ||
						!peerConnection
					) {
						return;
					}

					for (const candidate of signal.candidates) {
						log('received batched ice candidate');
						await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
					}
				};

				const onParticipantMediaState = (event: InboundRealtimeMessage) => {
					const payload =
						(event.data as ParticipantMediaStatePayload | undefined) ?? {};
					log('participant media state event received', payload);

					if (payload.userId === connectionInfo.currentUserId) {
						return;
					}

					callbacks.onRemoteMediaStateChange({
						micEnabled: payload.micEnabled ?? true,
						cameraEnabled: payload.cameraEnabled ?? true
					});
				};

				await channel.attach();
				log('channel attached', {
					callId: connectionInfo.callId
				});
				await channel.presence.enter();
				log('presence entered', {
					callId: connectionInfo.callId,
					currentUserId: connectionInfo.currentUserId
				});
				await channel.presence.subscribe('enter', onPresenceEnter);
				await channel.presence.subscribe('leave', onPresenceLeave);
				await channel.subscribe('webrtc.offer', onOffer);
				await channel.subscribe('webrtc.answer', onAnswer);
				await channel.subscribe('webrtc.ice-candidate', onIceCandidate);
				await channel.subscribe('webrtc.ice-candidate-batch', onIceCandidateBatch);
				await channel.subscribe(
					'participant.media-state.updated',
					onParticipantMediaState
				);

				localStream = nextLocalStream;
				remoteStream = nextRemoteStream;
				peerConnection = nextPeerConnection;
				callRealtimeClient = realtime;
				callChannel = channel;
				connectedCallId = connectionInfo.callId;
				hasSentOffer = false;
				bindMediaElements();
				log('peer connection and channel ready', {
					callId: connectionInfo.callId
				});
				await maybeSendOffer();

				await persistLocalMediaState();
				log('initial media state persisted', {
					callId: connectionInfo.callId,
					micEnabled: localMicEnabled,
					cameraEnabled: localCameraEnabled
				});
			} catch (caught) {
				log('connect error', caught);
				await this.disconnect();
				callbacks.onError(
					caught instanceof Error
						? caught.message
						: 'Unable to access your devices.'
				);
			}
		},

		async disconnect() {
			log('disconnect start', {
				callId: connectedCallId
			});
			if (callChannel) {
				try {
					if (iceFlushTimer) {
						clearTimeout(iceFlushTimer);
						iceFlushTimer = null;
					}
					pendingIceCandidates = [];
					await callChannel.presence.leave();
					callChannel.unsubscribe();
					callChannel.presence.unsubscribe();
					await callChannel.detach();
					log('channel cleanup complete', {
						callId: connectedCallId
					});
				} catch {
					// Ignore cleanup failures.
				}
			}

			callRealtimeClient?.close();
			peerConnection?.close();
			stopMediaStream(localStream);
			stopMediaStream(remoteStream);

			callChannel = null;
			callRealtimeClient = null;
			peerConnection = null;
			localStream = null;
			remoteStream = null;
			connectedCallId = null;
			hasSentOffer = false;
			remoteParticipantPresent = false;
			callbacks.onConnectionStateChange('idle');
			bindMediaElements();
			log('disconnect complete');
		},

		async toggleMicrophone() {
			localMicEnabled = !localMicEnabled;

			for (const track of localStream?.getAudioTracks() ?? []) {
				track.enabled = localMicEnabled;
			}

			await persistLocalMediaState();
			log('local microphone toggled', {
				callId: connectedCallId,
				micEnabled: localMicEnabled
			});
			return localMicEnabled;
		},

		async toggleCamera() {
			localCameraEnabled = !localCameraEnabled;

			for (const track of localStream?.getVideoTracks() ?? []) {
				track.enabled = localCameraEnabled;
			}

			await persistLocalMediaState();
			log('local camera toggled', {
				callId: connectedCallId,
				cameraEnabled: localCameraEnabled
			});
			return localCameraEnabled;
		}
	};
}
