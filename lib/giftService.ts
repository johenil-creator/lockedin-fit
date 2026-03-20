import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import { spendFangs } from "./fangsService";
import { loadOwnedCosmetics, saveOwnedCosmetics } from "./storage";
import type { CosmeticGift } from "./types";

const PENDING_GIFTS_KEY = "@lockedinfit/pending-gifts";

/**
 * Send a cosmetic gift to a friend.
 * Deducts Fangs from sender, creates gift doc.
 */
export async function sendGift(
  fromUserId: string,
  fromDisplayName: string,
  toUserId: string,
  itemId: string,
  itemPrice: number,
  message = ""
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured) return { success: false, error: "Offline" };

  // Deduct Fangs
  const { success } = await spendFangs(fromUserId, itemPrice, `gift_${itemId}`);
  if (!success) return { success: false, error: "Insufficient Fangs" };

  try {
    await addDoc(collection(db, "cosmeticGifts"), {
      fromUserId,
      fromDisplayName,
      toUserId,
      itemId,
      message: message.slice(0, 100),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    if (__DEV__) console.warn("[giftService] sendGift failed:", e);
    return { success: false, error: "Failed to send gift" };
  }
}

/**
 * Get pending gifts for a user.
 */
export async function getPendingGifts(userId: string): Promise<CosmeticGift[]> {
  if (!isFirebaseConfigured) {
    const cached = await AsyncStorage.getItem(PENDING_GIFTS_KEY);
    if (cached) try { return JSON.parse(cached); } catch (e) { if (__DEV__) console.warn("[giftService] getPendingGifts cache parse failed:", e); }
    return [];
  }

  try {
    const q = query(
      collection(db, "cosmeticGifts"),
      where("toUserId", "==", userId),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    const gifts: CosmeticGift[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        fromUserId: data.fromUserId,
        fromDisplayName: data.fromDisplayName,
        toUserId: data.toUserId,
        itemId: data.itemId,
        message: data.message ?? "",
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    await AsyncStorage.setItem(PENDING_GIFTS_KEY, JSON.stringify(gifts));
    return gifts;
  } catch (e) {
    if (__DEV__) console.warn("[giftService] getPendingGifts failed:", e);
    return [];
  }
}

/**
 * Claim a gift — adds item to owned cosmetics.
 */
export async function claimGift(giftId: string, itemId: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    // Update gift status
    await updateDoc(doc(db, "cosmeticGifts", giftId), { status: "claimed" });

    // Add to owned cosmetics
    const owned = await loadOwnedCosmetics();
    if (!owned.includes(itemId)) {
      await saveOwnedCosmetics([...owned, itemId]);
    }

    // Update cache
    const cached = await AsyncStorage.getItem(PENDING_GIFTS_KEY);
    if (cached) {
      try {
        const gifts: CosmeticGift[] = JSON.parse(cached);
        await AsyncStorage.setItem(
          PENDING_GIFTS_KEY,
          JSON.stringify(gifts.filter((g) => g.id !== giftId))
        );
      } catch (e) {
        if (__DEV__) console.warn("[giftService] claimGift cache update failed:", e);
      }
    }

    return true;
  } catch (e) {
    if (__DEV__) console.warn("[giftService] claimGift failed:", e);
    return false;
  }
}

/**
 * Get gift history (sent + received).
 */
export async function getGiftHistory(userId: string): Promise<CosmeticGift[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const results: CosmeticGift[] = [];

    // Sent
    const q1 = query(
      collection(db, "cosmeticGifts"),
      where("fromUserId", "==", userId)
    );
    const snap1 = await getDocs(q1);
    for (const d of snap1.docs) {
      const data = d.data();
      results.push({
        id: d.id,
        fromUserId: data.fromUserId,
        fromDisplayName: data.fromDisplayName,
        toUserId: data.toUserId,
        itemId: data.itemId,
        message: data.message ?? "",
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      });
    }

    // Received
    const q2 = query(
      collection(db, "cosmeticGifts"),
      where("toUserId", "==", userId)
    );
    const snap2 = await getDocs(q2);
    for (const d of snap2.docs) {
      if (!results.find((r) => r.id === d.id)) {
        const data = d.data();
        results.push({
          id: d.id,
          fromUserId: data.fromUserId,
          fromDisplayName: data.fromDisplayName,
          toUserId: data.toUserId,
          itemId: data.itemId,
          message: data.message ?? "",
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        });
      }
    }

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    if (__DEV__) console.warn("[giftService] getGiftHistory failed:", e);
    return [];
  }
}
