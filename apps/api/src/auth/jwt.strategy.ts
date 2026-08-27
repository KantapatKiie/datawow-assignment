import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * The role travels in the token, but it is re-read from the database on every request so a
   * role change (or a deleted account) takes effect immediately instead of at token expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
