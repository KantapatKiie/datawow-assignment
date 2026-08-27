import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/server-api';
import { TOKEN_COOKIE } from '@/lib/session';

/**
 * Thin BFF proxy. Client components call /api/backend/<path>; the token is read from the
 * httpOnly cookie here and forwarded as a bearer header, so it is never exposed to page scripts.
 */
async function forward(request: NextRequest, segments: string[]) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const search = request.nextUrl.search;
  const target = `${API_URL}/${segments.join('/')}${search}`;

  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';
  const body = hasBody ? await request.text() : undefined;

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body || undefined,
      cache: 'no-store',
    });

    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload ?? {}, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { statusCode: 502, message: 'Cannot reach the API right now. Please try again.' },
      { status: 502 },
    );
  }
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}
