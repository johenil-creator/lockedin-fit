import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { earnFangs } from "./fangsService";
import type { StreakBattle } from "./types";

const STORAGE_KEY = "@lockedinfit/streak-battles";
const FANGS_REWARD = 20;

// ── Local storage helpers ───────────────────────────────────────────────────

async function loadBattles(): Promise<StreakBattle[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    if (__DEV__) console.warn("[streakBattleService] loadBattles failed:", e);
    return [];
  }
}

async function saveBattles(battles: StreakBattle[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
  } catch (e) {
    if (__DEV__) console.warn("[streakBattleService] saveBattles failed:", e);
  }
}

/**
 * Start a streak battle between two users.
 */
export async function startBattle(
  userId: string,
  userName: string,
  opponentId: string,
  opponentName: string
): Promise<StreakBattle | null> {
  const id = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const battle: StreakBattle = {
    id,
    player1Id: userId,
    player1Name: userName,
    player2Id: opponentId,
    player2Name: opponentName,
    player1StreakStart: 0,
    player2StreakStart: 0,
    player1Broke: false,
    player2Broke: false,
    winnerId: null,
    status: "active",
    fangsReward: FANGS_REWARD,
    createdAt: now,
  };

  // Save locally
  const battles = await loadBattles();
  battles.push(battle);
  await saveBattles(battles);

  // Save to Firestore
  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, "streakBattles"), {
        ...battle,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      if (__DEV__) console.warn("[streakBattleService] startBattle firestore sync failed:", e);
    }
  }

  return battle;
}

/**
 * Check if user broke their streak in any active battles.
 * If currentStreak < stored start, marks the player as broke.
 */
export async function checkBattleBreaks(
  userId: string,
  currentStreak: number
): Promise<void> {
  const battles = await loadBattles();
  let changed = false;

  for (const battle of battles) {
    if (battle.status !== "active") continue;

    const isPlayer1 = battle.player1Id === userId;
    const isPlayer2 = battle.player2Id === userId;

    if (isPlayer1 && !battle.player1Broke && currentStreak < battle.player1StreakStart) {
      battle.player1Broke = true;
      changed = true;
    } else if (isPlayer2 && !battle.player2Broke && currentStreak < battle.player2StreakStart) {
      battle.player2Broke = true;
      changed = true;
    }

    // Finalize if someone broke
    if (battle.player1Broke && !battle.player2Broke) {
      await finalizeBattle(battle.id, battle.player2Id);
      changed = true;
    } else if (battle.player2Broke && !battle.player1Broke) {
      await finalizeBattle(battle.id, battle.player1Id);
      changed = true;
    }
  }

  if (changed) {
    await saveBattles(battles);
  }
}

/**
 * Get all active battles for a user.
 */
export async function getActiveBattles(userId: string): Promise<StreakBattle[]> {
  const battles = await loadBattles();
  return battles.filter(
    (b) =>
      b.status === "active" &&
      (b.player1Id === userId || b.player2Id === userId)
  );
}

/**
 * Finalize a battle — set winner, mark completed, award Fangs.
 */
export async function finalizeBattle(
  battleId: string,
  winnerId: string
): Promise<void> {
  const battles = await loadBattles();
  const battle = battles.find((b) => b.id === battleId);
  if (!battle || battle.status === "completed") return;

  battle.winnerId = winnerId;
  battle.status = "completed";
  await saveBattles(battles);

  // Award Fangs to winner
  try {
    await earnFangs(winnerId, FANGS_REWARD, "Streak battle victory");
  } catch (e) {
    if (__DEV__) console.warn("[streakBattleService] finalizeBattle earnFangs failed:", e);
  }

  // Sync to Firestore
  if (isFirebaseConfigured) {
    try {
      const battlesRef = collection(db, "streakBattles");
      const q = query(battlesRef, where("id", "==", battleId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, "streakBattles", d.id), {
          winnerId,
          status: "completed",
        });
      }
    } catch (e) {
      if (__DEV__) console.warn("[streakBattleService] finalizeBattle firestore sync failed:", e);
    }
  }
}
