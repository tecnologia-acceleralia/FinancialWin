import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = request.headers['x-request-id'];

    const errorResponse = {
      error: {
        code: this.getErrorCode(exception),
        message: exception.message,
        statusCode: status,
      },
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error
    this.logger.error(
      `HTTP Exception: ${status} - ${exception.message} [${requestId}]`,
      exception.stack
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: HttpException): string {
    const status = exception.getStatus() as HttpStatus;

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'ERR_VALIDATION';
      case HttpStatus.UNAUTHORIZED:
        return 'ERR_UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'ERR_FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'ERR_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'ERR_CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'ERR_UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'ERR_RATE_LIMIT';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'ERR_INTERNAL_SERVER';
      default:
        return 'ERR_UNKNOWN';
    }
  }
}
