/**
 * exportUserData
 *
 * Callable Cloud Function that exports ALL user data across every Firestore
 * collection for GDPR Art. 15 (right of access / data portability).
 *
 * Returns a structured JSON object with sections for each data type.
 * Uses Promise.allSettled so one failing collection does not block the rest.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ── Helpers ─────────────────────────────────────────────────────────────────

function serializeTimestamp(val: any): string | null {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return null;
}

function serializeDoc(doc: FirebaseFirestore.DocumentSnapshot): Record<string, any> {
  const data = doc.data() ?? {};
  const result: Record<string, any> = { _id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in value) {
      result[key] = serializeTimestamp(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Per-collection export routines ──────────────────────────────────────────

async function exportUserProfile(userId: string): Promise<Record<string, any> | null> {
  const snap = await db.doc(`users/${userId}`).get();
  return snap.exists ? serializeDoc(snap) : null;
}

async function exportPublicProfile(userId: string): Promise<Record<string, any> | null> {
  const snap = await db.doc(`publicProfiles/${userId}`).get();
  return snap.exists ? serializeDoc(snap) : null;
}

async function exportWeeklyXp(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("weeklyXp").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportFriendships(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("friendships").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportLeagueMemberships(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("leagueMembers").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportPackMemberships(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("packMembers").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportPackMessages(userId: string): Promise<Record<string, any>[]> {
  // collectionGroup queries all messages subcollections across packMessages
  const snap = await db.collectionGroup("messages").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportActivityFeed(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("activityFeed").where("userId", "==", userId).get();
  const results: Record<string, any>[] = [];

  for (const actDoc of snap.docs) {
    const activity = serializeDoc(actDoc);

    // Include comments on the user's activity
    const commentsSnap = await db.collection(`activityFeed/${actDoc.id}/comments`).get();
    activity._comments = commentsSnap.docs.map(serializeDoc);

    results.push(activity);
  }

  return results;
}

async function exportUserComments(userId: string): Promise<Record<string, any>[]> {
  // Comments the user posted on other people's activities
  const snap = await db.collectionGroup("comments").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportReactions(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("reactions").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportFriendChallenges(userId: string): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];

  // As challenger
  const q1 = await db.collection("friendChallenges").where("challengerId", "==", userId).get();
  for (const d of q1.docs) results.push(serializeDoc(d));

  // As opponent
  const q2 = await db.collection("friendChallenges").where("opponentId", "==", userId).get();
  for (const d of q2.docs) {
    if (!results.find((r) => r._id === d.id)) {
      results.push(serializeDoc(d));
    }
  }

  return results;
}

async function exportStreakBattles(userId: string): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];

  const q1 = await db.collection("streakBattles").where("player1Id", "==", userId).get();
  for (const d of q1.docs) results.push(serializeDoc(d));

  const q2 = await db.collection("streakBattles").where("player2Id", "==", userId).get();
  for (const d of q2.docs) {
    if (!results.find((r) => r._id === d.id)) {
      results.push(serializeDoc(d));
    }
  }

  return results;
}

async function exportGiftsSent(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("cosmeticGifts").where("fromUserId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportGiftsReceived(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("cosmeticGifts").where("toUserId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportFangs(userId: string): Promise<Record<string, any> | null> {
  const snap = await db.doc(`fangs/${userId}`).get();
  return snap.exists ? serializeDoc(snap) : null;
}

async function exportNotifications(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection(`inAppNotifications/${userId}/items`).get();
  return snap.docs.map(serializeDoc);
}

async function exportAccountabilityPartners(userId: string): Promise<Record<string, any> | null> {
  const snap = await db.doc(`accountabilityPartners/${userId}`).get();
  return snap.exists ? serializeDoc(snap) : null;
}

async function exportPackChallenges(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("packChallenges").where("createdBy", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportEventParticipation(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collection("eventParticipation").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

async function exportPackBossContributions(userId: string): Promise<Record<string, any>[]> {
  const snap = await db.collectionGroup("contributions").where("userId", "==", userId).get();
  return snap.docs.map(serializeDoc);
}

// ── Main Function ───────────────────────────────────────────────────────────

export const exportUserData = functions
  .runWith({ timeoutSeconds: 120, memory: "256MB" })
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in to export data."
      );
    }

    const userId = context.auth.uid;
    functions.logger.info(`[exportUserData] Starting export for user: ${userId}`);

    const sections: Record<string, { label: string; task: () => Promise<any> }> = {
      profile: {
        label: "User Profile",
        task: () => exportUserProfile(userId),
      },
      publicProfile: {
        label: "Public Profile",
        task: () => exportPublicProfile(userId),
      },
      weeklyXp: {
        label: "Weekly XP History",
        task: () => exportWeeklyXp(userId),
      },
      friendships: {
        label: "Friendships",
        task: () => exportFriendships(userId),
      },
      leagueMemberships: {
        label: "League Memberships",
        task: () => exportLeagueMemberships(userId),
      },
      packMemberships: {
        label: "Pack Memberships",
        task: () => exportPackMemberships(userId),
      },
      packMessages: {
        label: "Pack Messages (sent by you)",
        task: () => exportPackMessages(userId),
      },
      activityPosts: {
        label: "Activity Feed Posts",
        task: () => exportActivityFeed(userId),
      },
      comments: {
        label: "Comments (posted by you)",
        task: () => exportUserComments(userId),
      },
      reactions: {
        label: "Reactions",
        task: () => exportReactions(userId),
      },
      friendChallenges: {
        label: "Friend Challenges",
        task: () => exportFriendChallenges(userId),
      },
      streakBattles: {
        label: "Streak Battles",
        task: () => exportStreakBattles(userId),
      },
      giftsSent: {
        label: "Gifts Sent",
        task: () => exportGiftsSent(userId),
      },
      giftsReceived: {
        label: "Gifts Received",
        task: () => exportGiftsReceived(userId),
      },
      fangs: {
        label: "Fangs Balance",
        task: () => exportFangs(userId),
      },
      notifications: {
        label: "Notifications",
        task: () => exportNotifications(userId),
      },
      accountabilityPartners: {
        label: "Accountability Partners",
        task: () => exportAccountabilityPartners(userId),
      },
      packChallenges: {
        label: "Pack Challenges",
        task: () => exportPackChallenges(userId),
      },
      eventParticipation: {
        label: "Event Participation",
        task: () => exportEventParticipation(userId),
      },
      packBossContributions: {
        label: "Pack Boss Contributions",
        task: () => exportPackBossContributions(userId),
      },
    };

    const keys = Object.keys(sections);
    const tasks = keys.map((key) => sections[key].task());
    const settled = await Promise.allSettled(tasks);

    const cloudData: Record<string, any> = {};
    const errors: { section: string; error: string }[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const result = settled[i];
      if (result.status === "fulfilled") {
        cloudData[key] = result.value;
      } else {
        cloudData[key] = null;
        errors.push({
          section: key,
          error: result.reason?.message ?? String(result.reason),
        });
      }
    }

    if (errors.length > 0) {
      functions.logger.warn(`[exportUserData] Partial errors for ${userId}:`, errors);
    }

    functions.logger.info(`[exportUserData] Completed for ${userId}`, {
      sections: keys.length,
      errors: errors.length,
    });

    return {
      exportedAt: new Date().toISOString(),
      userId,
      cloudData,
      errors: errors.length > 0 ? errors : undefined,
    };
  });
