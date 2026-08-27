import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Concert, ReservationAction, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConcertsService } from './concerts.service';

const buildConcert = (overrides: Partial<Concert> = {}): Concert => ({
  id: 'concert-1',
  name: 'The Nights Concert',
  description: 'A night of live music',
  totalSeats: 100,
  reservedSeats: 40,
  createdById: 'admin-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});

describe('ConcertsService', () => {
  let service: ConcertsService;
  let prisma: {
    concert: Record<string, jest.Mock>;
    reservation: Record<string, jest.Mock>;
    reservationEvent: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      concert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      reservation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      reservationEvent: { createMany: jest.fn(), count: jest.fn() },
      // Supports both forms: an array of promises and an interactive callback.
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ConcertsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ConcertsService);
  });

  describe('create', () => {
    it('stores the concert against the admin who created it', async () => {
      prisma.concert.create.mockResolvedValue(buildConcert({ reservedSeats: 0 }));

      const result = await service.create(
        { name: 'The Nights Concert', description: 'A night of live music', totalSeats: 100 },
        'admin-1',
      );

      expect(prisma.concert.create).toHaveBeenCalledWith({
        data: {
          name: 'The Nights Concert',
          description: 'A night of live music',
          totalSeats: 100,
          createdById: 'admin-1',
        },
      });
      expect(result.availableSeats).toBe(100);
      expect(result.isSoldOut).toBe(false);
    });
  });

  describe('findAll', () => {
    it('returns sold-out concerts too, flagged as sold out', async () => {
      prisma.concert.findMany.mockResolvedValue([
        buildConcert({ id: 'full', totalSeats: 10, reservedSeats: 10 }),
      ]);
      prisma.concert.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isSoldOut).toBe(true);
      expect(result.items[0].availableSeats).toBe(0);
    });

    it('never reports negative availability if the counter drifts', async () => {
      prisma.concert.findMany.mockResolvedValue([
        buildConcert({ totalSeats: 5, reservedSeats: 7 }),
      ]);
      prisma.concert.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.items[0].availableSeats).toBe(0);
    });

    it('attaches the viewer own active reservation', async () => {
      prisma.concert.findMany.mockResolvedValue([buildConcert()]);
      prisma.concert.count.mockResolvedValue(1);
      prisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          concertId: 'concert-1',
          status: ReservationStatus.RESERVED,
          reservedAt: new Date('2026-02-01T00:00:00Z'),
        },
      ]);

      const result = await service.findAll(1, 20, 'user-1');

      expect(prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', concertId: { in: ['concert-1'] }, status: ReservationStatus.RESERVED },
      });
      expect(result.items[0].myReservation).toEqual({
        id: 'res-1',
        status: ReservationStatus.RESERVED,
        reservedAt: new Date('2026-02-01T00:00:00Z'),
      });
    });

    it('skips the reservation lookup when there is no viewer', async () => {
      prisma.concert.findMany.mockResolvedValue([buildConcert()]);
      prisma.concert.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(prisma.reservation.findMany).not.toHaveBeenCalled();
      expect(result.items[0].myReservation).toBeNull();
    });

    it('reports pagination metadata', async () => {
      prisma.concert.findMany.mockResolvedValue([buildConcert()]);
      prisma.concert.count.mockResolvedValue(45);

      const result = await service.findAll(2, 20);

      expect(result.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
    });
  });

  describe('findOne', () => {
    it('throws when the concert is missing or soft-deleted', async () => {
      prisma.concert.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.concert.findFirst).toHaveBeenCalledWith({
        where: { id: 'missing', deletedAt: null },
      });
    });
  });

  describe('remove', () => {
    it('soft deletes, releases held seats and logs a cancellation per holder', async () => {
      prisma.concert.findFirst.mockResolvedValue(buildConcert());
      prisma.reservation.findMany.mockResolvedValue([
        { id: 'res-1', userId: 'user-1' },
        { id: 'res-2', userId: 'user-2' },
      ]);

      const result = await service.remove('concert-1');

      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['res-1', 'res-2'] } },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: expect.any(Date) },
      });
      expect(prisma.reservationEvent.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', concertId: 'concert-1', action: ReservationAction.CANCEL },
          { userId: 'user-2', concertId: 'concert-1', action: ReservationAction.CANCEL },
        ],
      });
      expect(prisma.concert.update).toHaveBeenCalledWith({
        where: { id: 'concert-1' },
        data: { deletedAt: expect.any(Date), reservedSeats: 0 },
      });
      expect(result).toEqual({ id: 'concert-1', releasedReservations: 2 });
    });

    it('does not touch reservations when nobody holds a seat', async () => {
      prisma.concert.findFirst.mockResolvedValue(buildConcert({ reservedSeats: 0 }));
      prisma.reservation.findMany.mockResolvedValue([]);

      const result = await service.remove('concert-1');

      expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
      expect(prisma.reservationEvent.createMany).not.toHaveBeenCalled();
      expect(result.releasedReservations).toBe(0);
    });

    it('refuses to delete a concert that does not exist', async () => {
      prisma.concert.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('stats', () => {
    it('sums seats of live concerts and counts reservations and cancellations', async () => {
      prisma.concert.aggregate.mockResolvedValue({ _sum: { totalSeats: 620 } });
      prisma.reservation.count.mockResolvedValue(12);
      prisma.reservationEvent.count.mockResolvedValue(4);

      await expect(service.stats()).resolves.toEqual({
        totalSeats: 620,
        totalReserved: 12,
        totalCancelled: 4,
      });
    });

    it('falls back to zero when there are no concerts yet', async () => {
      prisma.concert.aggregate.mockResolvedValue({ _sum: { totalSeats: null } });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.reservationEvent.count.mockResolvedValue(0);

      await expect(service.stats()).resolves.toEqual({
        totalSeats: 0,
        totalReserved: 0,
        totalCancelled: 0,
      });
    });
  });
});
