import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@datawow.io',
  name: 'Demo User',
  passwordHash: 'hashed',
  role: Role.USER,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findById: jest.Mock; create: jest.Mock };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    users = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('1d') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and forces the USER role', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((data) => Promise.resolve(buildUser(data)));

      const result = await service.register({
        email: 'new@datawow.io',
        name: 'New Person',
        password: 'Str0ngPass',
      });

      const created = users.create.mock.calls[0][0];
      expect(created.role).toBe(Role.USER);
      expect(created.passwordHash).not.toBe('Str0ngPass');
      await expect(bcrypt.compare('Str0ngPass', created.passwordHash)).resolves.toBe(true);
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects an email that is already taken', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({ email: 'user@datawow.io', name: 'Copy Cat', password: 'Str0ngPass' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token carrying the user id, email and role', async () => {
      const passwordHash = await bcrypt.hash('Admin@1234', 10);
      users.findByEmail.mockResolvedValue(
        buildUser({ id: 'admin-1', email: 'admin@datawow.io', role: Role.ADMIN, passwordHash }),
      );

      const result = await service.login({ email: 'admin@datawow.io', password: 'Admin@1234' });

      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'admin-1',
        email: 'admin@datawow.io',
        role: Role.ADMIN,
      });
      expect(result.user.role).toBe(Role.ADMIN);
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: await bcrypt.hash('right-password', 10) }),
      );

      await expect(
        service.login({ email: 'user@datawow.io', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('gives the same error for an unknown email so accounts cannot be enumerated', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@datawow.io', password: 'whatever1' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('profile', () => {
    it('rejects a token whose account has since been removed', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.profile('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
