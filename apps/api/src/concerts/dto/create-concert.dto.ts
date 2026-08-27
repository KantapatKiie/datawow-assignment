import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateConcertDto {
  @ApiProperty({ example: 'The Nights Concert' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name is required' })
  @MinLength(3, { message: 'name must be at least 3 characters' })
  @MaxLength(120, { message: 'name must not exceed 120 characters' })
  name: string;

  @ApiProperty({ example: 'A night of live music at the national stadium.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'description is required' })
  @MinLength(10, { message: 'description must be at least 10 characters' })
  @MaxLength(1000, { message: 'description must not exceed 1000 characters' })
  description: string;

  @ApiProperty({ example: 500, minimum: 1, maximum: 1_000_000 })
  @Type(() => Number)
  @IsInt({ message: 'totalSeats must be a whole number' })
  @Min(1, { message: 'totalSeats must be at least 1' })
  @Max(1_000_000, { message: 'totalSeats must not exceed 1,000,000' })
  totalSeats: number;
}
