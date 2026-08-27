import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './api-error';

describe('toApiError', () => {
  it('uses the first message when the API returns a validation array', () => {
    const error = toApiError(400, {
      message: ['name must be at least 3 characters', 'totalSeats must be at least 1'],
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('name must be at least 3 characters');
    expect(error.fieldErrors).toHaveLength(2);
  });

  it('passes a single message through', () => {
    expect(toApiError(409, { message: 'This concert is fully booked' }).message).toBe(
      'This concert is fully booked',
    );
  });

  it.each([
    [401, 'Your session has expired. Please sign in again.'],
    [403, 'You do not have permission to do that.'],
    [500, 'The server is not responding. Please try again.'],
    [418, 'Something went wrong.'],
  ])('falls back to a readable message for %i', (status, expected) => {
    expect(toApiError(status, null).message).toBe(expected);
  });

  it('keeps the status for the caller to branch on', () => {
    expect(toApiError(409, {}).status).toBe(409);
  });
});
