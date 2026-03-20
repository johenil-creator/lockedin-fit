import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import NetInfo from "@react-native-community/netinfo";

const SOCIAL_QUEUE_KEY = "@lockedinfit/social-sync-queue";

type QueuedSocialWrite = {
  collection: string;
  docId: string;
  data: Record<string, any>;
  merge: boolean;
  queuedAt: string;
};

// ── Queue helpers ───────────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedSocialWrite[]> {
  const raw = await AsyncStorage.getItem(SOCIAL_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[socialSync] caught:", e);
    return [];
  }
}

async function saveQueue(queue: QueuedSocialWrite[]): Promise<void> {
  await AsyncStorage.setItem(SOCIAL_QUEUE_KEY, JSON.stringify(queue));
}

// ── Core sync function ──────────────────────────────────────────────────────

/**
 * Queue a Firestore write for later sync.
 * Writes immediately if online, otherwise queues for flush.
 */
export async function queueSocialWrite(
  collection: string,
  docId: string,
  data: Record<string, any>,
  merge = true
): Promise<void> {
  if (!isFirebaseConfigured) return;

  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    try {
      await writeDirect(collection, docId, data, merge);
      return;
    } catch (e) {
    if (__DEV__) console.warn("[socialSync] caught:", e);
      // Fall through to queue
    }
  }

  const queue = await loadQueue();
  queue.push({ collection, docId, data, merge, queuedAt: new Date().toISOString() });
  await saveQueue(queue);
}

async function writeDirect(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  merge: boolean
): Promise<void> {
  const ref = doc(db, collectionName, docId);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge });
}

/**
 * Flush all queued social writes. Called when network is restored.
 */
export async function flushSocialQueue(): Promise<void> {
  if (!isFirebaseConfigured) return;

  const queue = await loadQueue();
  if (queue.length === 0) return;

  const failures: QueuedSocialWrite[] = [];
  for (const item of queue) {
    try {
      if (item.data.__type === "increment") {
        // Rebuild increment fields using Firestore's increment() sentinel
        const ref = doc(db, item.collection, item.docId);
        const incrementData: Record<string, any> = { updatedAt: serverTimestamp() };
        for (const [key, value] of Object.entries(item.data)) {
          if (key !== "__type") {
            incrementData[key] = increment(value as number);
          }
        }
        await updateDoc(ref, incrementData);
      } else {
        await writeDirect(item.collection, item.docId, item.data, item.merge);
      }
    } catch (e) {
    if (__DEV__) console.warn("[socialSync] caught:", e);
      failures.push(item);
    }
  }

  await saveQueue(failures);
}

/**
 * Increment a numeric field on a Firestore document.
 * Queues for later if offline.
 */
export async function queueFieldIncrement(
  collectionName: string,
  docId: string,
  field: string,
  amount: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    try {
      const ref = doc(db, collectionName, docId);
      await updateDoc(ref, { [field]: increment(amount), updatedAt: serverTimestamp() });
      return;
    } catch (e) {
    if (__DEV__) console.warn("[socialSync] caught:", e);
      // Fall through to queue
    }
  }

  // For increments, store as a special marker
  const queue = await loadQueue();
  queue.push({
    collection: collectionName,
    docId,
    data: { [field]: amount, __type: "increment" },
    merge: true,
    queuedAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}
