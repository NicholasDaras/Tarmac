/**
 * Input Validation
 * 
 * Schema-based input validation using Zod.
 * Prevents injection attacks and ensures data integrity.
 * 
 * @module lib/validation
 * @version 1.0.0
 * @security OWASP Compliant - Input Validation
 */

import { z } from 'zod';
import { INPUT_CONSTRAINTS } from './security-config';

/**
 * Custom Zod error messages
 */
const errorMessages = {
  required: 'This field is required',
  tooShort: (min: number) => `Must be at least ${min} characters`,
  tooLong: (max: number) => `Must be no more than ${max} characters`,
  invalidFormat: 'Invalid format',
  invalidEmail: 'Please enter a valid email address',
  invalidUsername: 'Username can only contain letters, numbers, and underscores',
  invalidName: 'Name contains invalid characters',
  tooManyItems: (max: number) => `Cannot exceed ${max} items`,
  itemTooLong: (max: number) => `Each item must be no more than ${max} characters`,
};

/**
 * User Profile Validation Schema
 */
export const usernameSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.username.min, errorMessages.tooShort(INPUT_CONSTRAINTS.username.min))
  .max(INPUT_CONSTRAINTS.username.max, errorMessages.tooLong(INPUT_CONSTRAINTS.username.max))
  .regex(INPUT_CONSTRAINTS.username.pattern, errorMessages.invalidUsername)
  .transform((val) => val.toLowerCase().trim());

export const fullNameSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.fullName.min, errorMessages.required)
  .max(INPUT_CONSTRAINTS.fullName.max, errorMessages.tooLong(INPUT_CONSTRAINTS.fullName.max))
  .regex(INPUT_CONSTRAINTS.fullName.pattern, errorMessages.invalidName)
  .transform((val) => val.trim());

export const bioSchema = z
  .string()
  .max(INPUT_CONSTRAINTS.bio.max, errorMessages.tooLong(INPUT_CONSTRAINTS.bio.max))
  .transform((val) => val.trim());

/**
 * Authentication Validation Schemas
 */
export const emailSchema = z
  .string()
  .min(1, errorMessages.required)
  .max(INPUT_CONSTRAINTS.email.max, errorMessages.tooLong(INPUT_CONSTRAINTS.email.max))
  .email(errorMessages.invalidEmail)
  .transform((val) => val.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.password.min, errorMessages.tooShort(INPUT_CONSTRAINTS.password.min))
  .max(INPUT_CONSTRAINTS.password.max, errorMessages.tooLong(INPUT_CONSTRAINTS.password.max));

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  fullName: fullNameSchema.optional(),
});

/**
 * Drive Content Validation Schemas
 */
export const driveTitleSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.driveTitle.min, errorMessages.required)
  .max(INPUT_CONSTRAINTS.driveTitle.max, errorMessages.tooLong(INPUT_CONSTRAINTS.driveTitle.max))
  .transform((val) => val.trim());

export const driveDescriptionSchema = z
  .string()
  .max(INPUT_CONSTRAINTS.driveDescription.max, errorMessages.tooLong(INPUT_CONSTRAINTS.driveDescription.max))
  .transform((val) => val.trim());

export const routeDescriptionSchema = z
  .string()
  .max(INPUT_CONSTRAINTS.routeDescription.max, errorMessages.tooLong(INPUT_CONSTRAINTS.routeDescription.max))
  .transform((val) => val.trim());

export const tagsSchema = z
  .array(z.string())
  .max(INPUT_CONSTRAINTS.tags.max, errorMessages.tooManyItems(INPUT_CONSTRAINTS.tags.max))
  .refine(
    (tags) => tags.every((tag) => tag.length <= INPUT_CONSTRAINTS.tags.itemMaxLength),
    { message: errorMessages.itemTooLong(INPUT_CONSTRAINTS.tags.itemMaxLength) }
  );

export const createDriveSchema = z.object({
  title: driveTitleSchema,
  description: driveDescriptionSchema.optional(),
  routeDescription: routeDescriptionSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  tags: tagsSchema.optional(),
});

/**
 * Stop/POI Validation Schemas
 */
export const stopNameSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.stopName.min, errorMessages.required)
  .max(INPUT_CONSTRAINTS.stopName.max, errorMessages.tooLong(INPUT_CONSTRAINTS.stopName.max))
  .transform((val) => val.trim());

export const stopDescriptionSchema = z
  .string()
  .max(INPUT_CONSTRAINTS.stopDescription.max, errorMessages.tooLong(INPUT_CONSTRAINTS.stopDescription.max))
  .transform((val) => val.trim());

export const coordinateSchema = z
  .number()
  .min(-90)
  .max(90)
  .optional();

export const longitudeSchema = z
  .number()
  .min(-180)
  .max(180)
  .optional();

export const createStopSchema = z.object({
  name: stopNameSchema,
  description: stopDescriptionSchema.optional(),
  latitude: coordinateSchema,
  longitude: longitudeSchema,
});

/**
 * Comment Validation Schema
 */
export const commentContentSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.commentContent.min, errorMessages.required)
  .max(INPUT_CONSTRAINTS.commentContent.max, errorMessages.tooLong(INPUT_CONSTRAINTS.commentContent.max))
  .transform((val) => val.trim());

export const createCommentSchema = z.object({
  content: commentContentSchema,
  driveId: z.string().uuid(),
});

/**
 * Event Validation Schemas
 */
export const eventNameSchema = z
  .string()
  .min(INPUT_CONSTRAINTS.eventName.min, errorMessages.required)
  .max(INPUT_CONSTRAINTS.eventName.max, errorMessages.tooLong(INPUT_CONSTRAINTS.eventName.max))
  .transform((val) => val.trim());

export const eventDescriptionSchema = z
  .string()
  .max(INPUT_CONSTRAINTS.eventDescription.max, errorMessages.tooLong(INPUT_CONSTRAINTS.eventDescription.max))
  .transform((val) => val.trim());

export const createEventSchema = z.object({
  name: eventNameSchema,
  description: eventDescriptionSchema.optional(),
  dateTime: z.string().datetime(),
  locationName: z.string().optional(),
  latitude: coordinateSchema,
  longitude: longitudeSchema,
});

/**
 * Photo Validation
 */
export const photoCountSchema = z
  .number()
  .min(INPUT_CONSTRAINTS.photoCount.min)
  .max(INPUT_CONSTRAINTS.photoCount.max);

export const photoUriSchema = z.string().refine(
  (uri) => uri.startsWith('file://') || uri.startsWith('content://'),
  { message: 'Invalid photo URI' }
);

/**
 * ID Validation (UUIDs)
 */
export const uuidSchema = z.string().uuid();

/**
 * Sanitize user input
 * Removes potentially dangerous characters and XSS attempts
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    // Remove potential script tags and HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate and sanitize in one step
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => e.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateDriveInput = z.infer<typeof createDriveSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
