import { describe, expect, it } from 'vitest';
import { concertSchema, fieldErrors, loginSchema, registerSchema } from './validation';

describe('loginSchema', () => {
  it('accepts a valid pair', () => {
    expect(loginSchema.safeParse({ email: 'a@b.io', password: 'x' }).success).toBe(true);
  });

  it('trims the email before validating', () => {
    const result = loginSchema.safeParse({ email: '  a@b.io  ', password: 'x' });
    expect(result.success && result.data.email).toBe('a@b.io');
  });

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it.each([
    ['short', 'Passwo1', 'at least 8 characters'],
    ['letters only', 'password', 'at least one number'],
    ['digits only', '12345678', 'at least one letter'],
  ])('rejects a %s password', (_label, password, expected) => {
    const result = registerSchema.safeParse({ name: 'Somchai', email: 'a@b.io', password });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).password).toContain(expected);
    }
  });

  it('accepts a password with a letter and a number', () => {
    expect(
      registerSchema.safeParse({ name: 'Somchai', email: 'a@b.io', password: 'Passw0rd' }).success,
    ).toBe(true);
  });
});

describe('concertSchema', () => {
  const valid = {
    name: 'The Nights Concert',
    description: 'A night of live music at the stadium',
    totalSeats: 500,
  };

  it('accepts a complete concert', () => {
    expect(concertSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero seats', () => {
    const result = concertSchema.safeParse({ ...valid, totalSeats: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).totalSeats).toBe('Total of seat must be at least 1');
    }
  });

  it('rejects a fractional seat count', () => {
    expect(concertSchema.safeParse({ ...valid, totalSeats: 12.5 }).success).toBe(false);
  });

  it('reports a missing seat count rather than crashing on NaN', () => {
    const result = concertSchema.safeParse({ ...valid, totalSeats: Number.NaN });
    expect(result.success).toBe(false);
  });

  it('collects one message per field', () => {
    const result = concertSchema.safeParse({ name: 'a', description: 'b', totalSeats: 0 });
    if (result.success) throw new Error('expected the parse to fail');

    expect(Object.keys(fieldErrors(result.error)).sort()).toEqual([
      'description',
      'name',
      'totalSeats',
    ]);
  });
});
