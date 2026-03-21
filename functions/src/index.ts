/**
 * LockedInFIT Cloud Functions
 *
 * 1. buildGlobalLeaderboard — scheduled weekly, builds top-100 leaderboard
 * 2. syncPublicProfile — Firestore trigger, mirrors user data to publicProfiles
 * 3. sendNotification — callable, creates in-app notifications
 * 4. processWeekEnd — scheduled weekly, handles leagues + streak battles + pack wars + bosses
 * 5. matchPackWars — scheduled Monday 01:00 UTC, matches packs for wars
 * 6. buildEventLeaderboard — daily during active events, top-100 event leaderboard
 * 7. processEventEnd — daily, checks ended events and awards rewards
 * 8. deleteUserData — callable, GDPR Art. 17 compliant full user data erasure
 * 9. exportUserData — callable, GDPR Art. 15 compliant full user data export
 */

export { buildGlobalLeaderboard } from "./buildGlobalLeaderboard";
export { syncPublicProfile } from "./syncPublicProfile";
export { sendNotification } from "./sendNotification";
export { processWeekEnd } from "./processWeekEnd";
export { matchPackWars } from "./matchPackWars";
export { buildEventLeaderboard } from "./buildEventLeaderboard";
export { processEventEnd } from "./processEventEnd";
export { deleteUserData } from "./deleteUserData";
export { exportUserData } from "./exportUserData";
