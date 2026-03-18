<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import FormField from '$ui/components/form-field.svelte';
	import Input from '$ui/components/input.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function getCreateUserValue(field: 'name' | 'email' | 'password' | 'role') {
		if (form?.intent === 'create-user' && form.form && field in form.form) {
			const value = (form.form as Record<string, unknown>)[field];
			return typeof value === 'string' ? value : '';
		}

		return field === 'role' ? 'member' : '';
	}

	function getCreateUserError(
		field: 'name' | 'email' | 'password' | 'role'
	) {
		if (
			form?.intent !== 'create-user' ||
			!form.errors
		) {
			return undefined;
		}

		const errors = form.errors as Record<string, string[] | undefined>;
		const value = errors[field];
		return Array.isArray(value) ? value[0] : undefined;
	}
</script>

<section class="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
	<aside class="panel h-fit space-y-6 p-6 sm:p-8">
		<div>
			<p class="kicker">User Management</p>
			<h1 class="page-title mt-3">Create role-scoped accounts</h1>
			<p class="page-copy mt-4">
				Only admins can create accounts and assign roles. Public sign-up stays
				disabled.
			</p>
		</div>

		<form class="space-y-5" method="POST" action="?/createUser">
			{#if form?.intent === 'create-user' && form?.message}
				<div
					class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{form.message}
				</div>
			{/if}

			<Input
				id="name"
				name="name"
				label="Full name"
				placeholder="Avery Quinn"
				required
				value={getCreateUserValue('name')}
				error={getCreateUserError('name')}
			/>

			<Input
				id="email"
				name="email"
				type="email"
				label="Email"
				placeholder="avery@example.com"
				required
				value={getCreateUserValue('email')}
				error={getCreateUserError('email')}
			/>

			<Input
				id="password"
				name="password"
				type="password"
				label="Temporary password"
				required
				value={getCreateUserValue('password')}
				error={getCreateUserError('password')}
			/>

			<FormField
				label="Role"
				forId="role"
				error={getCreateUserError('role')}
				hint="Use admin for user management, manager for CRUD access, and member for read access."
			>
				{#snippet children()}
					<select
						id="role"
						name="role"
						class="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
					>
						{#each data.roles as role}
							<option
								value={role}
								selected={getCreateUserValue('role') === role}>{role}</option
							>
						{/each}
					</select>
				{/snippet}
			</FormField>

			<Button type="submit" block>Create account</Button>
		</form>
	</aside>

	<section class="panel p-6 sm:p-8">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Directory</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Current application users
				</h2>
			</div>
			<p class="text-sm text-muted">{data.users.length} user(s)</p>
		</div>

		{#if form?.intent === 'update-role' && form?.message}
			<div
				class="mt-5 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{form.message}
			</div>
		{/if}

		<div class="mt-6 space-y-4">
			{#each data.users as user}
				<form
					class="rounded-[1.75rem] border border-line bg-white/90 p-5"
					method="POST"
					action="?/updateRole"
				>
					<input type="hidden" name="userId" value={user.id} />

					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<h3 class="font-display text-2xl font-semibold text-ink">
								{user.name}
							</h3>
							<p class="mt-1 text-sm text-muted">{user.email}</p>
						</div>

						<div class="min-w-[12rem]">
							<label class="flex flex-col gap-2 text-sm font-medium text-ink">
								<span>Role</span>
								<select
									name="role"
									class="rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
								>
									{#each data.roles as role}
										<option value={role} selected={user.role === role}>{role}</option>
									{/each}
								</select>
							</label>
						</div>
					</div>

					<div
						class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-5"
					>
						<div class="text-sm text-muted">
							{user.banned ? 'Banned user' : 'Active user'}
						</div>
						<Button type="submit" variant="secondary">Update role</Button>
					</div>
				</form>
			{/each}
		</div>
	</section>
</section>
