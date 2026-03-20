/**
 * processEventEnd
 *
 * Runs daily. Checks for events that have ended and awards rewards.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const processEventEnd = functions.pubsub
  .schedule("every day 00:30")
  .timeZone("UTC")
  .onRun(async () => {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);

    // Find events that ended yesterday
    const eventsSnap = await db
      .collection("events")
      .where("endDate", "==", yesterday)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const data = eventDoc.data();
      const eventId = eventDoc.id;
      const rewards = (data.rewards as number[]) ?? [50, 100, 200];

      // Get all participants
      const participantsSnap = await db
        .collection("eventParticipation")
        .where("eventId", "==", eventId)
        .where("rewardsClaimed", "==", false)
        .get();

      const batch = db.batch();

      for (const partDoc of participantsSnap.docs) {
        const partData = partDoc.data();
        const score = partData.score ?? 0;

        // Tier: Bronze (any participation), Silver (score >= 50), Gold (score >= 100)
        let fangsReward = rewards[0] ?? 50; // Bronze
        if (score >= 100) fangsReward = rewards[2] ?? 200; // Gold
        else if (score >= 50) fangsReward = rewards[1] ?? 100; // Silver

        // Award fangs
        const userRef = db.doc(`users/${partData.userId}`);
        batch.update(userRef, {
          fangs: admin.firestore.FieldValue.increment(fangsReward),
        });

        // Mark rewards claimed
        batch.update(partDoc.ref, { rewardsClaimed: true });
      }

      await batch.commit();
      functions.logger.info(
        `Processed event end for ${eventId}: ${participantsSnap.size} participants rewarded`
      );
    }

    return null;
  });
