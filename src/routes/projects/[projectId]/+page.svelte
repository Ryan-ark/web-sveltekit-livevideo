<script lang="ts">
	import type { ActionData, PageData } from './$types';

	import Button from '$ui/components/button.svelte';
	import Input from '$ui/components/input.svelte';
	import Textarea from '$ui/components/textarea.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function formatDate(value: string | Date) {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function getTaskCompletedValue(taskId: string, fallback: boolean) {
		if (
			form?.intent === 'update-task' &&
			form?.taskId === taskId &&
			form.form &&
			'completed' in form.form
		) {
			return Boolean(form.form.completed);
		}

		return fallback;
	}
</script>

<section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
	<div class="space-y-6">
		<article class="panel p-6 sm:p-8">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="kicker">Project Detail</p>
					<h1 class="page-title mt-3">{data.project.name}</h1>
					<p class="mt-4 max-w-2xl text-sm leading-7 text-muted">
						{data.project.description || 'No description yet.'}
					</p>
				</div>
				<span
					class="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong"
				>
					{data.project.status}
				</span>
			</div>

			<div class="mt-8 grid gap-4 sm:grid-cols-2">
				<div class="rounded-3xl border border-line bg-canvas/60 p-4">
					<p
						class="text-xs font-semibold uppercase tracking-[0.2em] text-muted"
					>
						Created
					</p>
					<p class="mt-2 text-sm text-ink">
						{formatDate(data.project.createdAt)}
					</p>
				</div>
				<div class="rounded-3xl border border-line bg-canvas/60 p-4">
					<p
						class="text-xs font-semibold uppercase tracking-[0.2em] text-muted"
					>
						Updated
					</p>
					<p class="mt-2 text-sm text-ink">
						{formatDate(data.project.updatedAt)}
					</p>
				</div>
			</div>

			<div class="mt-8 flex flex-wrap gap-3">
				{#if data.auth.role === 'admin' || data.auth.role === 'manager'}
					<a href={`/projects/${data.project.id}/edit`}>
						<Button>Edit project</Button>
					</a>
				{/if}

				{#if data.auth.role === 'admin'}
					<form method="POST" action={`/projects/${data.project.id}/delete`}>
						<Button type="submit" variant="danger">Delete project</Button>
					</form>
				{/if}
			</div>
		</article>

		<section class="panel p-6 sm:p-8">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="kicker">Tasks</p>
					<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
						Track execution inside the project
					</h2>
				</div>
				<p class="text-sm text-muted">
					{data.project.tasks.length} task{data.project.tasks.length === 1
						? ''
						: 's'}
				</p>
			</div>

			{#if form?.message && form.intent !== 'create-task'}
				<div
					class="mt-5 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{form.message}
				</div>
			{/if}

			<div class="mt-6 space-y-4">
				{#if data.project.tasks.length === 0}
					<div
						class="rounded-3xl border border-dashed border-line bg-canvas/60 px-4 py-6 text-sm text-muted"
					>
						No tasks yet. Use the form on the right to add the first task.
					</div>
				{:else}
					{#each data.project.tasks as task}
						<form
							class="rounded-[1.75rem] border border-line bg-white/90 p-5"
							method="POST"
							action="?/updateTask"
						>
							<input type="hidden" name="taskId" value={task.id} />

							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<Input
										id={`title-${task.id}`}
										name="title"
										label="Task title"
										value={form?.intent === 'update-task' &&
										form?.taskId === task.id
											? form.form?.title
											: task.title}
										error={form?.intent === 'update-task' &&
										form?.taskId === task.id
											? form.errors?.title?.[0]
											: undefined}
									/>
								</div>
								<label
									class="mt-8 flex items-center gap-3 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
								>
									<input
										class="rounded border-line text-brand focus:ring-brand"
										type="checkbox"
										name="completed"
										checked={getTaskCompletedValue(task.id, task.completed)}
									/>
									Complete
								</label>
							</div>

							<div class="mt-4">
								<Textarea
									id={`details-${task.id}`}
									name="details"
									label="Details"
									value={form?.intent === 'update-task' &&
									form?.taskId === task.id
										? form.form?.details
										: (task.details ?? '')}
									error={form?.intent === 'update-task' &&
									form?.taskId === task.id
										? form.errors?.details?.[0]
										: undefined}
								/>
							</div>

							<div
								class="mt-5 flex flex-wrap items-center justify-between gap-3"
							>
								<p class="text-xs uppercase tracking-[0.16em] text-muted">
									{task.completed ? 'Completed' : 'Open'} task
								</p>
								{#if data.auth.role === 'admin' || data.auth.role === 'manager'}
									<div class="flex flex-wrap gap-3">
										<Button type="submit" variant="secondary">Save task</Button>
										<button
											class="inline-flex items-center justify-center rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/5"
											type="submit"
											formaction="?/deleteTask"
										>
											Delete task
										</button>
									</div>
								{/if}
							</div>
						</form>
					{/each}
				{/if}
			</div>
		</section>
	</div>

	<aside class="panel h-fit p-6 sm:p-8">
		<p class="kicker">Create Task</p>
		<h2 class="mt-3 font-display text-3xl font-semibold text-ink">
			Add a new task
		</h2>
		<p class="mt-4 text-sm leading-6 text-muted">
			Task writes use a named server action so this page can support multiple
			independent forms cleanly.
		</p>

		{#if data.auth.role === 'admin' || data.auth.role === 'manager'}
			<form class="mt-6 space-y-5" method="POST" action="?/createTask">
				{#if form?.intent === 'create-task' && form?.message}
					<div
						class="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
					>
						{form.message}
					</div>
				{/if}

				<Input
					id="title"
					name="title"
					label="Title"
					placeholder="Finalize launch checklist"
					required
					value={form?.intent === 'create-task' ? form.form?.title : ''}
					error={form?.intent === 'create-task'
						? form.errors?.title?.[0]
						: undefined}
				/>

				<Textarea
					id="details"
					name="details"
					label="Details"
					placeholder="Describe what good completion looks like."
					value={form?.intent === 'create-task' ? form.form?.details : ''}
					error={form?.intent === 'create-task'
						? form.errors?.details?.[0]
						: undefined}
				/>

				<Button type="submit" block>Add task</Button>
			</form>
		{:else}
			<div
				class="mt-6 rounded-3xl border border-dashed border-line bg-canvas/60 px-4 py-6 text-sm text-muted"
			>
				Your role can view task records but cannot create or update them.
			</div>
		{/if}
	</aside>
</section>
