import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DebugMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Only debug document update requests
    if (req.method === 'PUT' && req.url.includes('/document')) {
      console.log('🔍 DebugMiddleware - Document Update Request:');
      console.log('URL:', req.url);
      console.log('Method:', req.method);
      console.log('Headers:', req.headers);
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('Body Type:', typeof req.body);
      console.log(
        'Body Keys:',
        req.body && typeof req.body === 'object' && req.body !== null
          ? Object.keys(req.body as Record<string, unknown>)
          : 'undefined'
      );

      if (
        req.body &&
        typeof req.body === 'object' &&
        'content_json' in req.body
      ) {
        const contentJson = (req.body as { content_json?: unknown })
          .content_json;
        console.log('Content JSON:', JSON.stringify(contentJson, null, 2));
        console.log('Content JSON Type:', typeof contentJson);
        if (
          contentJson &&
          typeof contentJson === 'object' &&
          contentJson !== null
        ) {
          console.log(
            'Content JSON Keys:',
            Object.keys(contentJson as Record<string, unknown>)
          );
        }
      }
    }
    next();
  }
}
