import { Concert, Reservation, ReservationStatus } from '@prisma/client';

export interface ConcertResponse {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  reservedSeats: number;
  availableSeats: number;
  isSoldOut: boolean;
  createdAt: Date;
  /** Present only when the request is made by a USER - drives the Reserve/Cancel button. */
  myReservation: { id: string; status: ReservationStatus; reservedAt: Date } | null;
}

export const toConcertResponse = (
  concert: Concert,
  myReservation?: Reservation | null,
): ConcertResponse => {
  const availableSeats = Math.max(0, concert.totalSeats - concert.reservedSeats);

  return {
    id: concert.id,
    name: concert.name,
    description: concert.description,
    totalSeats: concert.totalSeats,
    reservedSeats: concert.reservedSeats,
    availableSeats,
    isSoldOut: availableSeats === 0,
    createdAt: concert.createdAt,
    myReservation: myReservation
      ? { id: myReservation.id, status: myReservation.status, reservedAt: myReservation.reservedAt }
      : null,
  };
};
