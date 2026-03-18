# WebRTC Setup

This project uses:

- Ably for authenticated realtime signaling
- WebRTC for direct media transport
- Better Auth for user/session identity
- PostgreSQL for persistent call session state

This document explains how to set up the current 1:1 calling flow locally and what is required before using it in a real environment.

## What Is Implemented

Current direct-call flow:

- users start a call from a direct chat conversation
- the server creates a `media_call_sessions` record
- Ably carries call lifecycle events and WebRTC signaling messages
- browsers exchange offer, answer, and ICE candidates
- browsers capture local camera/microphone with `getUserMedia`
- media is sent peer-to-peer through WebRTC

Important limitation:

- this is currently a direct 1:1 call foundation
- private live-room broadcasting is not implemented yet
- TURN support is configurable, but you must provide real TURN credentials for production-quality connectivity

## Required Environment Variables

Copy `.env.example` to `.env` and fill in the relevant values.

Required for the app in general:

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `ABLY_API_KEY`

Used by WebRTC:

- `WEBRTC_STUN_URLS`
- `WEBRTC_TURN_URLS`
- `WEBRTC_TURN_USERNAME`
- `WEBRTC_TURN_CREDENTIAL`

Example:

```env
ABLY_API_KEY=your-ably-api-key
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
WEBRTC_TURN_URLS=turn:your-turn-server.example.com:3478,turns:your-turn-server.example.com:5349
WEBRTC_TURN_USERNAME=your-turn-username
WEBRTC_TURN_CREDENTIAL=your-turn-password
```

Notes:

- `WEBRTC_STUN_URLS` and `WEBRTC_TURN_URLS` support comma-separated values
- if no WebRTC env vars are set, the app falls back to `stun:stun.l.google.com:19302`
- that fallback is acceptable for local testing only

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the local database:

```bash
docker compose up -d postgres
```

3. Apply database migrations:

```bash
npm run db:migrate
```

4. Seed users if needed:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

6. Sign in with two different accounts in two different browser sessions.

Recommended:

- one normal browser window
- one incognito/private window

## Database Migration Requirement

The WebRTC call foundation depends on the media tables added in:

- `drizzle/0003_yummy_gertrude_yorkes.sql`

If you skip migrations, call creation will fail because the media tables will not exist.

## Ably Setup

You need an Ably app and API key.

This project currently uses Ably for:

- chat presence
- chat messages
- call lifecycle events
- WebRTC signaling events

Relevant server routes:

- `src/routes/api/realtime/ably-token/+server.ts`
- `src/routes/api/media/realtime-token/+server.ts`

Relevant channel namespaces:

- `private:chat:{conversationId}`
- `private:call:{callId}`

Security model:

- the server validates conversation membership or call participation first
- only then does it issue a scoped Ably token request

## TURN and STUN Guidance

### Local development

You can usually get away with only STUN for local testing on the same network:

```env
WEBRTC_STUN_URLS=stun:stun.l.google.com:19302
WEBRTC_TURN_URLS=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_CREDENTIAL=
```

### Production or real-user testing

Do not rely on STUN-only in production.

Without TURN:

- many users behind restrictive NATs or enterprise firewalls will fail to connect
- connection quality will be inconsistent
- some call attempts will hang in `connecting` or fail entirely

For real usage, configure:

- at least one TURN UDP endpoint
- ideally a TLS TURN endpoint as well

## Browser Requirements

The current implementation expects:

- camera permission
- microphone permission
- modern browser WebRTC support

Recommended browsers for testing:

- Chrome
- Edge
- Firefox

If permissions are denied:

- the call can be created server-side
- the media connection will fail client-side
- the UI will show a connection/setup error

## How To Test Locally

1. Log in as User A in one browser session.
2. Log in as User B in a second browser session.
3. Create or open a direct chat conversation between those users.
4. Click `Start call`.
5. Accept the call from the other browser.
6. Confirm:
   - both local and remote video elements render
   - audio/video permission prompts appear
   - ending the call tears down both sides

If it does not connect:

- confirm `ABLY_API_KEY` is valid
- confirm migrations were applied
- confirm both users are authenticated
- confirm browser camera/microphone permissions were granted
- confirm TURN is configured if testing across different networks

## Current Implementation Files

Primary backend files:

- `src/lib/server/db/schema/media.ts`
- `src/lib/server/features/media/media.schema.ts`
- `src/lib/server/features/media/media.repository.ts`
- `src/lib/server/features/media/media.service.ts`
- `src/routes/api/media/calls/+server.ts`
- `src/routes/api/media/calls/[callId]/accept/+server.ts`
- `src/routes/api/media/calls/[callId]/decline/+server.ts`
- `src/routes/api/media/calls/[callId]/end/+server.ts`
- `src/routes/api/media/calls/[callId]/connection/+server.ts`
- `src/routes/api/media/realtime-token/+server.ts`

Primary frontend files:

- `src/routes/chat/[conversationId]/+page.server.ts`
- `src/routes/chat/[conversationId]/+page.svelte`
- `src/lib/features/media/client/webrtc.ts`

Realtime helper:

- `src/lib/server/realtime/ably.ts`

## Operational Notes

The current design is appropriate for:

- 1:1 calling between two users

It is not yet appropriate for:

- larger room calls
- one-to-many live broadcasting at scale
- recording
- moderation workflows
- screen sharing controls
- device selection UX

Those need further implementation from `implementation_plan.txt`.

## Troubleshooting

### Call button appears but call creation fails

Check:

- database migrations ran successfully
- the users are in a valid direct conversation
- the other participant is not already in another active call

### Call starts but media never connects

Check:

- camera/microphone permissions
- browser console for ICE or SDP errors
- TURN credentials
- whether both users are on different NAT/firewall conditions

### Ably signaling fails

Check:

- `ABLY_API_KEY`
- whether the user is logged in
- whether the token route returns 200

### Remote video stays blank

Check:

- the other user accepted the call
- both peers published signaling messages successfully
- ICE candidates are arriving
- remote media was not blocked by permissions or track failures

## Recommended Next Hardening Steps

- add explicit missed-call timeout handling
- add richer busy-state UX
- publish media-state events for mute/camera changes
- add device selection
- add call reconnection handling
- add TURN credentials in all non-local environments
