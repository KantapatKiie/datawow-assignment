import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @Roles(Role.USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve one seat for a concert' })
  reserve(@Body() dto: CreateReservationDto, @CurrentUser('id') userId: string) {
    return this.reservations.reserve(userId, dto.concertId);
  }

  @Delete(':id')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Cancel one of your own reservations' })
  cancel(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reservations.cancel(userId, id);
  }

  @Get('me')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Your own reservation history' })
  myHistory(@Query() query: PaginationQueryDto, @CurrentUser('id') userId: string) {
    return this.reservations.myHistory(userId, query.page, query.limit);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Audit trail across all users (admin only)' })
  history(@Query() query: PaginationQueryDto) {
    return this.reservations.history(query.page, query.limit);
  }
}
