/**
 * Environment Variable Utilities
 * 
 * Helpers for parsing and validating environment variables using Zod
 */

import { z } from 'zod';

/**
 * Parse environment variable with Zod schema
 * 
 * @param schema - Zod schema for validation
 * @param env - Environment object (defaults to process.env)
 * @returns Parsed and validated environment variables
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.infer<T> {
  return schema.parse(env);
}

/**
 * Safe parse environment variable with Zod schema
 * Returns success/error instead of throwing
 * 
 * @param schema - Zod schema for validation
 * @param env - Environment object (defaults to process.env)
 * @returns Parse result with success flag
 */
export function safeParseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(env);
}

