/**
 * hooks/useChallenge.ts — State management for the active monthly challenge.
 *
 * Thin wrapper around AsyncStorage + pure progress helpers. Side effects that
 * touch workout/XP/streak systems live in the challenge detail screen (same
 * pattern as app/orm-test.tsx) so we can compose them with the standard hooks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadActiveChallenge,
  saveActiveChallenge,
  clearActiveChallenge,
  loadChallengeHistory,
  saveChallengeHistory,
} from '../lib/storage';
import {
  startChallengeProgress,
  advanceProgress,
  getCurrentDay,
  isProgressComplete,
  buildCompletedRecord,
} from '../lib/challengeService';
import { getChallengeDefinition } from '../lib/challengeCatalog';
import type {
  ChallengeProgress,
  ChallengeDefinition,
  ChallengeDay,
  CompletedChallenge,
} from '../lib/types';

export function useChallenge() {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [history, setHistory] = useState<CompletedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef<ChallengeProgress | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [activeRaw, historyRaw] = await Promise.all([
          loadActiveChallenge(),
          loadChallengeHistory(),
        ]);
        progressRef.current = activeRaw;
        setProgress(activeRaw);
        setHistory(historyRaw);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived values
  const def: ChallengeDefinition | null = progress
    ? getChallengeDefinition(progress.challengeId)
    : null;
  const currentDay: ChallengeDay | null =
    progress && def ? getCurrentDay(progress, def) : null;

  /** Start a new challenge. Rejects if one is already active. */
  const startChallenge = useCallback(
    async (challengeId: string): Promise<ChallengeProgress> => {
      if (progressRef.current) {
        throw new Error('Finish or abandon your current challenge first.');
      }
      const def = getChallengeDefinition(challengeId);
      if (!def) throw new Error(`Unknown challenge: ${challengeId}`);
      const fresh = startChallengeProgress(challengeId);
      progressRef.current = fresh;
      setProgress(fresh);
      await saveActiveChallenge(fresh);
      return fresh;
    },
    [],
  );

  /** Abandon the active challenge without saving to history. */
  const abandonChallenge = useCallback(async (): Promise<void> => {
    progressRef.current = null;
    setProgress(null);
    await clearActiveChallenge();
  }, []);

  /**
   * Advance past the current day. Caller is responsible for any side effects
   * (logging a workout session, awarding XP, streak activity, etc.) before
   * calling this. When the challenge runs off the end of the schedule it is
   * auto-archived to history.
   */
  const advanceDay = useCallback(async (): Promise<{
    progress: ChallengeProgress | null;
    archived: CompletedChallenge | null;
  }> => {
    const cur = progressRef.current;
    if (!cur) return { progress: null, archived: null };
    const d = getChallengeDefinition(cur.challengeId);
    if (!d) return { progress: cur, archived: null };

    const next = advanceProgress(cur, d);

    if (isProgressComplete(next, d)) {
      const archived = buildCompletedRecord(next);
      const nextHistory = [archived, ...history].slice(0, 50);
      progressRef.current = null;
      setProgress(null);
      setHistory(nextHistory);
      await Promise.all([
        clearActiveChallenge(),
        saveChallengeHistory(nextHistory),
      ]);
      return { progress: null, archived };
    }

    progressRef.current = next;
    setProgress(next);
    await saveActiveChallenge(next);
    return { progress: next, archived: null };
  }, [history]);

  return {
    progress,
    def,
    currentDay,
    history,
    loading,
    startChallenge,
    abandonChallenge,
    advanceDay,
  };
}
