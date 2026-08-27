import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'somchai@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'Somchai P.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'name must be at least 2 characters' })
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'Str0ng@Pass', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(72, { message: 'password must not exceed 72 characters' })
  @Matches(/[a-zA-Z]/, { message: 'password must contain at least one letter' })
  @Matches(/\d/, { message: 'password must contain at least one number' })
  password: string;
}
