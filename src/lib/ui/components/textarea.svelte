<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = HTMLTextareaAttributes & {
		label: string;
		error?: string;
	};

	let { label, error, id, class: className = '', ...rest }: Props = $props();
</script>

<label class="flex flex-col gap-2 text-sm font-medium text-ink" for={id}>
	<span>{label}</span>
	<textarea
		{id}
		class={`min-h-32 w-full rounded-3xl border px-4 py-3 text-sm shadow-sm transition focus:border-brand focus:ring-brand ${error ? 'border-danger/70 focus:border-danger focus:ring-danger' : 'border-line bg-white'} ${className}`}
		{...rest}
	></textarea>
	{#if error}
		<span class="text-sm text-danger">{error}</span>
	{/if}
</label>
