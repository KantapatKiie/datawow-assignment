import 'server-only';
import { toApiError } from './api-error';
import { readToken } from './session';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000/api';

/**
 * Server-side call into the NestJS API. The JWT never reaches the browser: it lives in an
 * httpOnly cookie and is attached here, or by the /api/backend proxy for client components.
 */
export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await readToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, body);
  }

  return body as T;
}
