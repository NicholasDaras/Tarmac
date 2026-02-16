/**
 * Auth Context with Security Hardening
 * 
 * Provides authentication state and methods with:
 * - Rate limiting on auth operations
 * - Input validation and sanitization
 * - Secure session management
 * - OWASP-compliant security practices
 * 
 * @module lib/auth-context
 * @version 2.0.0
 * @security OWASP Compliant
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { rateLimiter } from './rate-limiter';
import { 
  emailSchema, 
  passwordSchema, 
  usernameSchema, 
  fullNameSchema,
  loginSchema,
  signupSchema,
  validateAndSanitize,
  sanitizeInput 
} from './validation';
import { SECURITY_ERRORS } from './security-config';

/**
 * Auth Context Type Definition
 */
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; message?: string }>;
  signUp: (email: string, password: string, metadata: { username: string; fullName?: string }) => Promise<{ error: Error | null; message?: string }>;
  signOut: () => Promise<void>;
  rateLimitStatus: { login: number; signup: number };
};

/**
 * Create the Auth Context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * 
 * Wraps the app and manages authentication state with security features.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateLimitStatus, setRateLimitStatus] = useState({ login: 5, signup: 3 });
  const router = useRouter();
  const segments = useSegments();

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Handle navigation based on auth state
   */
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)/feed');
    }
  }, [user, segments, isLoading]);

  /**
   * Sign in with email and password
   * 
   * Security features:
   * - Rate limiting (5 attempts per 15 minutes)
   * - Input validation and sanitization
   * - Generic error messages (don't leak info)
   */
  const signIn = async (email: string, password: string) => {
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = password; // Don't sanitize passwords

      // Validate inputs
      const validation = validateAndSanitize(loginSchema, {
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (!validation.success) {
        return { 
          error: new Error('Invalid input'), 
          message: validation.errors.join(', ') 
        };
      }

      // Check rate limit
      const rateLimitKey = `login:${sanitizedEmail}`;
      const rateLimit = await rateLimiter.checkAuthLimit('login', sanitizedEmail);
      
      if (!rateLimit.allowed) {
        return { 
          error: new Error('Rate limit exceeded'), 
          message: `Too many login attempts. Please try again in ${rateLimiter.getTimeUntilReset(rateLimit.resetTime)}.` 
        };
      }

      // Record attempt
      await rateLimiter.recordAttempt(rateLimitKey, 15 * 60 * 1000);

      // Attempt sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      // Update rate limit status
      setRateLimitStatus(prev => ({ ...prev, login: rateLimit.remaining - 1 }));

      if (error) {
        // Generic error message - don't leak if email exists
        return { 
          error: new Error('Authentication failed'), 
          message: 'Invalid email or password. Please try again.' 
        };
      }

      // Reset rate limit on success
      await rateLimiter.resetLimit(rateLimitKey);

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        error: error as Error, 
        message: SECURITY_ERRORS.serverError 
      };
    }
  };

  /**
   * Sign up with email and password
   * 
   * Security features:
   * - Rate limiting (3 attempts per hour)
   * - Strict input validation
   * - Username sanitization
   */
  const signUp = async (
    email: string, 
    password: string, 
    metadata: { username: string; fullName?: string }
  ) => {
    try {
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedUsername = sanitizeInput(metadata.username);
      const sanitizedFullName = metadata.fullName ? sanitizeInput(metadata.fullName) : undefined;
      const sanitizedPassword = password;

      // Validate inputs
      const validation = validateAndSanitize(signupSchema, {
        email: sanitizedEmail,
        password: sanitizedPassword,
        username: sanitizedUsername,
        fullName: sanitizedFullName,
      });

      if (!validation.success) {
        return { 
          error: new Error('Invalid input'), 
          message: validation.errors.join(', ') 
        };
      }

      // Check rate limit
      const rateLimitKey = `signup:${sanitizedEmail}`;
      const rateLimit = await rateLimiter.checkAuthLimit('signup', sanitizedEmail);
      
      if (!rateLimit.allowed) {
        return { 
          error: new Error('Rate limit exceeded'), 
          message: `Too many signup attempts. Please try again in ${rateLimiter.getTimeUntilReset(rateLimit.resetTime)}.` 
        };
      }

      // Record attempt
      await rateLimiter.recordAttempt(rateLimitKey, 60 * 60 * 1000);

      // Attempt sign up
      const { error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            username: validation.data.username,
            full_name: validation.data.fullName,
          },
        },
      });

      // Update rate limit status
      setRateLimitStatus(prev => ({ ...prev, signup: rateLimit.remaining - 1 }));

      if (error) {
        // Check for specific errors that are safe to expose
        if (error.message.includes('User already registered')) {
          return { 
            error: new Error('User exists'), 
            message: 'An account with this email already exists.' 
          };
        }
        return { 
          error: new Error('Signup failed'), 
          message: 'Unable to create account. Please try again later.' 
        };
      }

      // Reset rate limit on success
      await rateLimiter.resetLimit(rateLimitKey);

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        error: error as Error, 
        message: SECURITY_ERRORS.serverError 
      };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any local rate limits on sign out
      setRateLimitStatus({ login: 5, signup: 3 });
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if Supabase fails
      setUser(null);
      setSession(null);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    rateLimitStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * 
 * Usage: const { user, signIn, signOut, rateLimitStatus } = useAuth();
 * 
 * @throws Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
