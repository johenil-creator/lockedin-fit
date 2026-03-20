/**
 * buildEventLeaderboard
 *
 * Runs daily during active events. Builds top-100 event leaderboard.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const buildEventLeaderboard = functions.pubsub
  .schedule("every day 06:00")
  .timeZone("UTC")
  .onRun(async () => {
    const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find active events (startDate <= now <= endDate)
    const eventsSnap = await db
      .collection("events")
      .where("startDate", "<=", now)
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const data = eventDoc.data();
      if (data.endDate < now) continue; // Already ended

      const eventId = eventDoc.id;

      // Get top 100 participants by score
      const participantsSnap = await db
        .collection("eventParticipation")
        .where("eventId", "==", eventId)
        .orderBy("score", "desc")
        .limit(100)
        .get();

      const entries = participantsSnap.docs.map((d, i) => ({
        userId: d.data().userId,
        displayName: d.data().displayName ?? "Unknown",
        rank: i + 1,
        score: d.data().score ?? 0,
      }));

      // Write leaderboard cache
      await db.doc(`eventLeaderboards/${eventId}`).set({
        eventId,
        entries,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `Built event leaderboard for ${eventId}: ${entries.length} entries`
      );
    }

    return null;
  });
