import { ClipboardList } from 'lucide-react';
import type { Metadata } from 'next';
import { HistoryTable } from '@/components/history/history-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { serverFetch } from '@/lib/server-api';
import type { HistoryEntry, Paginated } from '@/lib/types';

export const metadata: Metadata = { title: 'Reservation history' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const { items, meta } = await serverFetch<Paginated<HistoryEntry>>(
    `/reservations?page=${page}&limit=${PAGE_SIZE}`,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Reservation history</h1>
        <p className="mt-1 text-sm text-muted">
          Every reserve and cancel across all attendees, newest first.
        </p>
      </header>

      <div className="surface overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="No reservations yet"
            description="Activity will appear here as soon as attendees start booking."
          />
        ) : (
          <HistoryTable entries={items} showUser />
        )}
      </div>

      {items.length > 0 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          basePath="/admin/history"
          label="events"
        />
      )}
    </div>
  );
}
