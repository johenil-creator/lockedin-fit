/**
 * processWeekEnd — Cloud Function for LockedInFIT league week-end processing.
 *
 * DEPLOYMENT SETUP:
 * 1. Run `firebase init functions` in the project root
 * 2. Install deps: cd functions && npm install firebase-admin firebase-functions
 * 3. Deploy: firebase deploy --only functions
 *
 * This replaces the client-side processWeekEnd() in lib/leagueService.ts.
 * It runs weekly and has admin access to Firestore (bypasses security rules).
 */

// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
//
// admin.initializeApp();
// const db = admin.firestore();
//
// const RANK_LADDER = ["Runt", "Scout", "Stalker", "Hunter", "Sentinel", "Alpha", "Apex"] as const;
// type RankLevel = (typeof RANK_LADDER)[number];
//
// function getNextRank(rank: string): RankLevel | null {
//   const idx = RANK_LADDER.indexOf(rank as RankLevel);
//   return idx >= 0 && idx < RANK_LADDER.length - 1 ? RANK_LADDER[idx + 1] : null;
// }
//
// function getPreviousRank(rank: string): RankLevel | null {
//   const idx = RANK_LADDER.indexOf(rank as RankLevel);
//   return idx > 0 ? RANK_LADDER[idx - 1] : null;
// }
//
// function getLastWeekKey(): string {
//   const now = new Date();
//   const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
//   const jan1 = new Date(oneWeekAgo.getFullYear(), 0, 1);
//   const dayOfYear = Math.floor((oneWeekAgo.getTime() - jan1.getTime()) / 86400000) + 1;
//   const weekNumber = Math.ceil((dayOfYear + jan1.getDay()) / 7);
//   return `${oneWeekAgo.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
// }
//
// export const processWeekEnd = functions.pubsub
//   .schedule("every monday 00:00")
//   .timeZone("UTC")
//   .onRun(async () => {
//     const weekKey = getLastWeekKey();
//     functions.logger.info(`Processing week-end for ${weekKey}`);
//
//     const leaguesSnap = await db.collection("leagues").where("weekKey", "==", weekKey).get();
//     if (leaguesSnap.empty) return null;
//
//     for (const leagueDoc of leaguesSnap.docs) {
//       const tier = leagueDoc.data().tier;
//       const membersSnap = await db.collection("leagueMembers").where("leagueId", "==", leagueDoc.id).get();
//       if (membersSnap.empty) continue;
//
//       const userIds = membersSnap.docs.map((d) => d.data().userId as string);
//       const xpMap = new Map<string, number>();
//
//       if (userIds.length > 0) {
//         const xpSnap = await db.collection("weeklyXp")
//           .where("userId", "in", userIds)
//           .where("weekKey", "==", weekKey)
//           .get();
//         for (const d of xpSnap.docs) xpMap.set(d.data().userId, d.data().xpEarned);
//       }
//
//       const sorted = userIds
//         .map((uid) => ({ userId: uid, xp: xpMap.get(uid) ?? 0 }))
//         .sort((a, b) => b.xp - a.xp);
//
//       const total = sorted.length;
//       const batch = db.batch();
//
//       for (let i = 0; i < total; i++) {
//         const { userId, xp } = sorted[i];
//         const result = i < 5 ? "promoted" : i >= total - 5 ? "relegated" : "stayed";
//
//         const memberDoc = membersSnap.docs.find((d) => d.data().userId === userId);
//         if (memberDoc) batch.update(memberDoc.ref, { finalXp: xp, result });
//
//         if (result === "promoted") {
//           const next = getNextRank(tier);
//           if (next) batch.update(db.doc(`users/${userId}`), { rank: next });
//         } else if (result === "relegated") {
//           const prev = getPreviousRank(tier);
//           if (prev) batch.update(db.doc(`users/${userId}`), { rank: prev });
//         }
//       }
//
//       await batch.commit();
//       functions.logger.info(`Processed league ${leagueDoc.id} (${tier}): ${total} members`);
//     }
//
//     return null;
//   });
