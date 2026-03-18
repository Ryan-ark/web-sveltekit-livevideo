import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required to run Drizzle commands.');
}

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema/index.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL
	},
	verbose: true,
	strict: true
});
