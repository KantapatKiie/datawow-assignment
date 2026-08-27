import { CalendarX } from 'lucide-react';
import { DeleteConcertButton } from '@/components/admin/delete-concert-button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Concert } from '@/lib/types';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';

export function ConcertAdminList({ concerts }: { concerts: Concert[] }) {
  if (concerts.length === 0) {
    return (
      <div className="surface">
        <EmptyState
          icon={<CalendarX size={28} />}
          title="No concerts yet"
          description="Switch to the Create tab to publish the first one."
        />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {concerts.map((concert) => {
        const takenRatio = concert.totalSeats === 0 ? 0 : concert.reservedSeats / concert.totalSeats;

        return (
          <li key={concert.id} className="surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{concert.name}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Published {formatDateTime(concert.createdAt)}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted">
                {formatNumber(concert.totalSeats)} seats
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted">{concert.description}</p>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>
                  {formatNumber(concert.reservedSeats)} reserved -{' '}
                  {formatNumber(concert.availableSeats)} available
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

            <div className="mt-5 flex justify-end">
              <DeleteConcertButton concert={concert} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
