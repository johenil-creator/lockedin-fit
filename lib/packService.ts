import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { savePackInfo, clearPackInfo, loadPackInfo } from "./storage";
import { currentWeekKey } from "./packUtils";
import type { PackInfo, PackMember, PackRole, RankLevel } from "./types";

const PACK_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PACK_SIZE = 10;

function generatePackCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += PACK_CODE_CHARS[Math.floor(Math.random() * PACK_CODE_CHARS.length)];
  }
  return code;
}

/**
 * Create a new pack.
 */
export async function createPack(
  userId: string,
  displayName: string,
  name: string,
  motto = ""
): Promise<PackInfo | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const code = generatePackCode();
    const weekKey = currentWeekKey();

    const packRef = await addDoc(collection(db, "packs"), {
      name,
      code,
      motto,
      createdBy: userId,
      memberCount: 1,
      weeklyXp: 0,
      weekKey,
      createdAt: serverTimestamp(),
    });

    // Add creator as leader
    await setDoc(doc(db, "packMembers", `${packRef.id}__${userId}`), {
      packId: packRef.id,
      userId,
      displayName,
      role: "leader" as PackRole,
      joinedAt: serverTimestamp(),
    });

    // Update user doc (use setDoc with merge in case doc doesn't exist yet)
    await setDoc(doc(db, "users", userId), { packId: packRef.id }, { merge: true });

    const info: PackInfo = {
      id: packRef.id,
      name,
      code,
      motto,
      memberCount: 1,
      weeklyXp: 0,
      weekKey,
      role: "leader",
      createdBy: userId,
    };

    await savePackInfo(info);
    return info;
  } catch (err) {
    if (__DEV__) console.warn("[packService] createPack failed:", err);
    return null;
  }
}

/**
 * Join a pack by code.
 */
export async function joinPack(
  userId: string,
  displayName: string,
  packCode: string
): Promise<PackInfo | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const packsRef = collection(db, "packs");
    const q = query(packsRef, where("code", "==", packCode.toUpperCase()));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const packDoc = snap.docs[0];
    const packData = packDoc.data();

    if ((packData.memberCount ?? 0) >= MAX_PACK_SIZE) return null;

    // Add member
    await setDoc(doc(db, "packMembers", `${packDoc.id}__${userId}`), {
      packId: packDoc.id,
      userId,
      displayName,
      role: "member" as PackRole,
      joinedAt: serverTimestamp(),
    });

    // Increment member count
    await updateDoc(packDoc.ref, { memberCount: increment(1) });

    // Update user doc (use setDoc with merge in case doc doesn't exist yet)
    await setDoc(doc(db, "users", userId), { packId: packDoc.id }, { merge: true });

    const info: PackInfo = {
      id: packDoc.id,
      name: packData.name,
      code: packData.code,
      motto: packData.motto ?? "",
      memberCount: (packData.memberCount ?? 0) + 1,
      weeklyXp: packData.weeklyXp ?? 0,
      weekKey: packData.weekKey ?? currentWeekKey(),
      role: "member",
      createdBy: packData.createdBy,
    };

    await savePackInfo(info);
    return info;
  } catch (e) {
    if (__DEV__) console.warn("[packService] joinPack failed:", e);
    return null;
  }
}

/**
 * Leave the current pack.
 */
export async function leavePack(userId: string, packId: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    // Remove member doc
    await deleteDoc(doc(db, "packMembers", `${packId}__${userId}`));

    // Decrement member count
    const packRef = doc(db, "packs", packId);
    await updateDoc(packRef, { memberCount: increment(-1) });

    // Clear user's pack reference
    await setDoc(doc(db, "users", userId), { packId: null }, { merge: true });

    await clearPackInfo();
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[packService] leavePack failed:", e);
    return false;
  }
}

/**
 * Get pack detail with members.
 */
export async function getPackDetail(
  packId: string
): Promise<{ pack: PackInfo; members: PackMember[] } | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const packDoc = await getDoc(doc(db, "packs", packId));
    if (!packDoc.exists()) return null;

    const packData = packDoc.data();

    // Fetch members
    const membersRef = collection(db, "packMembers");
    const q = query(membersRef, where("packId", "==", packId));
    const membersSnap = await getDocs(q);

    const memberIds = membersSnap.docs.map((d) => d.data().userId);
    const memberRoles = new Map<string, PackRole>();
    for (const d of membersSnap.docs) {
      memberRoles.set(d.data().userId, d.data().role);
    }

    // Fetch member weekly XP from weeklyXp collection
    const weekKey = currentWeekKey();
    const memberXpMap = new Map<string, number>();
    try {
      for (let i = 0; i < memberIds.length; i += 30) {
        const batch = memberIds.slice(i, i + 30);
        const xpRef = collection(db, "weeklyXp");
        const xpQ = query(
          xpRef,
          where("userId", "in", batch),
          where("weekKey", "==", weekKey)
        );
        const xpSnap = await getDocs(xpQ);
        for (const d of xpSnap.docs) {
          const data = d.data();
          memberXpMap.set(data.userId, data.xpEarned ?? 0);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("[packService] getPackDetail weeklyXp fetch failed:", e);
    }

    // Fetch user profiles for members
    const members: PackMember[] = [];
    for (let i = 0; i < memberIds.length; i += 30) {
      const batch = memberIds.slice(i, i + 30);
      for (const uid of batch) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            members.push({
              userId: uid,
              displayName: userData.displayName ?? "Unknown",
              rank: (userData.rank ?? "Runt") as RankLevel,
              role: memberRoles.get(uid) ?? "member",
              weeklyXp: memberXpMap.get(uid) ?? 0,
              lockeCustomization: userData.lockeCustomization ?? undefined,
            });
          }
        } catch (e) {
          if (__DEV__) console.warn("[packService] getPackDetail member fetch failed:", e);
        }
      }
    }

    const pack: PackInfo = {
      id: packDoc.id,
      name: packData.name,
      code: packData.code,
      motto: packData.motto ?? "",
      memberCount: packData.memberCount ?? members.length,
      weeklyXp: packData.weeklyXp ?? 0,
      weekKey: packData.weekKey ?? currentWeekKey(),
      role: "member", // caller should override based on their own role
      createdBy: packData.createdBy,
    };

    return { pack, members };
  } catch (e) {
    if (__DEV__) console.warn("[packService] getPackDetail failed:", e);
    return null;
  }
}

/**
 * Add XP to the pack's weekly total.
 */
/**
 * Add XP to the pack's weekly total + denormalize to leaderboard.
 */
export async function addPackXP(packId: string, xpAmount: number): Promise<void> {
  if (!isFirebaseConfigured || !packId) return;

  try {
    const packRef = doc(db, "packs", packId);
    await updateDoc(packRef, {
      weeklyXp: increment(xpAmount),
      weekKey: currentWeekKey(),
    });

    // Denormalize to leaderboard (fire-and-forget)
    const packSnap = await getDoc(packRef);
    if (packSnap.exists()) {
      const data = packSnap.data();
      const { updatePackLeaderboardEntry } = await import("./packLeaderboardService");
      updatePackLeaderboardEntry(
        packId,
        data.name,
        data.memberCount ?? 0,
        (data.weeklyXp ?? 0) + xpAmount
      ).catch(() => {});
    }
  } catch (e) {
    if (__DEV__) console.warn("[packService] addPackXP failed:", e);
  }
}

/**
 * Get locally cached pack info.
 */
export async function getCachedPack(): Promise<PackInfo | null> {
  return loadPackInfo();
}
