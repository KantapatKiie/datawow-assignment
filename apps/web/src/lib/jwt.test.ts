import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeToken } from './jwt';

const encode = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

afterEach(() => {
  vi.useRealTimers();
});

describe('decodeToken', () => {
  it('reads the claims out of a well-formed token', () => {
    const token = encode({ sub: 'user-1', email: 'a@b.io', role: 'ADMIN' });

    expect(decodeToken(token)).toMatchObject({ sub: 'user-1', role: 'ADMIN' });
  });

  it('treats an expired token as no session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    const token = encode({
      sub: 'user-1',
      email: 'a@b.io',
      role: 'USER',
      exp: Math.floor(new Date('2026-05-31T23:00:00Z').getTime() / 1000),
    });

    expect(decodeToken(token)).toBeNull();
  });

  it('keeps a token that has not expired yet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    const token = encode({
      sub: 'user-1',
      email: 'a@b.io',
      role: 'USER',
      exp: Math.floor(new Date('2026-06-02T00:00:00Z').getTime() / 1000),
    });

    expect(decodeToken(token)?.sub).toBe('user-1');
  });

  it.each(['', 'garbage', 'only.two', 'a.!!!not-base64!!!.c'])(
    'returns null for %s instead of throwing',
    (token) => {
      expect(decodeToken(token)).toBeNull();
    },
  );

  it('rejects a payload without the fields the app relies on', () => {
    expect(decodeToken(encode({ email: 'a@b.io' }))).toBeNull();
  });
});
