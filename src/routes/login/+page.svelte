<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import Input from '$ui/components/input.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function getLoginValue(field: 'email' | 'password') {
		if (form?.form && field in form.form) {
			const value = form.form[field];
			return typeof value === 'string' ? value : '';
		}

		return '';
	}

	function getLoginError(field: 'email' | 'password') {
		if (!form?.errors) {
			return undefined;
		}

		const errors = form.errors as Record<string, string[] | undefined>;
		const value = errors[field];
		return Array.isArray(value) ? value[0] : undefined;
	}
</script>

<section class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
	<div class="panel p-8 sm:p-10">
		<p class="kicker">Secure Access</p>
		<h1 class="page-title mt-4">
			Sign in to manage projects, tasks, and role-based accounts.
		</h1>
		<p class="page-copy mt-5">
			Authentication is now session-based and server-validated. Project and task
			mutations are restricted by role instead of open public access.
		</p>

		<div class="mt-8 space-y-4 text-sm leading-6 text-muted">
			<p>Admins manage user accounts and role assignment.</p>
			<p>Managers can maintain projects and tasks.</p>
			<p>Members can sign in and access the protected workspace.</p>
		</div>
	</div>

	<form class="panel space-y-6 p-6 sm:p-8" method="POST">
		<div>
			<p class="kicker">Login</p>
			<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
				Use your email and password
			</h2>
		</div>

		{#if form?.message}
			<div
				class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{form.message}
			</div>
		{/if}

		<Input
			id="email"
			name="email"
			type="email"
			label="Email"
			autocomplete="email"
			placeholder="admin@example.com"
			required
			value={getLoginValue('email')}
			error={getLoginError('email')}
		/>

		<Input
			id="password"
			name="password"
			type="password"
			label="Password"
			autocomplete="current-password"
			required
			value={getLoginValue('password')}
			error={getLoginError('password')}
		/>

		<input type="hidden" name="next" value={data.next} />

		<Button type="submit" block>Sign in</Button>
	</form>
</section>
