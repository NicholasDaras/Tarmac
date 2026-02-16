/**
 * Rate Limiter
 * 
 * Client-side rate limiting to prevent abuse and protect backend resources.
 * Implements token bucket algorithm with persistent storage.
 * 
 * @module lib/rate-limiter
 * @version 1.0.0
 * @security OWASP Compliant - Rate Limiting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RATE_LIMITS, SECURITY_ERRORS } from './security-config';

/**
 * Rate limit entry stored in AsyncStorage
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAttempt: number;
}

/**
 * Rate Limiter Class
 * 
 * Manages rate limiting for various operations.
 * Uses AsyncStorage for persistence across app restarts.
 */
class RateLimiter {
  private static instance: RateLimiter;
  private prefix = 'rate_limit:';

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if operation is allowed
   * 
   * @param key - Unique identifier for the operation (e.g., 'auth:login:user123')
   * @param maxAttempts - Maximum allowed attempts
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and remaining attempts
   */
  async checkLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const storageKey = this.prefix + key;
    const now = Date.now();

    try {
      // Get existing rate limit data
      const stored = await AsyncStorage.getItem(storageKey);
      let entry: RateLimitEntry | null = stored ? JSON.parse(stored) : null;

      // If no entry or window expired, create new entry
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + windowMs,
          lastAttempt: now,
        };
      }

      // Check if limit exceeded
      const allowed = entry.count < maxAttempts;
      const remaining = Math.max(0, maxAttempts - entry.count);

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open in case of storage error
      return { allowed: true, remaining: maxAttempts, resetTime: now + windowMs };
    }
  }

  /**
   * Record an attempt
   * 
   * @param key - Unique identifier for the operation
   * @param windowMs - Time window in milliseconds
   */
  async recordAttempt(key: string, windowMs: number): Promise<void> {
    const storageKey = this.prefix + key;
    const now = Date.now();

    try {
      const stored = await AsyncStorage.getItem(storageKey);
      let entry: RateLimitEntry | null = stored ? JSON.parse(stored) : null;

      if (!entry || now > entry.resetTime) {
        entry = {
          count: 1,
          resetTime: now + windowMs,
          lastAttempt: now,
        };
      } else {
        entry.count += 1;
        entry.lastAttempt = now;
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to record attempt:', error);
    }
  }

  /**
   * Convenience method for auth operations
   */
  async checkAuthLimit(
    operation: 'login' | 'signup' | 'passwordReset',
    userId?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; message?: string }> {
    const key = userId ? `auth:${operation}:${userId}` : `auth:${operation}:global`;
    const config = RATE_LIMITS.auth[operation];
    
    const result = await this.checkLimit(key, config.maxAttempts, config.windowMs);
    
    if (!result.allowed) {
      return {
        ...result,
        message: SECURITY_ERRORS.rateLimit,
      };
    }
    
    return result;
  }

  /**
   * Convenience method for API operations
   */
  async checkApiLimit(
    operation: 'createDrive' | 'uploadPhoto' | 'likeDrive' | 'comment' | 'follow',
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; message?: string }> {
    const key = `api:${operation}:${userId}`;
    const config = RATE_LIMITS.api[operation];
    
    const result = await this.checkLimit(key, config.maxAttempts, config.windowMs);
    
    if (!result.allowed) {
      return {
        ...result,
        message: SECURITY_ERRORS.rateLimit,
      };
    }
    
    // Record the attempt
    await this.recordAttempt(key, config.windowMs);
    
    return result;
  }

  /**
   * Reset rate limit for a specific key
   * Useful for testing or admin operations
   */
  async resetLimit(key: string): Promise<void> {
    const storageKey = this.prefix + key;
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to reset limit:', error);
    }
  }

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(resetTime: number): string {
    const now = Date.now();
    const diff = resetTime - now;
    
    if (diff <= 0) return 'now';
    
    const minutes = Math.ceil(diff / (60 * 1000));
    const hours = Math.ceil(diff / (60 * 60 * 1000));
    
    if (hours > 1) return `${hours} hours`;
    if (minutes > 1) return `${minutes} minutes`;
    return '1 minute';
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();

// Export class for testing
export { RateLimiter };
