<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import { appConfig } from '$config/app';

	let {
		data,
		children
	}: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{appConfig.name}</title>
	<meta name="description" content={appConfig.description} />
</svelte:head>

<div class="page-shell">
	<header
		class="mb-8 flex flex-col gap-5 rounded-panel border border-line/70 bg-surface/80 px-5 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
	>
		<div>
			<a class="font-display text-2xl font-bold text-ink no-underline" href="/"
				>{appConfig.name}</a
			>
			<p class="mt-1 text-sm text-muted">
				Role-aware SvelteKit workspace secured with server-validated sessions.
			</p>
		</div>

		<nav class="flex flex-wrap items-center gap-3 text-sm font-semibold">
			<a
				class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
				href="/">Overview</a
			>
			<a
				class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
				href="/projects">Projects</a
			>
			{#if data.auth.isAuthenticated}
				<a
					class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
					href="/chat">Chat</a
				>
				<a
					class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
					href="/live">Live</a
				>
			{/if}
			{#if data.auth.permissions.canCreateProjects}
				<a
					class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
					href="/projects/create">New Project</a
				>
			{/if}
			{#if data.auth.permissions.canManageUsers}
				<a
					class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
					href="/users">Users</a
				>
			{/if}
			{#if data.auth.isAuthenticated && data.auth.user}
				<div
					class="rounded-full border border-line/80 bg-white/80 px-4 py-2 text-ink"
				>
					{data.auth.user.name}
					<span class="text-muted">({data.auth.role})</span>
				</div>
				<form method="POST" action="/logout">
					<button
						class="rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-brand hover:bg-brand-soft/40"
						type="submit"
					>
						Logout
					</button>
				</form>
			{:else}
				<a
					class="rounded-full border border-line px-4 py-2 no-underline transition hover:border-brand hover:bg-brand-soft/40"
					href="/login">Login</a
				>
			{/if}
		</nav>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>
</div>
