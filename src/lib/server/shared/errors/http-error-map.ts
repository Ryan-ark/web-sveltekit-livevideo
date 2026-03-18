import { AppError } from './app-error';

export function getHttpErrorDetails(error: unknown) {
	if (error instanceof AppError) {
		return {
			status: error.status,
			message: error.message,
			code: error.code,
			details: error.details
		};
	}

	return {
		status: 500,
		message: 'An unexpected server error occurred.',
		code: 'UNKNOWN' as const,
		details: undefined
	};
}
