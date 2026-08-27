import { Injectable, NotFoundException } from '@nestjs/common';
import { Concert, ReservationAction, ReservationStatus } from '@prisma/client';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConcertResponse, toConcertResponse } from './concert.entity';
import { CreateConcertDto } from './dto/create-concert.dto';

export interface ConcertStats {
  totalSeats: number;
  totalReserved: number;
  totalCancelled: number;
}

@Injectable()
export class ConcertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateConcertDto, adminId: string): Promise<ConcertResponse> {
    const concert = await this.prisma.concert.create({
      data: {
        name: dto.name,
        description: dto.description,
        totalSeats: dto.totalSeats,
        createdById: adminId,
      },
    });

    return toConcertResponse(concert);
  }

  /**
   * Sold-out concerts are intentionally still returned - the brief asks users to see every
   * concert, including the ones with no tickets left.
   */
  async findAll(
    page: number,
    limit: number,
    viewerId?: string,
  ): Promise<Paginated<ConcertResponse>> {
    const where = { deletedAt: null };

    const [concerts, total] = await this.prisma.$transaction([
      this.prisma.concert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.concert.count({ where }),
    ]);

    const reservationByConcert = viewerId
      ? await this.activeReservationsOf(
          viewerId,
          concerts.map((concert) => concert.id),
        )
      : new Map();

    return paginate(
      concerts.map((concert) => toConcertResponse(concert, reservationByConcert.get(concert.id))),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string, viewerId?: string): Promise<ConcertResponse> {
    const concert = await this.getActiveOrFail(id);

    const reservation = viewerId
      ? await this.prisma.reservation.findFirst({
          where: { concertId: id, userId: viewerId, status: ReservationStatus.RESERVED },
        })
      : null;

    return toConcertResponse(concert, reservation);
  }

  /**
   * Soft delete. Any seat still held is released and logged as a cancellation so the audit
   * trail explains why those reservations ended and the dashboard counters stay correct.
   */
  async remove(id: string): Promise<{ id: string; releasedReservations: number }> {
    await this.getActiveOrFail(id);

    return this.prisma.$transaction(async (tx) => {
      const active = await tx.reservation.findMany({
        where: { concertId: id, status: ReservationStatus.RESERVED },
        select: { id: true, userId: true },
      });

      if (active.length > 0) {
        await tx.reservation.updateMany({
          where: { id: { in: active.map((reservation) => reservation.id) } },
          data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
        });

        await tx.reservationEvent.createMany({
          data: active.map((reservation) => ({
            userId: reservation.userId,
            concertId: id,
            action: ReservationAction.CANCEL,
          })),
        });
      }

      await tx.concert.update({
        where: { id },
        data: { deletedAt: new Date(), reservedSeats: 0 },
      });

      return { id, releasedReservations: active.length };
    });
  }

  async stats(): Promise<ConcertStats> {
    const [seats, reserved, cancelled] = await this.prisma.$transaction([
      this.prisma.concert.aggregate({
        where: { deletedAt: null },
        _sum: { totalSeats: true },
      }),
      this.prisma.reservation.count({
        where: { status: ReservationStatus.RESERVED, concert: { deletedAt: null } },
      }),
      this.prisma.reservationEvent.count({ where: { action: ReservationAction.CANCEL } }),
    ]);

    return {
      totalSeats: seats._sum.totalSeats ?? 0,
      totalReserved: reserved,
      totalCancelled: cancelled,
    };
  }

  async getActiveOrFail(id: string): Promise<Concert> {
    const concert = await this.prisma.concert.findFirst({ where: { id, deletedAt: null } });
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }
    return concert;
  }

  private async activeReservationsOf(userId: string, concertIds: string[]) {
    if (concertIds.length === 0) {
      return new Map();
    }

    const reservations = await this.prisma.reservation.findMany({
      where: { userId, concertId: { in: concertIds }, status: ReservationStatus.RESERVED },
    });

    return new Map(reservations.map((reservation) => [reservation.concertId, reservation]));
  }
}
