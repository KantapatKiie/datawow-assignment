import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, ReservationAction, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from './reservations.service';

const reservationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'res-1',
  userId: 'user-1',
  concertId: 'concert-1',
  status: ReservationStatus.RESERVED,
  reservedAt: new Date('2026-02-01T00:00:00Z'),
  cancelledAt: null,
  createdAt: new Date('2026-02-01T00:00:00Z'),
  updatedAt: new Date('2026-02-01T00:00:00Z'),
  ...overrides,
});

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: {
    concert: Record<string, jest.Mock>;
    reservation: Record<string, jest.Mock>;
    reservationEvent: Record<string, jest.Mock>;
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      concert: { findFirst: jest.fn() },
      reservation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      reservationEvent: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $executeRaw: jest.fn(),
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReservationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ReservationsService);
  });

  describe('reserve', () => {
    it('claims a seat, writes the reservation and appends an audit event', async () => {
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.reservation.create.mockResolvedValue(reservationRow());

      const result = await service.reserve('user-1', 'concert-1');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.reservation.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', concertId: 'concert-1', status: ReservationStatus.RESERVED },
      });
      expect(prisma.reservationEvent.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', concertId: 'concert-1', action: ReservationAction.RESERVE },
      });
      expect(result).toEqual({
        id: 'res-1',
        concertId: 'concert-1',
        status: ReservationStatus.RESERVED,
        reservedAt: new Date('2026-02-01T00:00:00Z'),
        cancelledAt: null,
      });
    });

    it('claims the seat before inserting the reservation so the row lock is taken first', async () => {
      const order: string[] = [];
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.$executeRaw.mockImplementation(() => {
        order.push('claim-seat');
        return Promise.resolve(1);
      });
      prisma.reservation.create.mockImplementation(() => {
        order.push('create-reservation');
        return Promise.resolve(reservationRow());
      });

      await service.reserve('user-1', 'concert-1');

      expect(order).toEqual(['claim-seat', 'create-reservation']);
    });

    it('rejects a concert that does not exist or was deleted', async () => {
      prisma.concert.findFirst.mockResolvedValue(null);

      await expect(service.reserve('user-1', 'gone')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a second seat for the same user and concert', async () => {
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue({ id: 'res-1' });

      await expect(service.reserve('user-1', 'concert-1')).rejects.toThrow(
        'You already have a seat for this concert',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects when the concert filled up while the request was in flight', async () => {
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue(null);
      // Zero rows updated means reserved_seats had already reached total_seats.
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(service.reserve('user-1', 'concert-1')).rejects.toThrow(
        'This concert is fully booked',
      );
      expect(prisma.reservation.create).not.toHaveBeenCalled();
      expect(prisma.reservationEvent.create).not.toHaveBeenCalled();
    });

    it('translates the unique-index race into a conflict instead of a 500', async () => {
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.reservation.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.reserve('user-1', 'concert-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets unexpected database errors bubble up untouched', async () => {
      prisma.concert.findFirst.mockResolvedValue({ id: 'concert-1' });
      prisma.reservation.findFirst.mockResolvedValue(null);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.reservation.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.reserve('user-1', 'concert-1')).rejects.toThrow('connection lost');
    });
  });

  describe('cancel', () => {
    it('cancels the reservation, gives the seat back and logs the event', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow());
      prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
      prisma.reservation.findUniqueOrThrow.mockResolvedValue(
        reservationRow({
          status: ReservationStatus.CANCELLED,
          cancelledAt: new Date('2026-02-02T00:00:00Z'),
        }),
      );

      const result = await service.cancel('user-1', 'res-1');

      expect(prisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'res-1', status: ReservationStatus.RESERVED },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: expect.any(Date) },
      });
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.reservationEvent.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', concertId: 'concert-1', action: ReservationAction.CANCEL },
      });
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('hides someone else reservation behind a not-found', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow({ userId: 'someone-else' }));

      await expect(service.cancel('user-1', 'res-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown reservation id', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      await expect(service.cancel('user-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects cancelling twice', async () => {
      prisma.reservation.findUnique.mockResolvedValue(
        reservationRow({ status: ReservationStatus.CANCELLED }),
      );

      await expect(service.cancel('user-1', 'res-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not double-decrement when two cancels race', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservationRow());
      // The other request won: no row was still in RESERVED state.
      prisma.reservation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('user-1', 'res-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.reservationEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('history', () => {
    const event = {
      id: 'event-1',
      action: ReservationAction.RESERVE,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      user: { id: 'user-1', name: 'Demo User', email: 'user@datawow.io' },
      concert: { id: 'concert-1', name: 'The Nights Concert' },
    };

    it('returns every user event for the admin audit trail', async () => {
      prisma.reservationEvent.findMany.mockResolvedValue([event]);
      prisma.reservationEvent.count.mockResolvedValue(1);

      const result = await service.history(1, 20);

      expect(prisma.reservationEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, orderBy: { createdAt: 'desc' } }),
      );
      expect(result.items[0]).toEqual(event);
    });

    it('scopes personal history to the signed-in user', async () => {
      prisma.reservationEvent.findMany.mockResolvedValue([event]);
      prisma.reservationEvent.count.mockResolvedValue(1);

      await service.myHistory('user-1', 2, 10);

      expect(prisma.reservationEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 10, take: 10 }),
      );
    });
  });
});
