import { useState, useEffect, useCallback } from "react";
import { getFriendIds } from "../lib/xpSync";
import { getFriendActivity } from "../lib/activityService";
import { getReactionCountsBatch } from "../lib/reactionService";
import { useAuth } from "../contexts/AuthContext";
import type { ActivityEvent, ReactionType } from "../lib/types";

type UseFriendActivityResult = {
  activities: ActivityEvent[];
  reactions: Record<string, Record<ReactionType, number>>;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useFriendActivity(): UseFriendActivityResult {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<ReactionType, number>>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const friendIds = await getFriendIds(user.uid);
      // Include own posts so the user sees their activity too
      const feedUserIds = [user.uid, ...friendIds];

      const feed = await getFriendActivity(feedUserIds);
      setActivities(feed);

      // Batch-fetch reactions for all activities
      if (feed.length > 0) {
        const reactionCounts = await getReactionCountsBatch(feed.map((e) => e.id));
        setReactions(reactionCounts);
      }
    } catch (err) {
      if (__DEV__) console.warn("[useFriendActivity] error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, reactions, loading, refresh };
}
