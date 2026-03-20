import { useState, useCallback, useEffect, useRef } from "react";
import {
  sendMessage as sendMessageService,
  getMessages,
  onNewMessages,
} from "../lib/packChatService";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import type { PackMessage } from "../lib/types";
import type { Unsubscribe } from "firebase/firestore";

type UsePackChatResult = {
  messages: PackMessage[];
  loading: boolean;
  send: (text: string) => Promise<boolean>;
  subscribe: () => void;
  unsubscribe: () => void;
};

export function usePackChat(packId: string | null): UsePackChatResult {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [messages, setMessages] = useState<PackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<Unsubscribe | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!packId) {
      setLoading(false);
      return;
    }
    getMessages(packId).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [packId]);

  const subscribe = useCallback(() => {
    if (!packId || unsubRef.current) return;
    unsubRef.current = onNewMessages(packId, setMessages);
  }, [packId]);

  const unsubscribe = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user || !packId) return false;
      const msg = await sendMessageService(
        packId,
        user.uid,
        profile.name || user.displayName || user.email?.split("@")[0] || "Wolf",
        text
      );
      return !!msg;
    },
    [user, packId, profile.name]
  );

  return { messages, loading, send, subscribe, unsubscribe };
}
