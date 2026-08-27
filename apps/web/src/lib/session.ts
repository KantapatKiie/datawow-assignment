import { cookies } from 'next/headers';
import { decodeToken } from './jwt';
import type { SessionUser } from './types';

export const TOKEN_COOKIE = 'dw_token';
export const USER_COOKIE = 'dw_user';

const ONE_DAY_SECONDS = 60 * 60 * 24;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.AUTH_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: ONE_DAY_SECONDS,
  };
}

export async function readToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

/**
 * The profile is cached in a readable cookie next to the httpOnly token so the shell can render
 * the user name without an extra round trip. It is display data only - nothing is authorised
 * from it.
 */
export async function readSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token || !decodeToken(token)) return null;

  const raw = store.get(USER_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionUser;
  } catch {
    return null;
  }
}
