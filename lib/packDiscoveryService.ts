import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { PublicPack, RankLevel } from "./types";

/**
 * Search for public packs by name or tags.
 */
export async function searchPublicPacks(
  searchQuery?: string,
  tags?: string[]
): Promise<PublicPack[]> {
  if (!isFirebaseConfigured) return [];

  try {
    let q;
    if (tags && tags.length > 0) {
      q = query(
        collection(db, "publicPacks"),
        where("isPublic", "==", true),
        where("tags", "array-contains-any", tags),
        orderBy("weeklyXp", "desc"),
        firestoreLimit(30)
      );
    } else {
      q = query(
        collection(db, "publicPacks"),
        where("isPublic", "==", true),
        orderBy("weeklyXp", "desc"),
        firestoreLimit(30)
      );
    }

    const snap = await getDocs(q);
    let results: PublicPack[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        motto: data.motto ?? "",
        memberCount: data.memberCount ?? 0,
        weeklyXp: data.weeklyXp ?? 0,
        isPublic: true,
        tags: data.tags ?? [],
      };
    });

    // Client-side name filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(lower));
    }

    return results;
  } catch (e) {
    if (__DEV__) console.warn("[packDiscoveryService] caught:", e);
    return [];
  }
}

/**
 * Toggle pack public visibility.
 */
export async function togglePackVisibility(
  packId: string,
  isPublic: boolean
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    await updateDoc(doc(db, "packs", packId), { isPublic });

    if (isPublic) {
      // Also create/update in publicPacks
      const { getDoc: getDocFn, setDoc: setDocFn, serverTimestamp: stFn } = await import("firebase/firestore");
      const packDoc = await getDocFn(doc(db, "packs", packId));
      if (packDoc.exists()) {
        const data = packDoc.data();
        await setDocFn(doc(db, "publicPacks", packId), {
          name: data.name,
          motto: data.motto ?? "",
          memberCount: data.memberCount ?? 0,
          weeklyXp: data.weeklyXp ?? 0,
          isPublic: true,
          tags: data.tags ?? [],
          updatedAt: stFn(),
        });
      }
    } else {
      const { deleteDoc: deleteDocFn } = await import("firebase/firestore");
      await deleteDocFn(doc(db, "publicPacks", packId));
    }

    return true;
  } catch (e) {
    if (__DEV__) console.warn("[packDiscoveryService] caught:", e);
    return false;
  }
}

/**
 * Get recommended packs for a user's rank.
 */
export async function getRecommendedPacks(
  rank: RankLevel
): Promise<PublicPack[]> {
  // For now, just return top public packs sorted by XP
  return searchPublicPacks();
}
