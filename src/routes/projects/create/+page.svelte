<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import FormField from '$ui/components/form-field.svelte';
	import Input from '$ui/components/input.svelte';
	import Textarea from '$ui/components/textarea.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<section class="mx-auto max-w-3xl">
	<div>
		<p class="kicker">Create Project</p>
		<h1 class="page-title mt-3">Add a new project record</h1>
		<p class="page-copy mt-4">
			This write flow uses a server action, Zod validation, and the project
			service before any database insert occurs.
		</p>
	</div>

	<form class="panel mt-8 space-y-6 p-6 sm:p-8" method="POST">
		{#if form?.message}
			<div
				class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
			>
				{form.message}
			</div>
		{/if}

		<Input
			id="name"
			name="name"
			label="Project name"
			placeholder="Q2 Launch Readiness"
			required
			value={form?.form?.name ?? ''}
			error={form?.errors?.name?.[0]}
		/>

		<Textarea
			id="description"
			name="description"
			label="Description"
			placeholder="Explain the goal, scope, and delivery notes for this project."
			value={form?.form?.description ?? ''}
			error={form?.errors?.description?.[0]}
		/>

		<FormField
			label="Status"
			forId="status"
			error={form?.errors?.status?.[0]}
			hint="Use active for normal work, paused for on hold, archived for historical records."
		>
			{#snippet children()}
				<select
					id="status"
					name="status"
					class="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-sm focus:border-brand focus:ring-brand"
				>
					{#each data.statuses as status}
						<option
							value={status}
							selected={(form?.form?.status ?? 'active') === status}
							>{status}</option
						>
					{/each}
				</select>
			{/snippet}
		</FormField>

		<div class="flex flex-wrap gap-3">
			<Button type="submit">Create project</Button>
			<a href="/projects">
				<Button type="button" variant="ghost">Cancel</Button>
			</a>
		</div>
	</form>
</section>
