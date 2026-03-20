import { useState, useCallback, useEffect, useRef } from "react";
import {
  getNotifications,
  markRead as markReadService,
  markAllRead as markAllReadService,
  getUnreadCount,
} from "../lib/inAppNotificationService";
import { useAuth } from "../contexts/AuthContext";
import type { InAppNotification } from "../lib/types";
import type { Unsubscribe } from "firebase/firestore";

type UseNotificationsResult = {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const data = await getNotifications(user.uid);
    setNotifications(data);
    setLoading(false);
  }, [user]);

  // Subscribe to unread count
  useEffect(() => {
    if (!user) return;

    unsubRef.current = getUnreadCount(user.uid, setUnreadCount);
    refresh();

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      await markReadService(user.uid, notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await markAllReadService(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh };
}
