import type { Route } from 'next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn, formatNumber } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  label?: string;
}

export function Pagination({ page, totalPages, total, basePath, label = 'items' }: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <p className="px-1 py-3 text-sm text-muted">
        {formatNumber(total)} {label}
      </p>
    );
  }

  const href = (target: number) => `${basePath}?page=${target}` as Route;
  const linkClass = 'btn btn--ghost !min-h-9 !px-3 !py-1.5 text-sm';

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 px-1 py-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-muted">
        Page {page} of {totalPages} - {formatNumber(total)} {label}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass} rel="prev">
            <ChevronLeft size={16} />
            Previous
          </Link>
        ) : (
          <span className={cn(linkClass, 'pointer-events-none opacity-50')} aria-disabled="true">
            <ChevronLeft size={16} />
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={linkClass} rel="next">
            Next
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className={cn(linkClass, 'pointer-events-none opacity-50')} aria-disabled="true">
            Next
            <ChevronRight size={16} />
          </span>
        )}
      </div>
    </nav>
  );
}
