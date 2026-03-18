<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		copy: string;
		action?: Snippet;
	};

	let { title, copy, action }: Props = $props();
</script>

<section class="panel flex flex-col items-start gap-4 p-6">
	<div>
		<h2 class="font-display text-2xl font-semibold text-ink">{title}</h2>
		<p class="mt-2 max-w-xl text-sm leading-6 text-muted">{copy}</p>
	</div>

	{#if action}
		<div>
			{@render action()}
		</div>
	{/if}
</section>
