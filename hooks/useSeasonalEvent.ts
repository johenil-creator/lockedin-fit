import { useState, useCallback, useEffect } from "react";
import {
  getActiveEvent,
  joinEvent as joinEventService,
  getEventLeaderboard,
} from "../lib/seasonalEventService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import type {
  SeasonalEvent,
  EventParticipation,
  EventLeaderboardEntry,
} from "../lib/types";

const PARTICIPATION_KEY = "@lockedinfit/event-participation";

type UseSeasonalEventResult = {
  event: SeasonalEvent | null;
  participation: EventParticipation | null;
  leaderboard: EventLeaderboardEntry[];
  loading: boolean;
  signedIn: boolean;
  joinEvent: () => Promise<void>;
};

export function useSeasonalEvent(): UseSeasonalEventResult {
  const { user } = useAuth();
  const [event, setEvent] = useState<SeasonalEvent | null>(null);
  const [participation, setParticipation] = useState<EventParticipation | null>(null);
  const [leaderboard, setLeaderboard] = useState<EventLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const active = getActiveEvent();
      if (active) {
        setEvent(active.event);

        // Load local participation
        try {
          const raw = await AsyncStorage.getItem(PARTICIPATION_KEY);
          if (raw) {
            const p: EventParticipation = JSON.parse(raw);
            if (p.eventId === active.event.id) {
              setParticipation(p);
            }
          }
        } catch {
          // no-op
        }
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const joinEvent = useCallback(async () => {
    if (!event || !user) return;
    try {
      const p = await joinEventService(user.uid, event.id);
      setParticipation(p);

      // Lazily load leaderboard after joining
      const lb = await getEventLeaderboard(event.id);
      setLeaderboard(lb);
    } catch (e) {
      if (__DEV__) console.warn("[useSeasonalEvent] joinEvent failed:", e);
    }
  }, [user, event]);

  // Load leaderboard lazily when participation exists and event is set
  useEffect(() => {
    if (!event || !participation) return;
    getEventLeaderboard(event.id).then(setLeaderboard).catch(() => {});
  }, [event, participation]);

  return { event, participation, leaderboard, loading, signedIn: !!user, joinEvent };
}
