import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getCurrentWeekKey } from "./leagueService";
import type { RankLevel } from "./types";

const MAX_GROUP_SIZE = 30;

/**
 * Assign a user to a league group for the given week.
 * If an open group exists (< 30 members), adds the user to it.
 * Otherwise, creates a new group and adds the user.
 * Returns the league_id.
 */
export async function assignUserToLeague(
  userId: string,
  rank: RankLevel,
  weekKey?: string
): Promise<string> {
  const week = weekKey ?? getCurrentWeekKey();

  // Check if user is already in a league this week
  const existingQ = query(
    collection(db, "leagueMembers"),
    where("userId", "==", userId),
    where("weekKey", "==", week)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data().leagueId;
  }

  // Find leagues for this week + tier
  const leaguesRef = collection(db, "leagues");
  const leaguesQ = query(
    leaguesRef,
    where("weekKey", "==", week),
    where("tier", "==", rank)
  );
  const leaguesSnap = await getDocs(leaguesQ);

  // Check each league for open slots
  for (const leagueDoc of leaguesSnap.docs) {
    const membersQ = query(
      collection(db, "leagueMembers"),
      where("leagueId", "==", leagueDoc.id)
    );
    const membersSnap = await getDocs(membersQ);

    if (membersSnap.size < MAX_GROUP_SIZE) {
      await addMember(leagueDoc.id, userId, week);
      return leagueDoc.id;
    }
  }

  // No open league found — create a new group
  const groupNumber = leaguesSnap.size + 1;

  const newLeague = await addDoc(collection(db, "leagues"), {
    weekKey: week,
    tier: rank,
    groupNumber,
    createdAt: serverTimestamp(),
  });

  await addMember(newLeague.id, userId, week);
  return newLeague.id;
}

/** Insert a leagueMembers doc. */
async function addMember(
  leagueId: string,
  userId: string,
  weekKey: string
): Promise<void> {
  await addDoc(collection(db, "leagueMembers"), {
    leagueId,
    userId,
    weekKey,
    finalXp: null,
    result: null,
  });
}
