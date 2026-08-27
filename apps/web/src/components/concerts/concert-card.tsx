'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/toast/toast-provider';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { api } from '@/lib/client-api';
import type { Concert } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

export function ConcertCard({ concert }: { concert: Concert }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const reserved = concert.myReservation !== null;
  const busy = pending || refreshing;
  const takenRatio = concert.totalSeats === 0 ? 0 : concert.reservedSeats / concert.totalSeats;

  async function run(action: 'reserve' | 'cancel') {
    setPending(true);
    try {
      if (action === 'reserve') {
        await api.post('/reservations', { concertId: concert.id });
        toast.success(`Seat reserved for ${concert.name}`);
      } else {
        await api.delete(`/reservations/${concert.myReservation?.id}`);
        toast.success(`Reservation cancelled for ${concert.name}`);
      }
      startRefresh(() => router.refresh());
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
      // Someone else may have taken the last seat; pull the real numbers back in.
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        startRefresh(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="surface flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold leading-snug">{concert.name}</h2>
        {reserved ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-dark">
            Reserved
          </span>
        ) : concert.isSoldOut ? (
          <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
            Sold out
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            {formatNumber(concert.availableSeats)} left
          </span>
        )}
      </div>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{concert.description}</p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} />
            {formatNumber(concert.reservedSeats)} of {formatNumber(concert.totalSeats)} seats
            reserved
          </span>
          <span>{Math.round(takenRatio * 100)}%</span>
        </div>
        <div className="seat-meter">
          <div
            className={cn('seat-meter__fill', concert.isSoldOut && 'seat-meter__fill--full')}
            style={{ width: `${Math.min(100, takenRatio * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        {reserved ? (
          <Button variant="danger" block loading={busy} onClick={() => run('cancel')}>
            Cancel reservation
          </Button>
        ) : (
          <Button
            block
            loading={busy}
            disabled={concert.isSoldOut}
            onClick={() => run('reserve')}
            title={concert.isSoldOut ? 'No seats left for this concert' : undefined}
          >
            {concert.isSoldOut ? 'Sold out' : 'Reserve'}
          </Button>
        )}
      </div>
    </article>
  );
}
