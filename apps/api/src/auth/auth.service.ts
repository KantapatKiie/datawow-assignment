import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthResult, AuthenticatedUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('This email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // Role is deliberately not taken from the request body - self sign-up is always a USER.
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: Role.USER,
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);

    // Hash a dummy value when the user is missing so both branches cost the same, which keeps
    // the endpoint from leaking which emails exist via response timing.
    const passwordHash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi';
    const matches = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResult(user);
  }

  async profile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return this.toPublicUser(user);
  }

  private buildAuthResult(user: User): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwt.sign(payload),
      expiresIn: this.config.get<string>('jwt.expiresIn') ?? '1d',
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: User): AuthenticatedUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
