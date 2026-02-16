/**
 * Security Configuration
 * 
 * Centralized security settings for the Tarmac app.
 * Includes rate limits, input constraints, and security policies.
 * 
 * @module lib/security-config
 * @version 1.0.0
 * @security OWASP Compliant
 */

/**
 * Rate Limiting Configuration
 * 
 * Defines rate limits for various operations to prevent abuse.
 * All limits are per-user unless specified as global (IP-based).
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  auth: {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  },
  
  // API operations
  api: {
    createDrive: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 drives per minute
    uploadPhoto: { maxAttempts: 20, windowMs: 60 * 1000 }, // 20 photos per minute
    likeDrive: { maxAttempts: 30, windowMs: 60 * 1000 },
    comment: { maxAttempts: 20, windowMs: 60 * 1000 },
    follow: { maxAttempts: 15, windowMs: 60 * 1000 },
  },
  
  // Global IP-based limits (fallback)
  global: {
    default: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  },
} as const;

/**
 * Input Validation Constraints
 * 
 * Maximum lengths and patterns for all user inputs.
 * Prevents buffer overflow and injection attacks.
 */
export const INPUT_CONSTRAINTS = {
  // User profile
  username: { min: 3, max: 30, pattern: /^[a-zA-Z0-9_]+$/ },
  fullName: { min: 1, max: 100, pattern: /^[\p{L}\s'-]+$/u },
  bio: { min: 0, max: 500 },
  
  // Drive content
  driveTitle: { min: 1, max: 100 },
  driveDescription: { min: 0, max: 2000 },
  routeDescription: { min: 0, max: 1000 },
  tags: { max: 10, itemMaxLength: 20 },
  
  // Stops/POI
  stopName: { min: 1, max: 100 },
  stopDescription: { min: 0, max: 500 },
  
  // Comments
  commentContent: { min: 1, max: 1000 },
  
  // Events
  eventName: { min: 1, max: 100 },
  eventDescription: { min: 0, max: 2000 },
  
  // Photos
  photoCount: { min: 1, max: 10 },
  photoSize: { max: 10 * 1024 * 1024 }, // 10MB per photo
  
  // Auth
  email: { max: 254 }, // RFC 5321
  password: { min: 8, max: 128 },
} as const;

/**
 * Security Headers and Configurations
 */
export const SECURITY_CONFIG = {
  // Content Security Policy (for web views if used)
  csp: "default-src 'self'; img-src 'self' https: data:; script-src 'self';",
  
  // Session settings
  session: {
    timeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    refreshThreshold: 24 * 60 * 60 * 1000, // Refresh if < 1 day remaining
  },
  
  // Password policy
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // Keep it user-friendly but secure
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days (optional enforcement)
  },
} as const;

/**
 * Error Messages (User-friendly, don't leak info)
 */
export const SECURITY_ERRORS = {
  rateLimit: 'Too many requests. Please try again later.',
  invalidInput: 'Invalid input. Please check your data and try again.',
  unauthorized: 'Unauthorized. Please sign in again.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'Resource not found.',
  serverError: 'An error occurred. Please try again later.',
} as const;
