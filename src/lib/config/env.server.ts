import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
	DATABASE_URL: z
		.string()
		.min(1, 'DATABASE_URL is required.')
		.refine(
			(value: string) =>
				value.startsWith('postgres://') || value.startsWith('postgresql://'),
			'DATABASE_URL must be a PostgreSQL connection string.'
		),
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),
	APP_ENV: z.enum(['local', 'preview', 'production']).default('local'),
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long.'),
	BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL.'),
	BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
	BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional(),
	BOOTSTRAP_ADMIN_NAME: z.string().min(2).optional()
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
	if (cachedEnv) {
		return cachedEnv;
	}

	const parsed = envSchema.safeParse(process.env);

	if (!parsed.success) {
		const details = parsed.error.issues.map(
			(issue: { path: PropertyKey[]; message: string }) =>
				`${issue.path.join('.')}: ${issue.message}`
		);
		throw new Error(
			`Invalid server environment configuration.\n${details.join('\n')}`
		);
	}

	cachedEnv = parsed.data;
	return cachedEnv;
}
