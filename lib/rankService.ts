import type { RankLevel } from "./types";

// ── Rank thresholds ───────────────────────────────────────────────────────────

export type RankThreshold = { rank: RankLevel; xp: number };

export const RANK_LADDER: RankThreshold[] = [
  { rank: "Runt",     xp: 0    },
  { rank: "Scout",    xp: 100  },
  { rank: "Stalker",  xp: 300  },
  { rank: "Hunter",   xp: 600  },
  { rank: "Sentinel", xp: 1000 },
  { rank: "Alpha",    xp: 1500 },
  { rank: "Apex",     xp: 2200 },
];

/** Return the rank earned for a given total XP amount. */
export function rankForXP(totalXP: number): RankLevel {
  let earned: RankLevel = "Runt";
  for (const tier of RANK_LADDER) {
    if (totalXP >= tier.xp) earned = tier.rank;
    else break;
  }
  return earned;
}

/** Return the next rank above the current one, or null if at Apex. */
export function nextRank(current: RankLevel): RankThreshold | null {
  const idx = RANK_LADDER.findIndex((t) => t.rank === current);
  return idx >= 0 && idx < RANK_LADDER.length - 1 ? RANK_LADDER[idx + 1] : null;
}

/** XP needed to reach the next rank from current total, or 0 if at Apex. */
export function xpToNextRank(totalXP: number): number {
  const current = rankForXP(totalXP);
  const next = nextRank(current);
  if (!next) return 0;
  return next.xp - totalXP;
}

/**
 * Progress (0–1) within the current rank band.
 * Returns 1 if at Apex.
 */
export function rankProgress(totalXP: number): number {
  const current = rankForXP(totalXP);
  const idx = RANK_LADDER.findIndex((t) => t.rank === current);
  if (idx === RANK_LADDER.length - 1) return 1;
  const bandStart = RANK_LADDER[idx].xp;
  const bandEnd   = RANK_LADDER[idx + 1].xp;
  return (totalXP - bandStart) / (bandEnd - bandStart);
}

/** True if newXP crosses a rank boundary that oldXP did not. */
export function didRankUp(oldXP: number, newXP: number): boolean {
  return rankForXP(newXP) !== rankForXP(oldXP);
}
