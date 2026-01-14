/**
 * Zod Validation Pipe for NestJS
 * 
 * This pipe allows using Zod schemas for validation in NestJS controllers.
 * It integrates Zod validation with NestJS's validation system.
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod Validation Pipe
 * 
 * Usage:
 * ```typescript
 * @Post()
 * @UsePipes(new ZodValidationPipe(createUserSchema))
 * create(@Body() data: CreateUserDto) {
 *   return this.service.create(data);
 * }
 * ```
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}

/**
 * Create a Zod validation pipe from a schema
 * 
 * Convenience function to create a ZodValidationPipe instance
 * 
 * @param schema - Zod schema to validate against
 * @returns ZodValidationPipe instance
 */
export function createZodValidationPipe<T extends ZodSchema>(schema: T) {
  return new ZodValidationPipe(schema);
}

