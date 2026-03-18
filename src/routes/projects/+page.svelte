<script lang="ts">
	import type { PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import EmptyState from '$ui/components/empty-state.svelte';

	let { data }: { data: PageData } = $props();
</script>

<section class="flex items-end justify-between gap-4">
	<div>
		<p class="kicker">Projects</p>
		<h1 class="page-title mt-3">Manage your project records</h1>
		<p class="page-copy mt-4 max-w-2xl">
			This list page demonstrates a read-focused route that delegates all data
			fetching to the project service and query layer.
		</p>
	</div>

	{#if data.auth.permissions.canCreateProjects}
		<a href="/projects/create" class="shrink-0">
			<Button>Create project</Button>
		</a>
	{/if}
</section>

<section class="mt-8">
	{#if data.projects.length === 0}
		<EmptyState
			title="No projects yet"
			copy="Create the first project to initialize the relational CRUD flow and seed more sample data later."
		>
			{#snippet action()}
				{#if data.auth.permissions.canCreateProjects}
					<a href="/projects/create">
						<Button>Create project</Button>
					</a>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid gap-5 lg:grid-cols-2">
			{#each data.projects as project}
				<article class="panel p-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="font-display text-3xl font-semibold text-ink">
								{project.name}
							</h2>
							<p class="mt-3 text-sm leading-6 text-muted">
								{project.description || 'No description yet.'}
							</p>
						</div>
						<span
							class="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong"
						>
							{project.status}
						</span>
					</div>

					<div
						class="mt-5 flex items-center justify-between border-t border-line/80 pt-5 text-sm text-muted"
					>
						<p>
							{project.tasks.length} linked task{project.tasks.length === 1
								? ''
								: 's'}
						</p>
						<a
							class="font-semibold no-underline"
							href={`/projects/${project.id}`}>Open details</a
						>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
