import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/toast/toast-provider';
import { ApiError } from '@/lib/api-error';
import type { Concert } from '@/lib/types';
import { ConcertCard } from './concert-card';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/lib/client-api', () => ({
  api: { post: vi.fn(), delete: vi.fn(), get: vi.fn() },
}));

const { api } = await import('@/lib/client-api');

const concert = (overrides: Partial<Concert> = {}): Concert => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'The Nights Concert',
  description: 'An open-air night of indie and pop.',
  totalSeats: 100,
  reservedSeats: 40,
  availableSeats: 60,
  isSoldOut: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  myReservation: null,
  ...overrides,
});

const renderCard = (data: Concert) =>
  render(
    <ToastProvider>
      <ConcertCard concert={data} />
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConcertCard', () => {
  it('shows how many seats are left and the reserve action', () => {
    renderCard(concert());

    expect(screen.getByRole('heading', { name: 'The Nights Concert' })).toBeInTheDocument();
    expect(screen.getByText('60 left')).toBeInTheDocument();
    expect(screen.getByText('40 of 100 seats reserved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reserve' })).toBeEnabled();
  });

  it('disables booking and says sold out when the concert is full', () => {
    renderCard(concert({ reservedSeats: 100, availableSeats: 0, isSoldOut: true }));

    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled();
    expect(screen.getAllByText('Sold out').length).toBeGreaterThan(0);
  });

  it('reserves a seat and refreshes the list', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    renderCard(concert());

    await userEvent.click(screen.getByRole('button', { name: 'Reserve' }));

    expect(api.post).toHaveBeenCalledWith('/reservations', {
      concertId: '11111111-1111-4111-8111-111111111111',
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByText(/Seat reserved for The Nights Concert/)).toBeInTheDocument();
  });

  it('offers cancel instead when the user already holds a seat', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    renderCard(
      concert({
        myReservation: { id: 'res-1', status: 'RESERVED', reservedAt: '2026-01-02T00:00:00.000Z' },
      }),
    );

    expect(screen.getByText('Reserved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel reservation' }));

    expect(api.delete).toHaveBeenCalledWith('/reservations/res-1');
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('surfaces the API message when the last seat is gone', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError('This concert is fully booked', 409));
    renderCard(concert({ availableSeats: 1, reservedSeats: 99 }));

    await userEvent.click(screen.getByRole('button', { name: 'Reserve' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This concert is fully booked');
    // A lost race means the on-screen numbers are stale, so the page is pulled again.
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
