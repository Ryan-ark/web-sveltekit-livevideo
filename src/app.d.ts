import type { AuthSession, AuthUser } from '$server/auth/auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId: string;
			user: AuthUser | null;
			session: AuthSession | null;
			isAuthenticated: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
