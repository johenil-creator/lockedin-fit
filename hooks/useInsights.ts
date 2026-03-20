import { useState, useEffect } from "react";
import { getEngagementStats } from "../lib/engagementTracker";
import type { InsightTip } from "../lib/types";

type UseInsightsResult = {
  tips: InsightTip[];
  engagementStats: Record<string, number>;
};

function generateTips(stats: Record<string, number>): InsightTip[] {
  const tips: InsightTip[] = [];

  const workouts = stats["workout_complete"] ?? 0;
  const prs = stats["pr_hit"] ?? 0;
  const streakChecks = stats["streak_check"] ?? 0;

  if (workouts === 0) {
    tips.push({
      id: "tip_start",
      text: "Get your first workout in this week to start building momentum.",
      category: "motivation",
    });
  } else if (workouts >= 5) {
    tips.push({
      id: "tip_recovery",
      text: "You've been training hard — make sure you're prioritizing sleep and recovery.",
      category: "recovery",
    });
  }

  if (prs > 0) {
    tips.push({
      id: "tip_pr",
      text: "You hit a PR recently! Ride that momentum into your next session.",
      category: "performance",
    });
  } else {
    tips.push({
      id: "tip_progressive",
      text: "Try adding a small amount of weight or an extra rep to push past plateaus.",
      category: "progression",
    });
  }

  if (streakChecks < 3) {
    tips.push({
      id: "tip_consistency",
      text: "Consistency beats intensity. Even a light session keeps the streak alive.",
      category: "consistency",
    });
  }

  if (tips.length < 2) {
    tips.push({
      id: "tip_general",
      text: "Stay hydrated and fuel your workouts with quality nutrition.",
      category: "nutrition",
    });
  }

  return tips.slice(0, 3);
}

export function useInsights(): UseInsightsResult {
  const [tips, setTips] = useState<InsightTip[]>([]);
  const [engagementStats, setEngagementStats] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const stats = await getEngagementStats();
      setEngagementStats(stats);
      setTips(generateTips(stats));
    }
    load();
  }, []);

  return { tips, engagementStats };
}
