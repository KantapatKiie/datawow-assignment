export type Role = 'ADMIN' | 'USER';
export type ReservationStatus = 'RESERVED' | 'CANCELLED';
export type ReservationAction = 'RESERVE' | 'CANCEL';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Concert {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  reservedSeats: number;
  availableSeats: number;
  isSoldOut: boolean;
  createdAt: string;
  myReservation: { id: string; status: ReservationStatus; reservedAt: string } | null;
}

export interface ConcertStats {
  totalSeats: number;
  totalReserved: number;
  totalCancelled: number;
}

export interface HistoryEntry {
  id: string;
  action: ReservationAction;
  createdAt: string;
  user: { id: string; name: string; email: string };
  concert: { id: string; name: string };
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
