import { History } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HistoryTable } from '@/components/history/history-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { serverFetch } from '@/lib/server-api';
import type { HistoryEntry, Paginated } from '@/lib/types';

export const metadata: Metadata = { title: 'My history' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function MyHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const { items, meta } = await serverFetch<Paginated<HistoryEntry>>(
    `/reservations/me?page=${page}&limit=${PAGE_SIZE}`,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">My history</h1>
        <p className="mt-1 text-sm text-muted">
          Every seat you have reserved or cancelled, newest first.
        </p>
      </header>

      <div className="surface overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<History size={28} />}
            title="Nothing here yet"
            description="Reserve a seat and it will show up in this list."
            action={
              <Link href="/concerts" className="btn btn--primary">
                Browse concerts
              </Link>
            }
          />
        ) : (
          <HistoryTable entries={items} />
        )}
      </div>

      {items.length > 0 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          basePath="/history"
          label="events"
        />
      )}
    </div>
  );
}
