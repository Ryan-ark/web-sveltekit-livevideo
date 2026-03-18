<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		forId?: string;
		hint?: string;
		error?: string;
		children?: Snippet;
	};

	let { label, forId, hint, error, children }: Props = $props();
</script>

<label class="flex flex-col gap-2 text-sm font-medium text-ink" for={forId}>
	<span>{label}</span>
	{@render children?.()}
	{#if hint}
		<span class="text-sm text-muted">{hint}</span>
	{/if}
	{#if error}
		<span class="text-sm text-danger">{error}</span>
	{/if}
</label>
