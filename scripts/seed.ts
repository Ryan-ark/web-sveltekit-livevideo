import 'dotenv/config';

import { betterAuth } from 'better-auth';
import { eq } from 'drizzle-orm';

import { closeDbConnections } from '../src/lib/server/db/client';
import { getDb } from '../src/lib/server/db/client';
import { users } from '../src/lib/server/db/schema';
import { normalizeRole, type AuthActor } from '../src/lib/server/auth/permissions';
import { projectRepository } from '../src/lib/server/features/projects/project.repository';
import { projectService } from '../src/lib/server/features/projects/project.service';
import { taskService } from '../src/lib/server/features/tasks/task.service';
import { getServerEnv } from '../src/lib/config/env.server';
import { getAuthOptions } from '../src/lib/server/auth/options';

async function ensureBootstrapAdmin() {
	const env = getServerEnv();
	const auth = betterAuth(getAuthOptions());

	if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
		return;
	}

	const db = getDb();
	const [existingAdmin] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, env.BOOTSTRAP_ADMIN_EMAIL))
		.limit(1);

	if (existingAdmin) {
		console.info('Admin bootstrap skipped: admin account already exists.');
		return;
	}

	await auth.api.createUser({
		body: {
			email: env.BOOTSTRAP_ADMIN_EMAIL,
			password: env.BOOTSTRAP_ADMIN_PASSWORD,
			name: env.BOOTSTRAP_ADMIN_NAME || 'Project Pulse Admin',
			role: 'admin'
		}
	});

	console.info('Bootstrap admin created successfully.');
}

async function getSeedActor(): Promise<AuthActor> {
	const env = getServerEnv();

	if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
		throw new Error(
			'BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set before running the seed.'
		);
	}

	const db = getDb();
	const [adminUser] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role
		})
		.from(users)
		.where(eq(users.email, env.BOOTSTRAP_ADMIN_EMAIL))
		.limit(1);

	if (!adminUser) {
		throw new Error('Bootstrap admin was not found after initialization.');
	}

	return {
		userId: adminUser.id,
		email: adminUser.email,
		name: adminUser.name,
		role: normalizeRole(adminUser.role)
	};
}

async function seed() {
	await ensureBootstrapAdmin();
	const actor = await getSeedActor();

	const existingProjects = await projectRepository.findAll();

	if (existingProjects.length > 0) {
		console.info('Seed skipped: database already contains projects.');
		return;
	}

	const websiteRevamp = await projectService.createProject(actor, {
		name: 'Website Revamp',
		description:
			'Refresh the public marketing site, tighten performance budgets, and ship a clearer conversion funnel.',
		status: 'active'
	});

	const onboardingOps = await projectService.createProject(actor, {
		name: 'Customer Onboarding Ops',
		description:
			'Codify onboarding checklists and training assets so service delivery is consistent across new clients.',
		status: 'paused'
	});

	await taskService.createTask(actor, {
		projectId: websiteRevamp.id,
		title: 'Finalize new information architecture',
		details: 'Confirm page hierarchy and CTA placement with the product team.'
	});

	await taskService.createTask(actor, {
		projectId: websiteRevamp.id,
		title: 'Prepare launch QA checklist',
		details: 'Cover responsive behavior, forms, and analytics validation.'
	});

	await taskService.createTask(actor, {
		projectId: onboardingOps.id,
		title: 'Draft customer kickoff template',
		details:
			'Turn the recurring onboarding meeting flow into a reusable template.'
	});

	console.info('Seed completed successfully.');
}

seed()
	.catch((error) => {
		console.error('Seed failed.', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await closeDbConnections();
	});
