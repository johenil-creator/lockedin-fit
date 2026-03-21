/**
 * deleteUserData
 *
 * Callable Cloud Function that deletes or anonymizes ALL user data across
 * every Firestore collection to comply with GDPR Art. 17 (right to erasure).
 *
 * Strategy per collection:
 *   - Owned data (profile, posts, activity, reactions): DELETE
 *   - Shared/collaborative data (pack chat messages): ANONYMIZE
 *   - Competitive data (battles, challenges): mark user as WITHDRAWN
 *   - Membership data (pack members, league members): DELETE
 *   - Leaderboard entries: REMOVE
 *
 * Uses batched writes (max 500 ops per batch) for efficiency.
 * Errors in one collection do not block others -- logged and continued.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const BATCH_LIMIT = 450; // stay under Firestore's 500-op batch limit
const ANON_NAME = "Deleted User";

type DeletionResult = {
  collection: string;
  deleted: number;
  anonymized: number;
  error?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

async function commitBatch(batch: FirebaseFirestore.WriteBatch, ops: number): Promise<void> {
  if (ops > 0) await batch.commit();
}

/**
 * Query + delete all docs matching a field == value.
 * Returns count of deleted docs.
 */
async function deleteByField(
  collectionPath: string,
  field: string,
  value: string,
  audit: DeletionResult
): Promise<void> {
  try {
    const snap = await db.collection(collectionPath).where(field, "==", value).get();
    if (snap.empty) return;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      audit.deleted++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
}

/**
 * Query + anonymize all docs matching a field == value.
 * Replaces displayName with "Deleted User" and clears the userId field.
 */
async function anonymizeByField(
  collectionPath: string,
  field: string,
  value: string,
  audit: DeletionResult,
  updates: Record<string, any> = {}
): Promise<void> {
  try {
    const snap = await db.collection(collectionPath).where(field, "==", value).get();
    if (snap.empty) return;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        displayName: ANON_NAME,
        [field]: `deleted_${value.slice(0, 8)}`,
        ...updates,
      });
      ops++;
      audit.anonymized++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
}

/**
 * Mark competitive docs (battles/challenges) where user is a participant as withdrawn.
 */
async function withdrawFromCompetition(
  collectionPath: string,
  field: string,
  value: string,
  nameField: string,
  audit: DeletionResult
): Promise<void> {
  try {
    const snap = await db.collection(collectionPath).where(field, "==", value).get();
    if (snap.empty) return;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        [field]: `deleted_${value.slice(0, 8)}`,
        [nameField]: ANON_NAME,
        status: "withdrawn",
      });
      ops++;
      audit.anonymized++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
}

// ── Per-collection deletion routines ────────────────────────────────────────

async function deleteUserProfile(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "users", deleted: 0, anonymized: 0 };
  try {
    const ref = db.doc(`users/${userId}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      audit.deleted = 1;
    }
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deletePublicProfile(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "publicProfiles", deleted: 0, anonymized: 0 };
  try {
    const ref = db.doc(`publicProfiles/${userId}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      audit.deleted = 1;
    }
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteWeeklyXp(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "weeklyXp", deleted: 0, anonymized: 0 };
  await deleteByField("weeklyXp", "userId", userId, audit);
  return audit;
}

async function deleteFriendships(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "friendships", deleted: 0, anonymized: 0 };
  await deleteByField("friendships", "userId", userId, audit);
  await deleteByField("friendships", "friendId", userId, audit);
  return audit;
}

async function deleteLeagueMemberships(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "leagueMembers", deleted: 0, anonymized: 0 };
  await deleteByField("leagueMembers", "userId", userId, audit);
  return audit;
}

async function deletePackMemberships(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packMembers", deleted: 0, anonymized: 0 };
  try {
    // packMembers docs are keyed as `{packId}__{userId}`
    const snap = await db.collection("packMembers").where("userId", "==", userId).get();
    if (snap.empty) return audit;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      audit.deleted++;
    }
    await batch.commit();
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteAccountabilityPartners(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "accountabilityPartners", deleted: 0, anonymized: 0 };
  try {
    const ref = db.doc(`accountabilityPartners/${userId}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      audit.deleted = 1;
    }
    // Also remove from partner's doc
    await deleteByField("accountabilityPartners", "partnerId", userId, audit);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteFangs(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "fangs", deleted: 0, anonymized: 0 };
  try {
    const ref = db.doc(`fangs/${userId}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      audit.deleted = 1;
    }
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteNotifications(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "inAppNotifications", deleted: 0, anonymized: 0 };
  try {
    const itemsSnap = await db.collection(`inAppNotifications/${userId}/items`).get();
    if (itemsSnap.empty) return audit;

    let batch = db.batch();
    let ops = 0;

    for (const doc of itemsSnap.docs) {
      batch.delete(doc.ref);
      ops++;
      audit.deleted++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);

    // Delete the parent document if it exists
    const parentRef = db.doc(`inAppNotifications/${userId}`);
    const parentSnap = await parentRef.get();
    if (parentSnap.exists) {
      await parentRef.delete();
      audit.deleted++;
    }
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteActivityFeed(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "activityFeed", deleted: 0, anonymized: 0 };
  try {
    const snap = await db.collection("activityFeed").where("userId", "==", userId).get();
    if (snap.empty) return audit;

    let batch = db.batch();
    let ops = 0;

    for (const actDoc of snap.docs) {
      // Delete subcollection comments first
      const commentsSnap = await db.collection(`activityFeed/${actDoc.id}/comments`).get();
      for (const commentDoc of commentsSnap.docs) {
        batch.delete(commentDoc.ref);
        ops++;
        audit.deleted++;

        if (ops >= BATCH_LIMIT) {
          await commitBatch(batch, ops);
          batch = db.batch();
          ops = 0;
        }
      }

      // Delete the activity doc itself
      batch.delete(actDoc.ref);
      ops++;
      audit.deleted++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteOrAnonymizeComments(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "activityFeed/*/comments", deleted: 0, anonymized: 0 };
  try {
    // Use collectionGroup to find comments by this user across all activity items
    const snap = await db.collectionGroup("comments").where("userId", "==", userId).get();
    if (snap.empty) return audit;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      audit.deleted++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deleteReactions(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "reactions", deleted: 0, anonymized: 0 };
  await deleteByField("reactions", "userId", userId, audit);
  return audit;
}

async function deleteGifts(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "cosmeticGifts", deleted: 0, anonymized: 0 };
  // Delete gifts sent by user
  await deleteByField("cosmeticGifts", "fromUserId", userId, audit);
  // Delete unclaimed gifts received by user
  await deleteByField("cosmeticGifts", "toUserId", userId, audit);
  return audit;
}

async function deleteEventParticipation(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "eventParticipation", deleted: 0, anonymized: 0 };
  await deleteByField("eventParticipation", "userId", userId, audit);
  return audit;
}

async function deletePackLeaderboard(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packLeaderboard", deleted: 0, anonymized: 0 };
  await deleteByField("packLeaderboard", "userId", userId, audit);
  return audit;
}

async function anonymizePackChatMessages(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packMessages/*/messages", deleted: 0, anonymized: 0 };
  try {
    // Use collectionGroup to find all messages by this user across all pack chats
    const snap = await db.collectionGroup("messages").where("userId", "==", userId).get();
    if (snap.empty) return audit;

    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        userId: `deleted_${userId.slice(0, 8)}`,
        displayName: ANON_NAME,
      });
      ops++;
      audit.anonymized++;

      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function handleStreakBattles(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "streakBattles", deleted: 0, anonymized: 0 };

  // Player 1
  await withdrawFromCompetition("streakBattles", "player1Id", userId, "player1Name", audit);
  // Player 2
  await withdrawFromCompetition("streakBattles", "player2Id", userId, "player2Name", audit);

  return audit;
}

async function handleFriendChallenges(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "friendChallenges", deleted: 0, anonymized: 0 };

  // As challenger
  await withdrawFromCompetition("friendChallenges", "challengerId", userId, "challengerName", audit);
  // As opponent
  await withdrawFromCompetition("friendChallenges", "opponentId", userId, "opponentName", audit);

  return audit;
}

async function handlePackChallenges(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packChallenges", deleted: 0, anonymized: 0 };
  // Delete challenges created by this user
  await deleteByField("packChallenges", "createdBy", userId, audit);
  return audit;
}

async function removeFromGlobalLeaderboard(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "globalLeaderboard", deleted: 0, anonymized: 0 };
  try {
    // Global leaderboard docs contain an entries array -- filter user out
    const snap = await db.collection("globalLeaderboard").get();
    if (snap.empty) return audit;

    const batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.entries && Array.isArray(data.entries)) {
        const filtered = data.entries.filter((e: any) => e.userId !== userId);
        if (filtered.length !== data.entries.length) {
          batch.update(doc.ref, { entries: filtered });
          ops++;
          audit.deleted++;
        }
      }
    }

    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deletePackBossContributions(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packBosses/*/contributions", deleted: 0, anonymized: 0 };
  try {
    // Use collectionGroup to find contributions by this user across all bosses
    const snap = await db.collectionGroup("contributions").where("userId", "==", userId).get();
    if (snap.empty) {
      // Contributions are keyed by userId, try direct doc lookup via parent listing
      // The doc ID is the userId itself in packBosses/{bossId}/contributions/{userId}
      const bossesSnap = await db.collection("packBosses").get();
      let batch = db.batch();
      let ops = 0;
      for (const bossDoc of bossesSnap.docs) {
        const contribRef = db.doc(`packBosses/${bossDoc.id}/contributions/${userId}`);
        const contribSnap = await contribRef.get();
        if (contribSnap.exists) {
          batch.delete(contribRef);
          ops++;
          audit.deleted++;
        }
        if (ops >= BATCH_LIMIT) {
          await commitBatch(batch, ops);
          batch = db.batch();
          ops = 0;
        }
      }
      await commitBatch(batch, ops);
      return audit;
    }

    let batch = db.batch();
    let ops = 0;
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      audit.deleted++;
      if (ops >= BATCH_LIMIT) {
        await commitBatch(batch, ops);
        batch = db.batch();
        ops = 0;
      }
    }
    await commitBatch(batch, ops);
  } catch (e: any) {
    audit.error = e?.message ?? String(e);
  }
  return audit;
}

async function deletePackWars(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "packWars", deleted: 0, anonymized: 0 };
  // Pack wars are per-pack, not per-user, so we don't delete them.
  // The user's pack membership removal handles disassociation.
  audit.deleted = 0;
  return audit;
}

// ── Delete Firebase Auth user (Admin SDK) ───────────────────────────────────

async function deleteAuthUser(userId: string): Promise<DeletionResult> {
  const audit: DeletionResult = { collection: "auth", deleted: 0, anonymized: 0 };
  try {
    await admin.auth().deleteUser(userId);
    audit.deleted = 1;
  } catch (e: any) {
    // auth/user-not-found is OK (already deleted client-side or doesn't exist)
    if (e?.code !== "auth/user-not-found") {
      audit.error = e?.message ?? String(e);
    }
  }
  return audit;
}

// ── Main Function ───────────────────────────────────────────────────────────

export const deleteUserData = functions
  .runWith({ timeoutSeconds: 120, memory: "256MB" })
  .https.onCall(async (data, context) => {
    // Auth check: user can only delete their own data
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to delete account."
      );
    }

    const userId = context.auth.uid;
    functions.logger.info(`[deleteUserData] Starting deletion for user: ${userId}`);

    const results: DeletionResult[] = [];

    // Run all collection cleanups -- each handles its own errors so one failure
    // does not prevent the others from completing.
    const tasks: Promise<DeletionResult>[] = [
      // Direct user data
      deleteUserProfile(userId),
      deletePublicProfile(userId),
      deleteWeeklyXp(userId),
      deleteFriendships(userId),
      deleteLeagueMemberships(userId),
      deletePackMemberships(userId),
      deleteAccountabilityPartners(userId),
      deleteFangs(userId),
      deleteNotifications(userId),
      deleteReactions(userId),
      deleteGifts(userId),
      deleteEventParticipation(userId),
      deletePackLeaderboard(userId),
      deletePackBossContributions(userId),

      // User content
      deleteActivityFeed(userId),
      deleteOrAnonymizeComments(userId),
      handlePackChallenges(userId),

      // Shared data -- anonymize instead of delete
      anonymizePackChatMessages(userId),

      // Competitive data -- withdraw
      handleStreakBattles(userId),
      handleFriendChallenges(userId),

      // Leaderboards
      removeFromGlobalLeaderboard(userId),
    ];

    const settled = await Promise.allSettled(tasks);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          collection: "unknown",
          deleted: 0,
          anonymized: 0,
          error: result.reason?.message ?? String(result.reason),
        });
      }
    }

    // Delete Firebase Auth user last (server-side ensures it happens even if client fails)
    const authResult = await deleteAuthUser(userId);
    results.push(authResult);

    // Audit log
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    const totalAnonymized = results.reduce((sum, r) => sum + r.anonymized, 0);
    const errors = results.filter((r) => r.error);

    functions.logger.info(`[deleteUserData] Completed for ${userId}`, {
      totalDeleted,
      totalAnonymized,
      errorCount: errors.length,
      results,
    });

    if (errors.length > 0) {
      functions.logger.warn(`[deleteUserData] Errors during deletion for ${userId}:`, errors);
    }

    return {
      success: true,
      totalDeleted,
      totalAnonymized,
      errors: errors.map((e) => ({ collection: e.collection, error: e.error })),
    };
  });
