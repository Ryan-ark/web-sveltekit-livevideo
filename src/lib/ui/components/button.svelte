<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

	type Props = HTMLButtonAttributes & {
		children?: Snippet;
		variant?: Variant;
		block?: boolean;
	};

	const variantClasses: Record<Variant, string> = {
		primary: 'bg-brand text-white hover:bg-brand-strong',
		secondary: 'bg-ink text-white hover:bg-ink/90',
		ghost: 'border border-line bg-white/70 text-ink hover:bg-brand-soft/40',
		danger: 'bg-danger text-white hover:bg-danger/90'
	};

	let {
		children,
		variant = 'primary',
		block = false,
		class: className = '',
		...rest
	}: Props = $props();
</script>

<button
	class={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${block ? 'w-full' : ''} ${className}`}
	{...rest}
>
	{@render children?.()}
</button>
