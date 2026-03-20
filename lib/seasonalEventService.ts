import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { earnFangs } from "./fangsService";
import type {
  SeasonalEvent,
  SeasonalEventStatus,
  EventLeaderboardEntry,
  EventParticipation,
} from "./types";

// ── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@lockedinfit/event-participation";

// ── Event Calendar ─────────────────────────────────────────────────────────

export const EVENT_CALENDAR: SeasonalEvent[] = [
  {
    id: "spring_awakening",
    name: "Spring Awakening",
    description: "Shake off the winter rust and crush sets all March long.",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    metric: "sets",
    rewards: [50, 100, 200],
    fangsMultiplier: 1.25,
  },
  {
    id: "summer_shred",
    name: "Summer Shred",
    description: "Stack sessions and sculpt your summer physique.",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    metric: "sessions",
    rewards: [75, 150, 300],
    fangsMultiplier: 1.5,
  },
  {
    id: "autumn_iron",
    name: "Autumn Iron",
    description: "Harvest XP as the leaves fall. Every rep counts.",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    metric: "xp",
    rewards: [50, 100, 200],
    fangsMultiplier: 1.25,
  },
  {
    id: "winter_howl",
    name: "Winter Howl",
    description: "Keep the streak alive through the coldest months.",
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    metric: "streak",
    rewards: [100, 200, 500],
    fangsMultiplier: 2.0,
  },
  {
    id: "new_year_grind",
    name: "New Year's Grind",
    description: "Start the year strong — sets on sets on sets.",
    startDate: "2027-01-01",
    endDate: "2027-01-31",
    metric: "sets",
    rewards: [75, 150, 300],
    fangsMultiplier: 1.5,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getEventStatus(event: SeasonalEvent): SeasonalEventStatus {
  const now = new Date();
  const start = new Date(event.startDate + "T00:00:00");
  const end = new Date(event.endDate + "T23:59:59");
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

async function loadLocalParticipation(): Promise<EventParticipation | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    if (__DEV__) console.warn("[seasonalEventService] loadLocalParticipation failed:", e);
    return null;
  }
}

async function saveLocalParticipation(p: EventParticipation): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Find the currently active seasonal event, if any.
 */
export function getActiveEvent(): {
  event: SeasonalEvent;
  status: SeasonalEventStatus;
} | null {
  for (const event of EVENT_CALENDAR) {
    const status = getEventStatus(event);
    if (status === "active") return { event, status };
  }
  return null;
}

/**
 * Join the active seasonal event.
 */
export async function joinEvent(
  userId: string,
  eventId: string
): Promise<EventParticipation> {
  const participation: EventParticipation = {
    eventId,
    userId,
    score: 0,
    joinedAt: new Date().toISOString(),
    rewardsClaimed: false,
  };

  await saveLocalParticipation(participation);

  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, "eventParticipation"), {
        ...participation,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      if (__DEV__) console.warn("[seasonalEventService] joinEvent firestore sync failed:", e);
    }
  }

  return participation;
}

/**
 * Increment the user's event score for the given metric amount.
 */
export async function updateEventScore(
  userId: string,
  eventId: string,
  metricAmount: number
): Promise<void> {
  const local = await loadLocalParticipation();
  if (!local || local.eventId !== eventId) return;

  local.score += metricAmount;
  await saveLocalParticipation(local);

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, "eventParticipation"),
        where("userId", "==", userId),
        where("eventId", "==", eventId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, "eventParticipation", snap.docs[0].id);
        await updateDoc(docRef, { score: local.score });
      }
    } catch (e) {
      if (__DEV__) console.warn("[seasonalEventService] updateEventScore firestore sync failed:", e);
    }
  }
}

/**
 * Fetch the event leaderboard from Firestore.
 */
export async function getEventLeaderboard(
  eventId: string,
  resultLimit = 50
): Promise<EventLeaderboardEntry[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const q = query(
      collection(db, "eventParticipation"),
      where("eventId", "==", eventId),
      orderBy("score", "desc"),
      firestoreLimit(resultLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => {
      const data = d.data();
      return {
        userId: data.userId ?? "",
        displayName: data.displayName ?? "Unknown",
        rank: i + 1,
        score: data.score ?? 0,
      };
    });
  } catch (e) {
    if (__DEV__) console.warn("[seasonalEventService] getEventLeaderboard failed:", e);
    return [];
  }
}

/**
 * Claim event rewards based on score tiers.
 * Returns the Fangs amount awarded (0 if already claimed or ineligible).
 */
export async function claimEventReward(
  userId: string,
  eventId: string
): Promise<number> {
  const local = await loadLocalParticipation();
  if (!local || local.eventId !== eventId || local.rewardsClaimed) return 0;

  const event = EVENT_CALENDAR.find((e) => e.id === eventId);
  if (!event) return 0;

  // Determine tier: rewards[0]=Bronze, rewards[1]=Silver, rewards[2]=Gold
  let fangsAwarded = 0;
  const [bronze, silver, gold] = event.rewards;
  if (local.score >= gold) {
    fangsAwarded = gold;
  } else if (local.score >= silver) {
    fangsAwarded = silver;
  } else if (local.score >= bronze) {
    fangsAwarded = bronze;
  }

  if (fangsAwarded === 0) return 0;

  local.rewardsClaimed = true;
  await saveLocalParticipation(local);

  await earnFangs(userId, fangsAwarded, `Event reward: ${event.name}`);

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, "eventParticipation"),
        where("userId", "==", userId),
        where("eventId", "==", eventId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, "eventParticipation", snap.docs[0].id);
        await updateDoc(docRef, { rewardsClaimed: true });
      }
    } catch (e) {
      if (__DEV__) console.warn("[seasonalEventService] claimEventReward firestore sync failed:", e);
    }
  }

  return fangsAwarded;
}

/**
 * Returns the Fangs multiplier for the currently active event, or 1.0 if none.
 */
export function getEventFangsMultiplier(): number {
  const active = getActiveEvent();
  return active?.event.fangsMultiplier ?? 1.0;
}
