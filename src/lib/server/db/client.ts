import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getServerEnv } from '../../config/env.server';
import * as schema from './schema';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createPool() {
	const env = getServerEnv();
	const usesLocalDatabase =
		env.DATABASE_URL.includes('localhost') ||
		env.DATABASE_URL.includes('127.0.0.1');

	return new Pool({
		connectionString: env.DATABASE_URL,
		ssl: usesLocalDatabase ? false : { rejectUnauthorized: false }
	});
}

export function getDb() {
	if (!db) {
		pool = createPool();
		db = drizzle(pool, { schema });
	}

	return db;
}

export async function closeDbConnections() {
	if (pool) {
		await pool.end();
	}

	pool = null;
	db = null;
}

export type Database = ReturnType<typeof getDb>;
