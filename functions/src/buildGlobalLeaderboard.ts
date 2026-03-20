/**
 * buildGlobalLeaderboard
 *
 * Scheduled weekly (Monday 00:05 UTC). Queries all users' weeklyXp for the
 * current week, ranks them, and writes the top 100 to a single
 * `globalLeaderboard/{weekKey}` document for cheap client reads.
 *
 * Also maintains an all-time leaderboard at `globalLeaderboard/alltime`.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function getCurrentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getUTCFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + jan1.getUTCDay()) / 7);
  return `${now.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  rank: string;
  weeklyXp: number;
  allTimeXp: number;
};

export const buildGlobalLeaderboard = functions.pubsub
  .schedule("every monday 00:05")
  .timeZone("UTC")
  .onRun(async () => {
    const weekKey = getCurrentWeekKey();
    functions.logger.info(`Building global leaderboard for ${weekKey}`);

    // ── Weekly leaderboard ──────────────────────────────────────────────
    const weeklySnap = await db
      .collection("weeklyXp")
      .where("weekKey", "==", weekKey)
      .orderBy("xpEarned", "desc")
      .limit(100)
      .get();

    const weeklyEntries: LeaderboardEntry[] = [];

    // Batch-fetch user profiles for display names & ranks
    const userIds = weeklySnap.docs.map((d) => d.data().userId as string);
    const userMap = new Map<string, { displayName: string; rank: string; totalXp: number }>();

    // Firestore `in` queries limited to 30 — chunk them
    for (let i = 0; i < userIds.length; i += 30) {
      const chunk = userIds.slice(i, i + 30);
      const usersSnap = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", chunk)
        .get();
      for (const u of usersSnap.docs) {
        const data = u.data();
        userMap.set(u.id, {
          displayName: data.displayName ?? "Unknown",
          rank: data.rank ?? "Runt",
          totalXp: data.totalXp ?? 0,
        });
      }
    }

    for (const doc of weeklySnap.docs) {
      const data = doc.data();
      const userId = data.userId as string;
      const user = userMap.get(userId);
      weeklyEntries.push({
        userId,
        displayName: user?.displayName ?? "Unknown",
        rank: user?.rank ?? "Runt",
        weeklyXp: data.xpEarned ?? 0,
        allTimeXp: user?.totalXp ?? 0,
      });
    }

    await db.doc(`globalLeaderboard/${weekKey}`).set({
      weekKey,
      entries: weeklyEntries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `Weekly leaderboard written: ${weeklyEntries.length} entries`
    );

    // ── All-time leaderboard ────────────────────────────────────────────
    const allTimeSnap = await db
      .collection("users")
      .orderBy("totalXp", "desc")
      .limit(100)
      .get();

    const allTimeEntries: LeaderboardEntry[] = allTimeSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        displayName: data.displayName ?? "Unknown",
        rank: data.rank ?? "Runt",
        weeklyXp: 0, // not relevant for all-time
        allTimeXp: data.totalXp ?? 0,
      };
    });

    await db.doc("globalLeaderboard/alltime").set({
      entries: allTimeEntries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `All-time leaderboard written: ${allTimeEntries.length} entries`
    );

    return null;
  });
