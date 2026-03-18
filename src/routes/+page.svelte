<script lang="ts">
	import type { PageData } from './$types';

	import Button from '$ui/components/button.svelte';

	let { data }: { data: PageData } = $props();
</script>

<section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
	<div class="panel overflow-hidden p-8 sm:p-10">
		<p class="kicker">Scalable CRUD Starter</p>
		<h1 class="page-title mt-4 max-w-3xl">
			Build fast locally. Deploy cleanly on Vercel. Keep the codebase readable.
		</h1>
		<p class="page-copy mt-5 max-w-2xl">
			Project Pulse demonstrates a feature-first SvelteKit architecture with
			PostgreSQL, Drizzle, Zod validation, and reusable Tailwind UI primitives.
		</p>

		<div class="mt-8 flex flex-wrap gap-3">
			{#if data.auth.permissions.canCreateProjects}
				<a href="/projects/create">
					<Button>Create a project</Button>
				</a>
			{/if}
			<a href="/projects">
				<Button variant={data.auth.permissions.canCreateProjects ? 'ghost' : 'primary'}
					>Browse projects</Button
				>
			</a>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
		<div class="stat-tile">
			<p class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
				Projects
			</p>
			<p class="mt-3 font-display text-4xl font-bold text-ink">
				{data.summary.totalProjects}
			</p>
		</div>
		<div class="stat-tile">
			<p class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
				Active Projects
			</p>
			<p class="mt-3 font-display text-4xl font-bold text-ink">
				{data.summary.activeProjects}
			</p>
		</div>
		<div class="stat-tile">
			<p class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
				Tasks
			</p>
			<p class="mt-3 font-display text-4xl font-bold text-ink">
				{data.summary.totalTasks}
			</p>
		</div>
		<div class="stat-tile">
			<p class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
				Completed Tasks
			</p>
			<p class="mt-3 font-display text-4xl font-bold text-ink">
				{data.summary.completedTasks}
			</p>
		</div>
	</div>
</section>

<section class="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
	<div class="panel p-6">
		<p class="kicker">Architecture</p>
		<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
			How this starter stays easy to scale
		</h2>
		<ul class="mt-5 space-y-3 text-sm leading-6 text-muted">
			<li>
				Feature modules isolate validation, repository access, queries, and
				business rules.
			</li>
			<li>
				Routes remain orchestration-only, which keeps request handling thin and
				predictable.
			</li>
			<li>
				Database access stays under `src/lib/server`, so browser code cannot
				import it by accident.
			</li>
			<li>
				Drizzle schema and migrations are committed, which keeps local and
				Vercel environments aligned.
			</li>
		</ul>
	</div>

	<div class="panel p-6">
		<div class="flex items-center justify-between gap-4">
			<div>
				<p class="kicker">Recent Projects</p>
				<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
					Current sample data
				</h2>
			</div>
			<a class="text-sm font-semibold no-underline" href="/projects">View all</a
			>
		</div>

		{#if data.recentProjects.length === 0}
			<p
				class="mt-5 rounded-3xl border border-dashed border-line bg-canvas/70 px-4 py-6 text-sm text-muted"
			>
				No data yet. Create a project to start the sample CRUD workflow.
			</p>
		{:else}
			<div class="mt-5 space-y-4">
				{#each data.recentProjects as project}
					<a
						class="block rounded-3xl border border-line bg-white/80 p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand"
						href={`/projects/${project.id}`}
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-display text-2xl font-semibold text-ink">
									{project.name}
								</h3>
								<p class="mt-2 text-sm leading-6 text-muted">
									{project.description || 'No description yet.'}
								</p>
							</div>
							<span
								class="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong"
							>
								{project.status}
							</span>
						</div>
						<p class="mt-4 text-sm text-muted">
							{project.tasks.length} task{project.tasks.length === 1 ? '' : 's'}
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
