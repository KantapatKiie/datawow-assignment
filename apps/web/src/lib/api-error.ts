export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string | string[];
  error?: string;
}

/** The API answers with { message: string | string[] }; flatten it into something displayable. */
export function toApiError(status: number, body: unknown): ApiError {
  const payload = (body ?? {}) as ErrorBody;
  const messages = Array.isArray(payload.message)
    ? payload.message
    : payload.message
      ? [payload.message]
      : [];

  const fallback =
    status === 401
      ? 'Your session has expired. Please sign in again.'
      : status === 403
        ? 'You do not have permission to do that.'
        : status >= 500
          ? 'The server is not responding. Please try again.'
          : 'Something went wrong.';

  return new ApiError(messages[0] ?? payload.error ?? fallback, status, messages);
}
