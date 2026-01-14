/**
 * Validation Utilities
 * 
 * Helpers for validation using Zod schemas
 */

import { z } from 'zod';

/**
 * Validate data against a Zod schema
 * 
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safe validate data against a Zod schema
 * Returns success/error instead of throwing
 * 
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Parse result with success flag
 */
export function safeValidate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}

// Export Zod validation pipe for NestJS
export * from './zod-validation.pipe';

