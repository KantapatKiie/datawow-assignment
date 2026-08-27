import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReservationAction, ReservationStatus } from '@prisma/client';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryEntry, ReservationSummary } from './reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Claiming a seat is one transaction with two guards:
   *
   *   1. `UPDATE ... WHERE reserved_seats < total_seats` - the check and the increment happen in
   *      a single statement, so Postgres row locking serialises everyone competing for the last
   *      seats. Zero rows affected means the concert filled up, and the transaction rolls back.
   *   2. the partial unique index on (user_id, concert_id) WHERE status = 'RESERVED' - two
   *      simultaneous requests from the same user cannot both insert; the loser gets P2002.
   *
   * Neither guard relies on a read-then-write, which is what makes the endpoint safe when a
   * thousand users hit the last ten seats at the same moment.
   */
  async reserve(userId: string, concertId: string): Promise<ReservationSummary> {
    const concert = await this.prisma.concert.findFirst({
      where: { id: concertId, deletedAt: null },
      select: { id: true },
    });
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    const existing = await this.prisma.reservation.findFirst({
      where: { userId, concertId, status: ReservationStatus.RESERVED },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You already have a seat for this concert');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const seatsClaimed = await tx.$executeRaw`
            UPDATE "concerts"
            SET "reserved_seats" = "reserved_seats" + 1, "updated_at" = NOW()
            WHERE "id" = ${concertId}
              AND "deleted_at" IS NULL
              AND "reserved_seats" < "total_seats"
          `;

          if (seatsClaimed === 0) {
            throw new ConflictException('This concert is fully booked');
          }

          const reservation = await tx.reservation.create({
            data: { userId, concertId, status: ReservationStatus.RESERVED },
          });

          await tx.reservationEvent.create({
            data: { userId, concertId, action: ReservationAction.RESERVE },
          });

          return this.toSummary(reservation);
        },
        { timeout: 10_000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You already have a seat for this concert');
      }
      throw error;
    }
  }

  async cancel(userId: string, reservationId: string): Promise<ReservationSummary> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });

    if (!reservation || reservation.userId !== userId) {
      // Do not disclose that someone else's reservation exists.
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('This reservation was already cancelled');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const cancelled = await tx.reservation.updateMany({
          where: { id: reservationId, status: ReservationStatus.RESERVED },
          data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
        });

        if (cancelled.count === 0) {
          throw new BadRequestException('This reservation was already cancelled');
        }

        await tx.$executeRaw`
          UPDATE "concerts"
          SET "reserved_seats" = "reserved_seats" - 1, "updated_at" = NOW()
          WHERE "id" = ${reservation.concertId}
            AND "reserved_seats" > 0
        `;

        await tx.reservationEvent.create({
          data: {
            userId,
            concertId: reservation.concertId,
            action: ReservationAction.CANCEL,
          },
        });

        const updated = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
        return this.toSummary(updated);
      },
      { timeout: 10_000 },
    );
  }

  /** Audit trail - every reserve/cancel event across all users. Admin only. */
  history(page: number, limit: number): Promise<Paginated<HistoryEntry>> {
    return this.listEvents(page, limit);
  }

  /** The signed-in user's own history. */
  myHistory(userId: string, page: number, limit: number): Promise<Paginated<HistoryEntry>> {
    return this.listEvents(page, limit, userId);
  }

  private async listEvents(
    page: number,
    limit: number,
    userId?: string,
  ): Promise<Paginated<HistoryEntry>> {
    const where = userId ? { userId } : {};

    const [events, total] = await this.prisma.$transaction([
      this.prisma.reservationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          concert: { select: { id: true, name: true } },
        },
      }),
      this.prisma.reservationEvent.count({ where }),
    ]);

    const items: HistoryEntry[] = events.map((event) => ({
      id: event.id,
      action: event.action,
      createdAt: event.createdAt,
      user: event.user,
      concert: event.concert,
    }));

    return paginate(items, total, page, limit);
  }

  private toSummary(reservation: {
    id: string;
    concertId: string;
    status: ReservationStatus;
    reservedAt: Date;
    cancelledAt: Date | null;
  }): ReservationSummary {
    return {
      id: reservation.id,
      concertId: reservation.concertId,
      status: reservation.status,
      reservedAt: reservation.reservedAt,
      cancelledAt: reservation.cancelledAt,
    };
  }
}
