import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/auth.types';
import { RolesGuard } from './roles.guard';

const contextWith = (user?: AuthenticatedUser): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  }) as unknown as ExecutionContext;

const admin: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@datawow.io',
  name: 'Admin',
  role: Role.ADMIN,
};
const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@datawow.io',
  name: 'Demo User',
  role: Role.USER,
};

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  /** getAllAndOverride is called for IS_PUBLIC first, then ROLES. */
  const metadata = (isPublic: boolean, roles?: Role[]) => {
    reflector.getAllAndOverride.mockReturnValueOnce(isPublic).mockReturnValueOnce(roles);
  };

  it('lets a public route through without a user', () => {
    metadata(true);

    expect(guard.canActivate(contextWith())).toBe(true);
  });

  it('lets any authenticated user through when no role is required', () => {
    metadata(false, undefined);

    expect(guard.canActivate(contextWith(user))).toBe(true);
  });

  it('allows an admin on an ADMIN route', () => {
    metadata(false, [Role.ADMIN]);

    expect(guard.canActivate(contextWith(admin))).toBe(true);
  });

  it('blocks a USER from an ADMIN route', () => {
    metadata(false, [Role.ADMIN]);

    expect(() => guard.canActivate(contextWith(user))).toThrow(ForbiddenException);
  });

  it('blocks an ADMIN from a USER-only route', () => {
    metadata(false, [Role.USER]);

    expect(() => guard.canActivate(contextWith(admin))).toThrow(ForbiddenException);
  });

  it('blocks when the request carries no user at all', () => {
    metadata(false, [Role.ADMIN]);

    expect(() => guard.canActivate(contextWith())).toThrow('Authentication required');
  });
});
