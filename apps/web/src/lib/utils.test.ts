import { describe, expect, it } from 'vitest';
import { cn, formatNumber, initials } from './utils';

describe('cn', () => {
  it('keeps the last conflicting tailwind class', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('btn', false && 'hidden', undefined, 'btn--primary')).toBe('btn btn--primary');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('initials', () => {
  it.each([
    ['Somchai Prasert', 'SP'],
    ['Admin', 'A'],
    ['  spaced   out  name ', 'SO'],
  ])('turns %s into %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
