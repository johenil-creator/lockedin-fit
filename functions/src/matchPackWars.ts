/**
 * matchPackWars
 *
 * Scheduled Monday 01:00 UTC. Matches packs requesting wars
 * by similar size + average rank.
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

export const matchPackWars = functions.pubsub
  .schedule("every monday 01:00")
  .timeZone("UTC")
  .onRun(async () => {
    const weekKey = getCurrentWeekKey();
    functions.logger.info(`Matching pack wars for ${weekKey}`);

    // Find all packs requesting wars (status = matchmaking)
    const matchmakingSnap = await db
      .collection("packWars")
      .where("status", "==", "matchmaking")
      .get();

    if (matchmakingSnap.empty) {
      functions.logger.info("No packs in matchmaking queue");
      return null;
    }

    const queue = matchmakingSnap.docs.map((d) => ({
      docId: d.id,
      packId: d.data().pack1Id as string,
      packName: d.data().pack1Name as string,
      memberCount: (d.data().memberCount as number) ?? 5,
    }));

    // Sort by member count for approximate matching
    queue.sort((a, b) => a.memberCount - b.memberCount);

    const matched = new Set<string>();
    const batch = db.batch();

    for (let i = 0; i < queue.length - 1; i += 2) {
      const a = queue[i];
      const b = queue[i + 1];
      if (matched.has(a.docId) || matched.has(b.docId)) continue;

      // Update pack A's war doc to include pack B
      batch.update(db.doc(`packWars/${a.docId}`), {
        pack2Id: b.packId,
        pack2Name: b.packName,
        pack2Xp: 0,
        weekKey,
        status: "active",
      });

      // Delete pack B's standalone matchmaking doc
      batch.delete(db.doc(`packWars/${b.docId}`));

      matched.add(a.docId);
      matched.add(b.docId);

      functions.logger.info(
        `Matched: ${a.packName} vs ${b.packName}`
      );
    }

    await batch.commit();
    functions.logger.info(
      `Pack war matching complete: ${matched.size / 2} matches`
    );
    return null;
  });
