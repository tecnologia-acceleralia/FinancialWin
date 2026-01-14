/**
 * Example DTOs - Zod Schemas
 * 
 * Example schemas demonstrating how to use Zod as single source of truth
 */

import { z } from 'zod';

/**
 * Create Example Schema
 */
export const createExampleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update Example Schema
 * All fields optional for partial updates
 */
export const updateExampleSchema = createExampleSchema.partial();

/**
 * Example Query Parameters Schema
 */
export const exampleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().optional(),
});

// Export types inferred from schemas
export type CreateExample = z.infer<typeof createExampleSchema>;
export type UpdateExample = z.infer<typeof updateExampleSchema>;
export type ExampleQuery = z.infer<typeof exampleQuerySchema>;

