/**
 * processWeekEnd
 *
 * Scheduled weekly (Monday 00:00 UTC). Processes league week-end:
 * - Ranks all members in each league by XP
 * - Top 5 get promoted, bottom 5 get relegated
 * - Updates user ranks and league member results
 * - Also finalizes pack challenges and friend challenges
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const RANK_LADDER = [
  "Runt",
  "Scout",
  "Stalker",
  "Hunter",
  "Sentinel",
  "Alpha",
  "Apex",
] as const;
type RankLevel = (typeof RANK_LADDER)[number];

function getNextRank(rank: string): RankLevel | null {
  const idx = RANK_LADDER.indexOf(rank as RankLevel);
  return idx >= 0 && idx < RANK_LADDER.length - 1
    ? RANK_LADDER[idx + 1]
    : null;
}

function getPreviousRank(rank: string): RankLevel | null {
  const idx = RANK_LADDER.indexOf(rank as RankLevel);
  return idx > 0 ? RANK_LADDER[idx - 1] : null;
}

function getLastWeekKey(): string {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const jan1 = new Date(oneWeekAgo.getUTCFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((oneWeekAgo.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + jan1.getUTCDay()) / 7);
  return `${oneWeekAgo.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getUTCFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNumber = Math.ceil((dayOfYear + jan1.getUTCDay()) / 7);
  return `${now.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export const processWeekEnd = functions.pubsub
  .schedule("every monday 00:00")
  .timeZone("UTC")
  .onRun(async () => {
    const weekKey = getLastWeekKey();
    functions.logger.info(`Processing week-end for ${weekKey}`);

    // ── League Promotions/Relegations ─────────────────────────────────────

    const leaguesSnap = await db
      .collection("leagues")
      .where("weekKey", "==", weekKey)
      .get();

    for (const leagueDoc of leaguesSnap.docs) {
      const tier = leagueDoc.data().tier;
      const membersSnap = await db
        .collection("leagueMembers")
        .where("leagueId", "==", leagueDoc.id)
        .get();

      if (membersSnap.empty) continue;

      const userIds = membersSnap.docs.map((d) => d.data().userId as string);
      const xpMap = new Map<string, number>();

      // Fetch weekly XP for all members (chunked for `in` query limit)
      for (let i = 0; i < userIds.length; i += 30) {
        const chunk = userIds.slice(i, i + 30);
        const xpSnap = await db
          .collection("weeklyXp")
          .where("userId", "in", chunk)
          .where("weekKey", "==", weekKey)
          .get();
        for (const d of xpSnap.docs) {
          xpMap.set(d.data().userId, d.data().xpEarned);
        }
      }

      const sorted = userIds
        .map((uid) => ({ userId: uid, xp: xpMap.get(uid) ?? 0 }))
        .sort((a, b) => b.xp - a.xp);

      const total = sorted.length;
      const batch = db.batch();

      for (let i = 0; i < total; i++) {
        const { userId, xp } = sorted[i];
        const result =
          i < 5 ? "promoted" : i >= total - 5 ? "relegated" : "stayed";

        const memberDoc = membersSnap.docs.find(
          (d) => d.data().userId === userId
        );
        if (memberDoc) batch.update(memberDoc.ref, { finalXp: xp, result });

        if (result === "promoted") {
          const next = getNextRank(tier);
          if (next) batch.update(db.doc(`users/${userId}`), { rank: next });
        } else if (result === "relegated") {
          const prev = getPreviousRank(tier);
          if (prev) batch.update(db.doc(`users/${userId}`), { rank: prev });
        }
      }

      await batch.commit();
      functions.logger.info(
        `Processed league ${leagueDoc.id} (${tier}): ${total} members`
      );
    }

    // ── Finalize Pack Challenges ──────────────────────────────────────────

    const packChallengesSnap = await db
      .collection("packChallenges")
      .where("weekKey", "==", weekKey)
      .where("status", "==", "active")
      .get();

    for (const challengeDoc of packChallengesSnap.docs) {
      const data = challengeDoc.data();
      const newStatus =
        (data.current ?? 0) >= data.target ? "completed" : "failed";
      await challengeDoc.ref.update({ status: newStatus });
      functions.logger.info(
        `Pack challenge ${challengeDoc.id}: ${newStatus}`
      );
    }

    // ── Finalize Friend Challenges ────────────────────────────────────────

    const friendChallengesSnap = await db
      .collection("friendChallenges")
      .where("weekKey", "==", weekKey)
      .where("status", "==", "active")
      .get();

    for (const challengeDoc of friendChallengesSnap.docs) {
      const data = challengeDoc.data();
      const challengerScore = data.challengerScore ?? 0;
      const opponentScore = data.opponentScore ?? 0;

      let winnerId: string | null = null;
      if (challengerScore > opponentScore) winnerId = data.challengerId;
      else if (opponentScore > challengerScore) winnerId = data.opponentId;

      await challengeDoc.ref.update({
        status: "completed",
        winnerId,
      });
      functions.logger.info(
        `Friend challenge ${challengeDoc.id}: winner=${winnerId ?? "tie"}`
      );
    }

    // ── Finalize Streak Battles ──────────────────────────────────────────

    const streakBattlesSnap = await db
      .collection("streakBattles")
      .where("status", "==", "active")
      .get();

    for (const battleDoc of streakBattlesSnap.docs) {
      const data = battleDoc.data();
      const p1Broke = data.player1Broke ?? false;
      const p2Broke = data.player2Broke ?? false;

      if (p1Broke || p2Broke) {
        const winnerId = p1Broke ? data.player2Id : data.player1Id;
        await battleDoc.ref.update({
          status: "completed",
          winnerId,
        });

        // Award 20 Fangs to winner
        if (winnerId) {
          const userRef = db.doc(`users/${winnerId}`);
          await userRef.update({
            fangs: admin.firestore.FieldValue.increment(20),
          });
        }

        functions.logger.info(
          `Streak battle ${battleDoc.id}: winner=${winnerId ?? "none"}`
        );
      }
    }

    // ── Finalize Pack Wars ───────────────────────────────────────────────

    const packWarsSnap = await db
      .collection("packWars")
      .where("weekKey", "==", weekKey)
      .where("status", "==", "active")
      .get();

    for (const warDoc of packWarsSnap.docs) {
      const data = warDoc.data();
      const pack1Xp = data.pack1Xp ?? 0;
      const pack2Xp = data.pack2Xp ?? 0;

      const winnerId =
        pack1Xp > pack2Xp
          ? data.pack1Id
          : pack2Xp > pack1Xp
          ? data.pack2Id
          : null;

      await warDoc.ref.update({
        status: "completed",
        winnerId,
      });

      functions.logger.info(
        `Pack war ${warDoc.id}: winner=${winnerId ?? "tie"}`
      );
    }

    // ── Mark Escaped Bosses ──────────────────────────────────────────────

    const activeBossesSnap = await db
      .collection("packBosses")
      .where("weekKey", "==", weekKey)
      .where("status", "==", "active")
      .get();

    for (const bossDoc of activeBossesSnap.docs) {
      await bossDoc.ref.update({ status: "escaped" });
      functions.logger.info(`Boss ${bossDoc.id}: escaped`);
    }

    functions.logger.info(`Week-end processing complete for ${weekKey}`);
    return null;
  });
