import { z } from 'zod';
import { UserRole, UserStatus } from '@populatte/types';

/**
 * Zod schemas for user-related validations
 */

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.nativeEnum(UserRole),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const userIdSchema = z.string().uuid('Invalid user ID format');
