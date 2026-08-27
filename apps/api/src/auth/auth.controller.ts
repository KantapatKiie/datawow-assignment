import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthResult, AuthenticatedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a USER account and return a token' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange credentials for a JWT' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the profile behind the current token' })
  me(@CurrentUser('id') userId: string): Promise<AuthenticatedUser> {
    return this.auth.profile(userId);
  }
}
