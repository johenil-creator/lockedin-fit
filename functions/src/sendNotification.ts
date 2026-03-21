/**
 * sendNotification
 *
 * Callable function + Firestore triggers that create in-app notifications
 * in `inAppNotifications/{userId}/items/{notifId}`.
 *
 * Trigger sources:
 * - friendChallenges: on create → notify opponent
 * - cosmeticGifts: on create → notify recipient
 * - packChallenges: on status change to 'completed' → notify all pack members
 *
 * Also exports a callable `sendNotification` for custom notifications with:
 * - Authentication check
 * - Relationship verification (caller must be friend, packmate, or co-participant)
 * - Rate limiting (max 10 notifications per user per hour)
 * - Content validation (predefined types only, sanitized content)
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ── Allowed notification types ──────────────────────────────────────────────

type NotificationType =
  | "friend_workout"
  | "challenge_received"
  | "challenge_update"
  | "gift_received"
  | "pack_challenge_complete"
  | "quest_expiring"
  | "nudge_received"
  | "streak_battle_lost"
  | "milestone_friend"
  | "comment_received";

const VALID_NOTIFICATION_TYPES = new Set<NotificationType>([
  "friend_workout",
  "challenge_received",
  "challenge_update",
  "gift_received",
  "pack_challenge_complete",
  "quest_expiring",
  "nudge_received",
  "streak_battle_lost",
  "milestone_friend",
  "comment_received",
]);

// ── Content constraints ─────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 300;
const MAX_EXTRA_DATA_KEYS = 5;
const MAX_EXTRA_DATA_VALUE_LENGTH = 200;

// ── Rate limiting ───────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check and increment the caller's rate limit counter.
 * Returns true if the caller is within limits, false if they should be blocked.
 * Uses Firestore document `rateLimits/notifications:{callerId}`.
 */
async function checkRateLimit(callerId: string): Promise<boolean> {
  const rateLimitRef = db.doc(`rateLimits/notifications:${callerId}`);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(rateLimitRef);
    const data = doc.data();

    if (!data || now - (data.windowStart ?? 0) > RATE_LIMIT_WINDOW_MS) {
      // No record or window expired — start a new window
      tx.set(rateLimitRef, { count: 1, windowStart: now });
      return true;
    }

    if (data.count >= RATE_LIMIT_MAX) {
      return false;
    }

    tx.update(rateLimitRef, {
      count: admin.firestore.FieldValue.increment(1),
    });
    return true;
  });
}

// ── Relationship verification ───────────────────────────────────────────────

/**
 * Verify that the caller has a legitimate relationship with the target user.
 * At least one of the following must be true:
 * 1. They are friends (friendships collection)
 * 2. They are in the same pack (packMembers collection)
 * 3. They are participants in the same active challenge or battle
 */
async function verifyRelationship(
  callerId: string,
  targetUserId: string
): Promise<boolean> {
  // Check friendships (either direction)
  const [friendshipA, friendshipB] = await Promise.all([
    db
      .collection("friendships")
      .where("userId", "==", callerId)
      .where("friendId", "==", targetUserId)
      .limit(1)
      .get(),
    db
      .collection("friendships")
      .where("userId", "==", targetUserId)
      .where("friendId", "==", callerId)
      .limit(1)
      .get(),
  ]);

  if (!friendshipA.empty || !friendshipB.empty) {
    return true;
  }

  // Check if they are in the same pack
  const callerPackMembership = await db
    .collection("packMembers")
    .where("userId", "==", callerId)
    .limit(1)
    .get();

  if (!callerPackMembership.empty) {
    const callerPackId = callerPackMembership.docs[0].data().packId as string;
    const targetInSamePack = await db
      .collection("packMembers")
      .where("userId", "==", targetUserId)
      .where("packId", "==", callerPackId)
      .limit(1)
      .get();

    if (!targetInSamePack.empty) {
      return true;
    }
  }

  // Check if they share an active friend challenge
  const [challengeAsChallenger, challengeAsOpponent] = await Promise.all([
    db
      .collection("friendChallenges")
      .where("challengerId", "==", callerId)
      .where("opponentId", "==", targetUserId)
      .where("status", "==", "active")
      .limit(1)
      .get(),
    db
      .collection("friendChallenges")
      .where("challengerId", "==", targetUserId)
      .where("opponentId", "==", callerId)
      .where("status", "==", "active")
      .limit(1)
      .get(),
  ]);

  if (!challengeAsChallenger.empty || !challengeAsOpponent.empty) {
    return true;
  }

  // Check if they share an active streak battle
  const [battleAsP1, battleAsP2] = await Promise.all([
    db
      .collection("streakBattles")
      .where("player1Id", "==", callerId)
      .where("player2Id", "==", targetUserId)
      .where("status", "==", "active")
      .limit(1)
      .get(),
    db
      .collection("streakBattles")
      .where("player1Id", "==", targetUserId)
      .where("player2Id", "==", callerId)
      .where("status", "==", "active")
      .limit(1)
      .get(),
  ]);

  if (!battleAsP1.empty || !battleAsP2.empty) {
    return true;
  }

  return false;
}

// ── Content sanitization ────────────────────────────────────────────────────

function sanitizeString(input: unknown, maxLength: number): string | null {
  if (typeof input !== "string") return null;
  // Strip control characters, trim whitespace
  const cleaned = input.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, maxLength);
}

function validateExtraData(
  data: unknown
): Record<string, string> | null {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object" || Array.isArray(data)) return null;

  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length > MAX_EXTRA_DATA_KEYS) return null;

  const sanitized: Record<string, string> = {};
  for (const key of keys) {
    const sanitizedKey = sanitizeString(key, 50);
    const sanitizedValue = sanitizeString(record[key], MAX_EXTRA_DATA_VALUE_LENGTH);
    if (!sanitizedKey || !sanitizedValue) continue;
    sanitized[sanitizedKey] = sanitizedValue;
  }

  return sanitized;
}

// ── Helper: create notification document ────────────────────────────────────

async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await db.collection(`inAppNotifications/${userId}/items`).add({
    type,
    title,
    body,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    data: data ?? null,
  });
}

// ── Trigger: Friend Challenge Created ───────────────────────────────────────

export const onFriendChallengeCreated = functions.firestore
  .document("friendChallenges/{challengeId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const opponentId = data.opponentId as string;
    const challengerName = data.challengerName as string;
    const metric = data.metric as string;

    await createNotification(
      opponentId,
      "challenge_received",
      "New Challenge!",
      `${challengerName} challenged you to a ${metric} battle this week!`,
      { challengeId: snap.id }
    );

    functions.logger.info(
      `Notified ${opponentId} about challenge from ${challengerName}`
    );
  });

// ── Trigger: Friend Challenge Completed ─────────────────────────────────────

export const onFriendChallengeCompleted = functions.firestore
  .document("friendChallenges/{challengeId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status || after.status !== "completed") return;

    const winnerId = after.winnerId as string | null;
    const challengerId = after.challengerId as string;
    const opponentId = after.opponentId as string;
    const challengerName = after.challengerName as string;
    const opponentName = after.opponentName as string;

    if (winnerId) {
      const loserId = winnerId === challengerId ? opponentId : challengerId;
      const winnerName = winnerId === challengerId ? challengerName : opponentName;

      await createNotification(
        winnerId,
        "challenge_update",
        "You Won!",
        `You beat your opponent in the ${after.metric} challenge!`,
        { challengeId: change.after.id }
      );

      await createNotification(
        loserId,
        "challenge_update",
        "Challenge Complete",
        `${winnerName} won the ${after.metric} challenge. Better luck next time!`,
        { challengeId: change.after.id }
      );
    } else {
      // Tie
      for (const uid of [challengerId, opponentId]) {
        await createNotification(
          uid,
          "challenge_update",
          "It's a Tie!",
          `Your ${after.metric} challenge ended in a draw!`,
          { challengeId: change.after.id }
        );
      }
    }
  });

// ── Trigger: Cosmetic Gift Sent ─────────────────────────────────────────────

export const onGiftCreated = functions.firestore
  .document("cosmeticGifts/{giftId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const toUserId = data.toUserId as string;
    const fromName = data.fromDisplayName as string;

    await createNotification(
      toUserId,
      "gift_received",
      "You Got a Gift!",
      `${fromName} sent you a cosmetic item!`,
      { giftId: snap.id }
    );

    functions.logger.info(`Notified ${toUserId} about gift from ${fromName}`);
  });

// ── Trigger: Pack Challenge Completed ───────────────────────────────────────

export const onPackChallengeCompleted = functions.firestore
  .document("packChallenges/{challengeId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status || after.status !== "completed") return;

    const packId = after.packId as string;
    const challengeType = after.type as string;
    const target = after.target as number;

    // Get all pack members
    const membersSnap = await db
      .collection("packMembers")
      .where("packId", "==", packId)
      .get();

    const batch = db.batch();
    for (const memberDoc of membersSnap.docs) {
      const memberId = memberDoc.data().userId as string;
      const notifRef = db
        .collection(`inAppNotifications/${memberId}/items`)
        .doc();
      batch.set(notifRef, {
        type: "pack_challenge_complete",
        title: "Pack Challenge Complete!",
        body: `Your pack hit the ${challengeType} goal of ${target}!`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        data: { packId, challengeId: change.after.id },
      });
    }

    await batch.commit();
    functions.logger.info(
      `Notified ${membersSnap.size} members about pack challenge completion`
    );
  });

// ── Trigger: Nudge Sent ───────────────────────────────────────────────────

export const onNudgeSent = functions.firestore
  .document("nudges/{nudgeId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const toUserId = data.toUserId as string;
    const fromName = data.fromDisplayName as string;

    await createNotification(
      toUserId,
      "nudge_received",
      "You Got Nudged!",
      `${fromName} is checking in — time to work out!`
    );

    functions.logger.info(`Nudge notification sent to ${toUserId}`);
  });

// ── Trigger: Streak Battle Loss ────────────────────────────────────────────

export const onStreakBattleCompleted = functions.firestore
  .document("streakBattles/{battleId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status || after.status !== "completed") return;

    const winnerId = after.winnerId as string | null;
    if (!winnerId) return;

    const loserId =
      winnerId === after.player1Id ? after.player2Id : after.player1Id;
    const winnerName =
      winnerId === after.player1Id ? after.player1Name : after.player2Name;

    await createNotification(
      loserId as string,
      "streak_battle_lost",
      "Streak Battle Over",
      `${winnerName} won the streak battle! Keep pushing.`
    );
  });

// ── Trigger: Milestone Achieved (notify friends) ──────────────────────────

export const onMilestoneActivity = functions.firestore
  .document("activityFeed/{activityId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    if (data.type !== "milestone") return;

    const userId = data.userId as string;
    const displayName = data.displayName as string;

    // Get user's friends
    const userDoc = await db.doc(`users/${userId}`).get();
    const friends = (userDoc.data()?.friends ?? []) as Array<{ code: string }>;

    // Notify each friend (limit batch to 20)
    const friendIds = friends.slice(0, 20).map((f) => f.code);
    for (const friendId of friendIds) {
      await createNotification(
        friendId,
        "milestone_friend",
        "Friend Milestone!",
        `${displayName} achieved ${data.payload?.milestoneLabel ?? "a milestone"}!`
      );
    }
  });

// ── Trigger: Comment Posted ────────────────────────────────────────────────

export const onCommentPosted = functions.firestore
  .document("activityFeed/{activityId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const activityId = context.params.activityId;
    const commentData = snap.data();
    const commenterName = commentData.displayName as string;

    // Get the activity owner
    const activityDoc = await db.doc(`activityFeed/${activityId}`).get();
    if (!activityDoc.exists) return;

    const activityOwnerId = activityDoc.data()?.userId as string;
    const commenterId = commentData.userId as string;

    // Don't notify self-comments
    if (activityOwnerId === commenterId) return;

    await createNotification(
      activityOwnerId,
      "comment_received",
      "New Comment",
      `${commenterName} commented on your activity`
    );
  });

// ── Callable: Custom Notification (authorized + rate-limited) ───────────────

export const sendNotification = functions.https.onCall(
  async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const callerId = context.auth.uid;

    // 2. Parse and validate input
    const { userId, type, title, body, extraData } = data as {
      userId: string;
      type: string;
      title: string;
      body: string;
      extraData?: Record<string, string>;
    };

    if (!userId || !type || !title || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "userId, type, title, and body are required"
      );
    }

    // 3. Validate notification type is in the allowed set
    if (!VALID_NOTIFICATION_TYPES.has(type as NotificationType)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid notification type: "${type}". Must be one of: ${[...VALID_NOTIFICATION_TYPES].join(", ")}`
      );
    }

    // 4. Prevent self-notifications
    if (callerId === userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cannot send a notification to yourself"
      );
    }

    // 5. Sanitize content
    const sanitizedTitle = sanitizeString(title, MAX_TITLE_LENGTH);
    const sanitizedBody = sanitizeString(body, MAX_BODY_LENGTH);

    if (!sanitizedTitle || !sanitizedBody) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Title and body must be non-empty strings"
      );
    }

    const sanitizedExtraData = validateExtraData(extraData);

    // 6. Verify the target user exists
    const targetUserDoc = await db.doc(`users/${userId}`).get();
    if (!targetUserDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Target user does not exist"
      );
    }

    // 7. Verify caller has a legitimate relationship with target user
    const hasRelationship = await verifyRelationship(callerId, userId);
    if (!hasRelationship) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have a relationship with this user (must be friends, packmates, or co-participants in a challenge/battle)"
      );
    }

    // 8. Rate limiting — max 10 notifications per user per hour
    const withinLimit = await checkRateLimit(callerId);
    if (!withinLimit) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. You can send a maximum of 10 notifications per hour."
      );
    }

    // 9. Create the notification
    await createNotification(
      userId,
      type as NotificationType,
      sanitizedTitle,
      sanitizedBody,
      sanitizedExtraData ?? undefined
    );

    functions.logger.info(
      `Notification sent: ${callerId} → ${userId} (type: ${type})`
    );

    return { success: true };
  }
);
