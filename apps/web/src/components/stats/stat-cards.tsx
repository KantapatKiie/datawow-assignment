import type { ConcertStats } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

const CARDS = [
  { key: 'totalSeats', label: 'Total of seats', className: 'stat-card--seats' },
  { key: 'totalReserved', label: 'Reserve', className: 'stat-card--reserved' },
  { key: 'totalCancelled', label: 'Cancel', className: 'stat-card--cancelled' },
] as const;

export function StatCards({ stats }: { stats: ConcertStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <div key={card.key} className={`stat-card ${card.className}`}>
          <span className="stat-card__label">{card.label}</span>
          <span className="stat-card__value">{formatNumber(stats[card.key])}</span>
        </div>
      ))}
    </div>
  );
}
