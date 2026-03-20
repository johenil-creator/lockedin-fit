/**
 * syncPublicProfile
 *
 * Firestore trigger on `users/{userId}` writes. Mirrors relevant fields
 * to `publicProfiles/{userId}` so the client can fetch public profiles
 * without reading the full user document.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const syncPublicProfile = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;

    // Document deleted — remove public profile
    if (!change.after.exists) {
      await db.doc(`publicProfiles/${userId}`).delete();
      functions.logger.info(`Deleted public profile for ${userId}`);
      return null;
    }

    const data = change.after.data()!;

    // Only sync if the user has opted in or if relevant fields changed
    const publicData: Record<string, unknown> = {
      userId,
      displayName: data.displayName ?? data.name ?? "Unknown",
      rank: data.rank ?? "Runt",
      totalXp: data.totalXp ?? 0,
      totalWorkouts: data.totalWorkouts ?? 0,
      streakDays: data.streakDays ?? 0,
      badges: (data.badges ?? []).slice(0, 20), // cap to prevent oversized docs
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Optional fields — only include if present
    if (data.lockeCustomization) {
      publicData.lockeCustomization = data.lockeCustomization;
    }
    if (data.packName) {
      publicData.packName = data.packName;
    }

    await db.doc(`publicProfiles/${userId}`).set(publicData, { merge: true });
    functions.logger.info(`Synced public profile for ${userId}`);

    return null;
  });
