import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { supabase, ReportReason } from './supabase';
import { useAuth } from './auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModerationContextType {
  blockedUserIds: string[];
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string, username: string) => Promise<{ error: Error | null }>;
  unblockUser: (userId: string) => Promise<{ error: Error | null }>;
  reportDrive: (driveId: string, reason: ReportReason, description?: string) => Promise<{ error: Error | null }>;
  reportComment: (commentId: string, reason: ReportReason, description?: string) => Promise<{ error: Error | null }>;
  reportUser: (userId: string, reason: ReportReason, description?: string) => Promise<{ error: Error | null }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ModerationContext = createContext<ModerationContextType>({
  blockedUserIds: [],
  isBlocked: () => false,
  blockUser: async () => ({ error: null }),
  unblockUser: async () => ({ error: null }),
  reportDrive: async () => ({ error: null }),
  reportComment: async () => ({ error: null }),
  reportUser: async () => ({ error: null }),
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function ModerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Load blocked users on mount / auth change
  useEffect(() => {
    if (!user) {
      setBlockedUserIds([]);
      return;
    }
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .then(({ data }) => {
        setBlockedUserIds((data ?? []).map((b: { blocked_id: string }) => b.blocked_id));
      });
  }, [user]);

  const isBlocked = useCallback(
    (userId: string) => blockedUserIds.includes(userId),
    [blockedUserIds]
  );

  const blockUser = useCallback(async (userId: string, username: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    // Optimistic update
    setBlockedUserIds(prev => [...prev, userId]);
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: user.id, blocked_id: userId });
    if (error) {
      setBlockedUserIds(prev => prev.filter(id => id !== userId));
      return { error: error as unknown as Error };
    }
    Alert.alert(
      'User Blocked',
      `@${username} has been blocked. Their content will no longer appear in your feed.`
    );
    return { error: null };
  }, [user]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    // Optimistic update
    setBlockedUserIds(prev => prev.filter(id => id !== userId));
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);
    if (error) {
      setBlockedUserIds(prev => [...prev, userId]);
      return { error: error as unknown as Error };
    }
    return { error: null };
  }, [user]);

  const reportDrive = useCallback(async (
    driveId: string,
    reason: ReportReason,
    description?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_drive_id: driveId,
      reason,
      description: description ?? null,
    });
    return { error: error ? (error as unknown as Error) : null };
  }, [user]);

  const reportComment = useCallback(async (
    commentId: string,
    reason: ReportReason,
    description?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_comment_id: commentId,
      reason,
      description: description ?? null,
    });
    return { error: error ? (error as unknown as Error) : null };
  }, [user]);

  const reportUser = useCallback(async (
    userId: string,
    reason: ReportReason,
    description?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reason,
      description: description ?? null,
    });
    return { error: error ? (error as unknown as Error) : null };
  }, [user]);

  return (
    <ModerationContext.Provider value={{
      blockedUserIds,
      isBlocked,
      blockUser,
      unblockUser,
      reportDrive,
      reportComment,
      reportUser,
    }}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  return useContext(ModerationContext);
}
