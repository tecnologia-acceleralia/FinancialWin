import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const requestId = request.headers['x-request-id'];
    const userAgent = request.headers['user-agent'] || '';
    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - ${userAgent} [${requestId}]`
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${duration}ms [${requestId}]`
        );
      })
    );
  }
}
