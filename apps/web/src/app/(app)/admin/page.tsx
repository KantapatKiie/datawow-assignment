import type { Metadata } from 'next';
import { AdminTabs } from '@/components/admin/admin-tabs';
import { ConcertAdminList } from '@/components/admin/concert-admin-list';
import { CreateConcertForm } from '@/components/admin/create-concert-form';
import { StatCards } from '@/components/stats/stat-cards';
import { Pagination } from '@/components/ui/pagination';
import { serverFetch } from '@/lib/server-api';
import type { Concert, ConcertStats, Paginated } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);

  const [stats, concerts] = await Promise.all([
    serverFetch<ConcertStats>('/concerts/stats'),
    serverFetch<Paginated<Concert>>(`/concerts?page=${page}&limit=${PAGE_SIZE}`),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Totals across every published concert, plus the listings you manage.
        </p>
      </header>

      <StatCards stats={stats} />

      <div className="mt-8">
        <AdminTabs
          overview={
            <>
              <ConcertAdminList concerts={concerts.items} />
              {concerts.items.length > 0 && (
                <Pagination
                  page={concerts.meta.page}
                  totalPages={concerts.meta.totalPages}
                  total={concerts.meta.total}
                  basePath="/admin"
                  label="concerts"
                />
              )}
            </>
          }
          create={<CreateConcertForm />}
        />
      </div>
    </div>
  );
}
