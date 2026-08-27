import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/server-api';
import { TOKEN_COOKIE, USER_COOKIE, cookieOptions } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}

/**
 * Exchanges credentials with the API and keeps the token in an httpOnly cookie, so no script
 * running in the page can read it. Only the display profile is written to a readable cookie.
 */
export async function proxyAuth(request: NextRequest, endpoint: 'login' | 'register') {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json(
      { statusCode: 400, message: 'Invalid request body' },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${API_URL}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(body ?? { message: 'Authentication failed' }, {
      status: upstream.status,
    });
  }

  const { accessToken, user } = body as AuthResponse;
  const response = NextResponse.json({ user }, { status: upstream.status });

  response.cookies.set(TOKEN_COOKIE, accessToken, cookieOptions());
  response.cookies.set(USER_COOKIE, encodeURIComponent(JSON.stringify(user)), {
    ...cookieOptions(),
    httpOnly: false,
  });

  return response;
}
