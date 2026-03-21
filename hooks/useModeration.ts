import { useState, useEffect, useCallback, useMemo } from "react";
import {
  reportContent as reportContentService,
  blockUser as blockUserService,
  unblockUser as unblockUserService,
  getBlockedUsers,
  filterBlockedContent,
  type ContentType,
  type ReportReason,
} from "../lib/moderationService";

/**
 * Hook for content moderation: reporting, blocking/unblocking, and
 * filtering content from blocked users.
 */
export function useModeration(currentUserId: string | undefined) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Load blocked users on mount ────────────────────────────────────────────

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const ids = await getBlockedUsers(currentUserId);
        if (!cancelled) setBlockedUserIds(ids);
      } catch (e) {
        if (__DEV__) console.warn("[useModeration] failed to load blocked users:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // ── Blocked set for O(1) lookups ───────────────────────────────────────────

  const blockedSet = useMemo(() => new Set(blockedUserIds), [blockedUserIds]);

  // ── Report content ────────────────────────────────────────────────────────

  const reportContent = useCallback(
    async (
      contentType: ContentType,
      contentId: string,
      reason: ReportReason,
      reasonText?: string
    ): Promise<boolean> => {
      if (!currentUserId) return false;
      setLoading(true);
      try {
        return await reportContentService(
          currentUserId,
          contentType,
          contentId,
          reason,
          reasonText
        );
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  // ── Block user ─────────────────────────────────────────────────────────────

  const blockUser = useCallback(
    async (blockedUserId: string): Promise<boolean> => {
      if (!currentUserId || currentUserId === blockedUserId) return false;
      setLoading(true);
      try {
        const success = await blockUserService(currentUserId, blockedUserId);
        if (success) {
          setBlockedUserIds((prev) =>
            prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]
          );
        }
        return success;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  // ── Unblock user ───────────────────────────────────────────────────────────

  const unblockUser = useCallback(
    async (blockedUserId: string): Promise<boolean> => {
      if (!currentUserId) return false;
      setLoading(true);
      try {
        const success = await unblockUserService(currentUserId, blockedUserId);
        if (success) {
          setBlockedUserIds((prev) => prev.filter((id) => id !== blockedUserId));
        }
        return success;
      } finally {
        setLoading(false);
      }
    },
    [currentUserId]
  );

  // ── Check if a specific user is blocked ────────────────────────────────────

  const isUserBlocked = useCallback(
    (userId: string): boolean => blockedSet.has(userId),
    [blockedSet]
  );

  // ── Filter content from blocked users ──────────────────────────────────────

  const filterBlocked = useCallback(
    <T extends { userId: string }>(items: T[]): T[] =>
      filterBlockedContent(items, blockedSet),
    [blockedSet]
  );

  return {
    reportContent,
    blockUser,
    unblockUser,
    blockedUserIds,
    isUserBlocked,
    filterBlocked,
    loading,
  };
}
