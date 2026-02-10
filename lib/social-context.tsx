import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { supabase } from './supabase';

/**
 * Social Context Type Definition
 */
type SocialContextType = {
  // Likes
  likeDrive: (driveId: string) => Promise<{ error: Error | null }>;
  unlikeDrive: (driveId: string) => Promise<{ error: Error | null }>;
  isDriveLiked: (driveId: string) => Promise<boolean>;
  
  // Saves
  saveDrive: (driveId: string) => Promise<{ error: Error | null }>;
  unsaveDrive: (driveId: string) => Promise<{ error: Error | null }>;
  isDriveSaved: (driveId: string) => Promise<boolean>;
  
  // Comments
  addComment: (driveId: string, content: string) => Promise<{ error: Error | null }>;
  deleteComment: (commentId: string) => Promise<{ error: Error | null }>;
  
  // Follows
  followUser: (userId: string) => Promise<{ error: Error | null }>;
  unfollowUser: (userId: string) => Promise<{ error: Error | null }>;
  isFollowing: (userId: string) => Promise<boolean>;
  getFollowerCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
};

const SocialContext = createContext<SocialContextType | undefined>(undefined);

/**
 * Social Provider Component
 * 
 * Manages all social interactions: likes, saves, comments, follows
 */
export function SocialProvider({ children }: { children: ReactNode }) {
  const [optimisticLikes, setOptimisticLikes] = useState<Set<string>>(new Set());
  const [optimisticSaves, setOptimisticSaves] = useState<Set<string>>(new Set());

  /**
   * Like a drive
   */
  const likeDrive = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('likes')
        .insert({ drive_id: driveId, user_id: user.id });

      if (!error) {
        setOptimisticLikes(prev => new Set(prev).add(driveId));
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Unlike a drive
   */
  const unlikeDrive = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('drive_id', driveId)
        .eq('user_id', user.id);

      if (!error) {
        setOptimisticLikes(prev => {
          const next = new Set(prev);
          next.delete(driveId);
          return next;
        });
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Check if current user has liked a drive
   */
  const isDriveLiked = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check optimistic state first
      if (optimisticLikes.has(driveId)) return true;

      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('drive_id', driveId)
        .eq('user_id', user.id)
        .single();

      return !error && data !== null;
    } catch {
      return false;
    }
  }, [optimisticLikes]);

  /**
   * Save a drive
   */
  const saveDrive = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saves')
        .insert({ drive_id: driveId, user_id: user.id });

      if (!error) {
        setOptimisticSaves(prev => new Set(prev).add(driveId));
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Unsave a drive
   */
  const unsaveDrive = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('drive_id', driveId)
        .eq('user_id', user.id);

      if (!error) {
        setOptimisticSaves(prev => {
          const next = new Set(prev);
          next.delete(driveId);
          return next;
        });
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Check if current user has saved a drive
   */
  const isDriveSaved = useCallback(async (driveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check optimistic state first
      if (optimisticSaves.has(driveId)) return true;

      const { data, error } = await supabase
        .from('saves')
        .select('id')
        .eq('drive_id', driveId)
        .eq('user_id', user.id)
        .single();

      return !error && data !== null;
    } catch {
      return false;
    }
  }, [optimisticSaves]);

  /**
   * Add a comment to a drive
   */
  const addComment = useCallback(async (driveId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comments')
        .insert({ drive_id: driveId, user_id: user.id, content });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Follow a user
   */
  const followUser = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (user.id === userId) throw new Error('Cannot follow yourself');

      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Unfollow a user
   */
  const unfollowUser = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  /**
   * Check if current user is following another user
   */
  const isFollowing = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      return !error && data !== null;
    } catch {
      return false;
    }
  }, []);

  /**
   * Get follower count for a user
   */
  const getFollowerCount = useCallback(async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId);

      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  }, []);

  /**
   * Get following count for a user
   */
  const getFollowingCount = useCallback(async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId);

      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  }, []);

  const value = {
    likeDrive,
    unlikeDrive,
    isDriveLiked,
    saveDrive,
    unsaveDrive,
    isDriveSaved,
    addComment,
    deleteComment,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowerCount,
    getFollowingCount,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

/**
 * Hook to use social context
 * 
 * Usage: const { likeDrive, followUser } = useSocial();
 */
export function useSocial() {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
