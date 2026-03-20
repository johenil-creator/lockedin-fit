import { postActivity } from "./activityService";

/**
 * Create a user post in the activity feed.
 * Text is limited to 280 characters.
 */
export async function createPost(
  userId: string,
  displayName: string,
  text: string
): Promise<void> {
  if (!text || text.length > 280) return;

  if (__DEV__) console.log("[createPost]", { userId, displayName, text: text.slice(0, 40) });
  await postActivity(userId, displayName, "user_post", { text });
  if (__DEV__) console.log("[createPost] done");
}
