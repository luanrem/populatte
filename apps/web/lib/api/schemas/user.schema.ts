/**
 * User API Response Validation Schema
 *
 * Zod schema for validating User responses from the API.
 * Dates are received as ISO strings over HTTP and validated as such.
 */

import { z } from 'zod';

/**
 * Schema for validating User entity responses from the API.
 *
 * Dates are ISO strings (not Date objects) because JSON serialization
 * converts Date objects to strings during HTTP transport.
 */
export const userResponseSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * TypeScript type inferred from the userResponseSchema.
 *
 * Use this type for API response data after validation.
 */
export type UserResponse = z.infer<typeof userResponseSchema>;
