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
 * Also exports a callable `sendNotificationCallable` for custom notifications.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

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

// ── Callable: Custom Notification ───────────────────────────────────────────

export const sendNotification = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const { userId, type, title, body, extraData } = data as {
      userId: string;
      type: NotificationType;
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

    await createNotification(userId, type, title, body, extraData);
    return { success: true };
  }
);
