import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: string;
  user: AuthenticatedUser;
}
