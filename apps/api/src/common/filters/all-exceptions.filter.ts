import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Single place that turns anything thrown inside the app into the response shape the
 * frontend expects: { statusCode, error, message, path, timestamp }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, error, message } = this.normalise(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private normalise(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, error: exception.name, message: payload };
      }

      const record = payload as { message?: string | string[]; error?: string };
      return {
        status,
        error: record.error ?? exception.name,
        message: record.message ?? exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid data supplied to the database layer',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong. Please try again.',
    };
  }

  private fromPrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    error: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with these values already exists',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Referenced record does not exist',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Record not found',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Unexpected database error',
        };
    }
  }
}
