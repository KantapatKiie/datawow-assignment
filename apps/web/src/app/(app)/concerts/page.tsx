import { CalendarX } from 'lucide-react';
import type { Metadata } from 'next';
import { ConcertCard } from '@/components/concerts/concert-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { serverFetch } from '@/lib/server-api';
import type { Concert, Paginated } from '@/lib/types';

export const metadata: Metadata = { title: 'Concerts' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 9;

export default async function ConcertsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const { items, meta } = await serverFetch<Paginated<Concert>>(
    `/concerts?page=${page}&limit=${PAGE_SIZE}`,
  );

  const reservedCount = items.filter((concert) => concert.myReservation).length;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Concerts</h1>
        <p className="mt-1 text-sm text-muted">
          One seat per concert. Cancel any time and the seat goes straight back to the pool.
          {reservedCount > 0 && ` You hold ${reservedCount} seat${reservedCount > 1 ? 's' : ''} on this page.`}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<CalendarX size={28} />}
            title="No concerts published yet"
            description="Once an administrator publishes a concert it will show up here."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((concert) => (
              <ConcertCard key={concert.id} concert={concert} />
            ))}
          </div>
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            basePath="/concerts"
            label="concerts"
          />
        </>
      )}
    </div>
  );
}
