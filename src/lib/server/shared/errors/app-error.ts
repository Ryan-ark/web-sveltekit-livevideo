export class AppError extends Error {
	constructor(
		message: string,
		public readonly code:
			| 'NOT_FOUND'
			| 'VALIDATION'
			| 'AUTHENTICATION'
			| 'AUTHORIZATION'
			| 'CONFLICT'
			| 'DATABASE'
			| 'UNKNOWN',
		public readonly status: number,
		public readonly details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class NotFoundError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'NOT_FOUND', 404, details);
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'VALIDATION', 400, details);
	}
}

export class AuthenticationError extends AppError {
	constructor(message = 'You must be signed in.', details?: Record<string, unknown>) {
		super(message, 'AUTHENTICATION', 401, details);
	}
}

export class AuthorizationError extends AppError {
	constructor(
		message = 'You do not have permission to perform this action.',
		details?: Record<string, unknown>
	) {
		super(message, 'AUTHORIZATION', 403, details);
	}
}
