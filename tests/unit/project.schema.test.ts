import { describe, expect, it } from 'vitest';

import { createProjectSchema } from '../../src/lib/server/features/projects/project.schema';
import { createTaskSchema } from '../../src/lib/server/features/tasks/task.schema';

describe('project schema', () => {
	it('accepts valid project input', () => {
		const result = createProjectSchema.safeParse({
			name: 'Platform Cleanup',
			description: 'Refactor the platform shell.',
			status: 'active'
		});

		expect(result.success).toBe(true);
	});

	it('rejects too-short project names', () => {
		const result = createProjectSchema.safeParse({
			name: 'A',
			description: '',
			status: 'active'
		});

		expect(result.success).toBe(false);
	});
});

describe('task schema', () => {
	it('requires a valid project id', () => {
		const result = createTaskSchema.safeParse({
			projectId: 'not-a-uuid',
			title: 'Write docs',
			details: ''
		});

		expect(result.success).toBe(false);
	});
});
