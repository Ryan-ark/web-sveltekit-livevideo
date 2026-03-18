import { z } from 'zod';

import { ValidationError } from '$server/shared/errors/app-error';

export const uuidSchema = z.uuid();

export function parseUuid(value: string, label = 'id') {
	const parsed = uuidSchema.safeParse(value);

	if (!parsed.success) {
		throw new ValidationError(`Invalid ${label}.`, { [label]: value });
	}

	return parsed.data;
}
