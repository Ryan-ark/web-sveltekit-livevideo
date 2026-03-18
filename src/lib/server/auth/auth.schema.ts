import { z } from 'zod';

import { appRoles } from './permissions';

export const loginSchema = z.object({
	email: z.email('Enter a valid email address.').trim().toLowerCase(),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters long.')
		.max(128, 'Password must be 128 characters or fewer.')
});

export const createUserSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name must be at least 2 characters.')
		.max(120, 'Name must be 120 characters or fewer.'),
	email: z.email('Enter a valid email address.').trim().toLowerCase(),
	password: z
		.string()
		.min(12, 'Password must be at least 12 characters long.')
		.max(128, 'Password must be 128 characters or fewer.'),
	role: z.enum(appRoles).default('member')
});

export const updateUserRoleSchema = z.object({
	userId: z.string().min(1, 'User id is required.'),
	role: z.enum(appRoles)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
