import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@datawow.io' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  @MinLength(1, { message: 'password is required' })
  password: string;
}
