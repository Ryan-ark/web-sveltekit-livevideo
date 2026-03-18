export type BrowserIceServer = {
	urls: string | string[];
	username?: string;
	credential?: string;
};

export function createRemoteMediaStream() {
	return new MediaStream();
}

export function attachLocalTracks(
	peerConnection: RTCPeerConnection,
	localStream: MediaStream
) {
	for (const track of localStream.getTracks()) {
		peerConnection.addTrack(track, localStream);
	}
}

export function createPeerConnection(
	iceServers: BrowserIceServer[],
	remoteStream: MediaStream
) {
	const peerConnection = new RTCPeerConnection({
		iceServers
	});

	peerConnection.ontrack = (event) => {
		for (const track of event.streams[0]?.getTracks() ?? []) {
			remoteStream.addTrack(track);
		}
	};

	return peerConnection;
}

export async function createOfferDescription(
	peerConnection: RTCPeerConnection,
	options?: RTCOfferOptions
) {
	const offer = await peerConnection.createOffer(options);
	await peerConnection.setLocalDescription(offer);
	return offer;
}

export async function createAnswerDescription(
	peerConnection: RTCPeerConnection
) {
	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);
	return answer;
}

export function stopMediaStream(stream: MediaStream | null) {
	for (const track of stream?.getTracks() ?? []) {
		track.stop();
	}
}
