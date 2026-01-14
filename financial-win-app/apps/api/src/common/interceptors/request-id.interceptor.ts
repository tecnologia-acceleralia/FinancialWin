import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Generate request ID if not present
    if (!request.headers['x-request-id']) {
      request.headers['x-request-id'] = uuidv4();
    }

    // Add request ID to response headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('x-request-id', request.headers['x-request-id']);

    return next.handle();
  }
}
