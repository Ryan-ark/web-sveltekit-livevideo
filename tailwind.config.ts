import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				surface: 'hsl(var(--color-surface) / <alpha-value>)',
				canvas: 'hsl(var(--color-canvas) / <alpha-value>)',
				ink: 'hsl(var(--color-ink) / <alpha-value>)',
				muted: 'hsl(var(--color-muted) / <alpha-value>)',
				line: 'hsl(var(--color-line) / <alpha-value>)',
				brand: {
					DEFAULT: 'hsl(var(--color-brand) / <alpha-value>)',
					strong: 'hsl(var(--color-brand-strong) / <alpha-value>)',
					soft: 'hsl(var(--color-brand-soft) / <alpha-value>)'
				},
				success: 'hsl(var(--color-success) / <alpha-value>)',
				warning: 'hsl(var(--color-warning) / <alpha-value>)',
				danger: 'hsl(var(--color-danger) / <alpha-value>)'
			},
			boxShadow: {
				panel: '0 18px 50px -24px rgba(8, 28, 21, 0.28)'
			},
			borderRadius: {
				panel: '1.5rem'
			},
			fontFamily: {
				display: [
					'"Space Grotesk"',
					'ui-sans-serif',
					'system-ui',
					'sans-serif'
				],
				body: [
					'"Plus Jakarta Sans"',
					'ui-sans-serif',
					'system-ui',
					'sans-serif'
				]
			}
		}
	},
	plugins: [forms, typography]
};

export default config;
