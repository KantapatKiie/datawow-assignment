import { NextRequest, NextResponse } from 'next/server';
import { decodeToken } from '@/lib/jwt';

const USER_ROUTES = ['/concerts', '/history'];
const ADMIN_ROUTES = ['/admin'];
const GUEST_ROUTES = ['/login', '/register'];

const matches = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

const homeFor = (role: string) => (role === 'ADMIN' ? '/admin' : '/concerts');

/**
 * Routing-level gate only. It keeps people out of screens they cannot use and sends them
 * somewhere sensible; the API re-checks the signature and the role on every request.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('dw_token')?.value;
  const claims = token ? decodeToken(token) : null;
  const isProtected = matches(pathname, USER_ROUTES) || matches(pathname, ADMIN_ROUTES);

  // Expired or tampered token: drop it, and only bounce if the target actually needs auth.
  if (token && !claims) {
    const response = isProtected
      ? NextResponse.redirect(new URL('/login', request.url))
      : NextResponse.next();
    response.cookies.delete('dw_token');
    response.cookies.delete('dw_user');
    return response;
  }

  if (!claims) {
    if (!isProtected) return NextResponse.next();

    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (matches(pathname, GUEST_ROUTES)) {
    return NextResponse.redirect(new URL(homeFor(claims.role), request.url));
  }

  const wrongSide =
    (claims.role === 'USER' && matches(pathname, ADMIN_ROUTES)) ||
    (claims.role === 'ADMIN' && matches(pathname, USER_ROUTES));

  if (wrongSide) {
    return NextResponse.redirect(new URL(homeFor(claims.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/concerts/:path*', '/history/:path*', '/admin/:path*', '/login', '/register'],
};
