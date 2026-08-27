import type { Role } from './types';

export interface TokenClaims {
  sub: string;
  email: string;
  role: Role;
  exp?: number;
}

/**
 * Reads the claims without verifying the signature. That is deliberate: this only decides
 * which screen to render or redirect to. Every actual permission check happens in the API,
 * which does verify the signature. Runs in the edge runtime, so no Node APIs here.
 */
export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), '=');
    const claims = JSON.parse(atob(padded)) as TokenClaims;

    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    if (!claims.sub || !claims.role) return null;

    return claims;
  } catch {
    return null;
  }
}
