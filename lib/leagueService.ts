import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { RankLevel } from "./types";

// ── Types ────────────────────────────────────────────────────────────────────

export type League = {
  id: string;
  weekKey: string;
  tier: string;
  groupNumber: number;
};

export type LeagueStanding = {
  userId: string;
  displayName: string;
  rank: string;
  xpEarned: number;
  position: number;
  isCurrentUser?: boolean;
};

export type WeekResult = {
  result: "promoted" | "relegated" | "stayed";
  xpEarned: number;
  position: number;
  totalMembers: number;
};

// ── Rank Ladder ──────────────────────────────────────────────────────────────

const RANK_LADDER: RankLevel[] = [
  "Runt",
  "Scout",
  "Stalker",
  "Hunter",
  "Sentinel",
  "Alpha",
  "Apex",
  "Apex_Bronze",
  "Apex_Silver",
  "Apex_Gold",
];

function getNextRank(rank: string): RankLevel | null {
  const idx = RANK_LADDER.indexOf(rank as RankLevel);
  if (idx === -1 || idx >= RANK_LADDER.length - 1) return null;
  return RANK_LADDER[idx + 1];
}

function getPreviousRank(rank: string): RankLevel | null {
  const idx = RANK_LADDER.indexOf(rank as RankLevel);
  if (idx <= 0) return null;
  return RANK_LADDER[idx - 1];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get current ISO week key string e.g. "2026-W10" */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/** Get the previous ISO week key (for last-week lookups). */
function getPreviousWeekKey(): string {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const jan1 = new Date(oneWeekAgo.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((oneWeekAgo.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${oneWeekAgo.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

// ── Service Functions ────────────────────────────────────────────────────────

/** Get user's current league for the given week. */
export async function getUserLeague(
  userId: string,
  weekKey: string
): Promise<League | null> {
  // Find the user's league_member doc for this week
  const membersRef = collection(db, "leagueMembers");
  const q = query(
    membersRef,
    where("userId", "==", userId),
    where("weekKey", "==", weekKey)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const memberDoc = snap.docs[0];
  const leagueId = memberDoc.data().leagueId;

  // Get the league doc
  const leagueRef = doc(db, "leagues", leagueId);
  const leagueSnap = await getDoc(leagueRef);
  if (!leagueSnap.exists()) return null;

  const data = leagueSnap.data();
  return {
    id: leagueSnap.id,
    weekKey: data.weekKey,
    tier: data.tier,
    groupNumber: data.groupNumber,
  };
}

/** Get sorted standings for a league (by weekly XP descending). */
export async function getLeagueStandings(
  leagueId: string
): Promise<LeagueStanding[]> {
  // Get the league info
  const leagueRef = doc(db, "leagues", leagueId);
  const leagueSnap = await getDoc(leagueRef);
  if (!leagueSnap.exists()) return [];
  const weekKey = leagueSnap.data().weekKey;

  // Get all members for this league
  const membersRef = collection(db, "leagueMembers");
  const membersQ = query(membersRef, where("leagueId", "==", leagueId));
  const membersSnap = await getDocs(membersQ);
  if (membersSnap.empty) return [];

  const userIds = membersSnap.docs.map((d) => d.data().userId);
  const finalXpMap = new Map<string, number | null>();
  for (const d of membersSnap.docs) {
    finalXpMap.set(d.data().userId, d.data().finalXp ?? null);
  }

  // Get weekly XP for these users
  const xpMap = new Map<string, number>();
  // Firestore `in` queries support max 30 items — perfect for our ~30 group size
  if (userIds.length > 0) {
    const xpRef = collection(db, "weeklyXp");
    const xpQ = query(
      xpRef,
      where("userId", "in", userIds),
      where("weekKey", "==", weekKey)
    );
    const xpSnap = await getDocs(xpQ);
    for (const d of xpSnap.docs) {
      xpMap.set(d.data().userId, d.data().xpEarned);
    }
  }

  // Get user display names + ranks
  const usersRef = collection(db, "users");
  const userMap = new Map<string, { displayName: string; rank: string }>();

  // Batch fetch users (max 30 per `in` query)
  if (userIds.length > 0) {
    const usersQ = query(usersRef, where("__name__", "in", userIds));
    const usersSnap = await getDocs(usersQ);
    for (const d of usersSnap.docs) {
      userMap.set(d.id, {
        displayName: d.data().displayName ?? "Unknown",
        rank: d.data().rank ?? "Runt",
      });
    }
  }

  // Build standings
  const standings: LeagueStanding[] = userIds.map((uid) => {
    const userInfo = userMap.get(uid);
    return {
      userId: uid,
      displayName: userInfo?.displayName ?? "Unknown",
      rank: userInfo?.rank ?? "Runt",
      xpEarned: finalXpMap.get(uid) ?? xpMap.get(uid) ?? 0,
      position: 0,
    };
  });

  // Sort descending by XP
  standings.sort((a, b) => b.xpEarned - a.xpEarned);
  for (let i = 0; i < standings.length; i++) {
    standings[i].position = i + 1;
  }

  return standings;
}

/** Get user's rank position in their league (1-based). */
export async function getUserPosition(
  userId: string,
  leagueId: string
): Promise<number> {
  const standings = await getLeagueStandings(leagueId);
  const entry = standings.find((s) => s.userId === userId);
  return entry?.position ?? 0;
}

/** Get the result from last week (promoted/relegated/stayed). */
export async function getLastWeekResult(
  userId: string
): Promise<WeekResult | null> {
  const prevWeek = getPreviousWeekKey();

  // Find the user's league member doc from last week
  const membersRef = collection(db, "leagueMembers");
  const q = query(
    membersRef,
    where("userId", "==", userId),
    where("weekKey", "==", prevWeek)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const memberData = snap.docs[0].data();
  if (!memberData.result) return null;

  // Count total members in that league
  const leagueMembersQ = query(
    membersRef,
    where("leagueId", "==", memberData.leagueId)
  );
  const leagueMembersSnap = await getDocs(leagueMembersQ);
  const totalMembers = leagueMembersSnap.size;

  // Get position
  const standings = await getLeagueStandings(memberData.leagueId);
  const position = standings.find((s) => s.userId === userId)?.position ?? 0;

  return {
    result: memberData.result,
    xpEarned: memberData.finalXp ?? 0,
    position,
    totalMembers,
  };
}

/** Process week-end: set final_xp, determine promotions/relegations. */
export async function processWeekEnd(weekKey: string): Promise<void> {
  // Get all leagues for this week
  const leaguesRef = collection(db, "leagues");
  const leaguesQ = query(leaguesRef, where("weekKey", "==", weekKey));
  const leaguesSnap = await getDocs(leaguesQ);

  if (leaguesSnap.empty) return;

  for (const leagueDoc of leaguesSnap.docs) {
    const tier = leagueDoc.data().tier;

    // Get members
    const membersRef = collection(db, "leagueMembers");
    const membersQ = query(
      membersRef,
      where("leagueId", "==", leagueDoc.id)
    );
    const membersSnap = await getDocs(membersQ);
    if (membersSnap.empty) continue;

    const userIds = membersSnap.docs.map((d) => d.data().userId);

    // Get weekly XP
    const xpMap = new Map<string, number>();
    if (userIds.length > 0) {
      const xpRef = collection(db, "weeklyXp");
      const xpQ = query(
        xpRef,
        where("userId", "in", userIds),
        where("weekKey", "==", weekKey)
      );
      const xpSnap = await getDocs(xpQ);
      for (const d of xpSnap.docs) {
        xpMap.set(d.data().userId, d.data().xpEarned);
      }
    }

    // Sort by XP descending
    const sorted = userIds
      .map((uid) => ({ userId: uid, xp: xpMap.get(uid) ?? 0 }))
      .sort((a, b) => b.xp - a.xp);

    const total = sorted.length;
    const batch = writeBatch(db);

    for (let i = 0; i < total; i++) {
      const { userId, xp } = sorted[i];
      let result: "promoted" | "relegated" | "stayed";

      if (i < 5) {
        result = "promoted";
      } else if (i >= total - 5) {
        result = "relegated";
      } else {
        result = "stayed";
      }

      // Update league member doc
      const memberDoc = membersSnap.docs.find(
        (d) => d.data().userId === userId
      );
      if (memberDoc) {
        batch.update(memberDoc.ref, { finalXp: xp, result });
      }

      // Update user rank for promotion/relegation
      if (result === "promoted") {
        const next = getNextRank(tier);
        if (next) {
          batch.update(doc(db, "users", userId), { rank: next });
        }
      } else if (result === "relegated") {
        const prev = getPreviousRank(tier);
        if (prev) {
          batch.update(doc(db, "users", userId), { rank: prev });
        }
      }
    }

    await batch.commit();
  }
}
