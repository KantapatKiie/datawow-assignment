import { ReservationAction, ReservationStatus } from '@prisma/client';

export interface ReservationSummary {
  id: string;
  concertId: string;
  status: ReservationStatus;
  reservedAt: Date;
  cancelledAt: Date | null;
}

export interface HistoryEntry {
  id: string;
  action: ReservationAction;
  createdAt: Date;
  user: { id: string; name: string; email: string };
  concert: { id: string; name: string };
}
