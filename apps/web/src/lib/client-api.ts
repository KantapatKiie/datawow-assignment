import { toApiError } from './api-error';

/**
 * Browser-side calls go through the Next route handler at /api/backend, which forwards them to
 * NestJS with the httpOnly cookie turned into an Authorization header.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, body);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export async function authRequest<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiError(response.status, body);
  }

  return body as T;
}
