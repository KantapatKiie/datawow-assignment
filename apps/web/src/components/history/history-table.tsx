import { Badge } from '@/components/ui/badge';
import type { HistoryEntry } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface HistoryTableProps {
  entries: HistoryEntry[];
  /** The admin audit trail shows who did it; a personal history does not need the column. */
  showUser?: boolean;
}

export function HistoryTable({ entries, showUser = false }: HistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <caption className="sr-only">
          {showUser ? 'Reservation history for all users' : 'Your reservation history'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date &amp; time</th>
            {showUser && <th scope="col">User</th>}
            <th scope="col">Concert</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td data-label="Date &amp; time" className="whitespace-nowrap text-muted">
                {formatDateTime(entry.createdAt)}
              </td>
              {showUser && (
                <td data-label="User">
                  <span className="block font-medium">{entry.user.name}</span>
                  <span className="block text-xs text-muted">{entry.user.email}</span>
                </td>
              )}
              <td data-label="Concert" className="font-medium">
                {entry.concert.name}
              </td>
              <td data-label="Action">
                <Badge tone={entry.action === 'RESERVE' ? 'success' : 'danger'}>
                  {entry.action === 'RESERVE' ? 'Reserve' : 'Cancel'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
