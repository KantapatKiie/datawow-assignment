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
import { AuthenticatedUser } from '../auth/auth.types';
import { ConcertsService } from './concerts.service';
import { CreateConcertDto } from './dto/create-concert.dto';

@ApiTags('concerts')
@ApiBearerAuth()
@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concerts: ConcertsService) {}

  @Get()
  @ApiOperation({ summary: 'List concerts, including sold-out ones' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    const viewerId = user.role === Role.USER ? user.id : undefined;
    return this.concerts.findAll(query.page, query.limit, viewerId);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard totals (seats / reserved / cancelled)' })
  stats() {
    return this.concerts.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a single concert' })
  findOne(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.concerts.findOne(id, user.role === Role.USER ? user.id : undefined);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a concert (admin only)' })
  create(@Body() dto: CreateConcertDto, @CurrentUser('id') adminId: string) {
    return this.concerts.create(dto, adminId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a concert and release its seats (admin only)' })
  remove(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
  ) {
    return this.concerts.remove(id);
  }
}
