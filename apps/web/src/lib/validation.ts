import { z } from 'zod';

/**
 * Mirrors the class-validator rules on the API. The server stays the source of truth - this
 * only saves the user a round trip and gives inline field errors while typing.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export const concertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Concert name must be at least 3 characters')
    .max(120, 'Concert name must not exceed 120 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  totalSeats: z
    .number({ invalid_type_error: 'Total of seat is required' })
    .int('Total of seat must be a whole number')
    .min(1, 'Total of seat must be at least 1')
    .max(1_000_000, 'Total of seat must not exceed 1,000,000'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ConcertInput = z.infer<typeof concertSchema>;

/** Turns a ZodError into { field: message } for rendering next to each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const key = String(issue.path[0] ?? '_');
    if (!acc[key]) acc[key] = issue.message;
    return acc;
  }, {});
}
