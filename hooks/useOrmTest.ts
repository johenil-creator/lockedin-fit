import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadOrmTest, saveOrmTest, clearOrmTest } from '../lib/storage';
import { makeId } from '../lib/helpers';
import { sanitizeWeight } from '../lib/sanitizeWeight';
import type {
  UserProfile,
  OrmLiftKey,
  OrmSet,
  OrmLiftResult,
  OrmTestSession,
} from '../lib/types';

// ── Constants ────────────────────────────────────────────────────────────────

const BAR_WEIGHT: Record<'kg' | 'lbs', number> = { kg: 20, lbs: 45 };

const LIFT_ORDER: { liftKey: OrmLiftKey; liftLabel: string }[] = [
  { liftKey: 'squat',    liftLabel: 'Squat' },
  { liftKey: 'deadlift', liftLabel: 'Deadlift' },
  { liftKey: 'bench',    liftLabel: 'Bench Press' },
  { liftKey: 'ohp',      liftLabel: 'Overhead Press' },
];

const SET_PROTOCOL: { prescribedPct: number; prescribedReps: number | 'amrap' }[] = [
  { prescribedPct: 0,    prescribedReps: 15 },
  { prescribedPct: 0.50, prescribedReps: 8 },
  { prescribedPct: 0.60, prescribedReps: 4 },
  { prescribedPct: 0.70, prescribedReps: 3 },
  { prescribedPct: 0.80, prescribedReps: 2 },
  { prescribedPct: 0.85, prescribedReps: 1 },
  { prescribedPct: 0.90, prescribedReps: 'amrap' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundTo2_5(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

function buildSets(estimatedOrm: number, unit: 'kg' | 'lbs'): OrmSet[] {
  const bar = BAR_WEIGHT[unit];
  return SET_PROTOCOL.map((proto, i) => {
    const raw = proto.prescribedPct === 0
      ? bar
      : Math.max(bar, roundTo2_5(estimatedOrm * proto.prescribedPct));
    const reps = proto.prescribedReps === 'amrap' ? '' : String(proto.prescribedReps);
    return {
      setNumber: i + 1,
      prescribedPct: proto.prescribedPct,
      prescribedReps: proto.prescribedReps,
      weight: String(raw),
      reps,
      completed: false,
    };
  });
}

function emptyLift(entry: { liftKey: OrmLiftKey; liftLabel: string }): OrmLiftResult {
  return {
    liftKey: entry.liftKey,
    liftLabel: entry.liftLabel,
    estimatedInput: '',
    sets: [],
    finalOrm: null,
    completed: false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOrmTest(
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>,
) {
  const [session, setSession] = useState<OrmTestSession | null>(null);
  const sessionRef = useRef<OrmTestSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-load on mount (resume logic)
  useEffect(() => {
    loadOrmTest().then((stored) => {
      if (stored && stored.status === 'in_progress') {
        sessionRef.current = stored;
        setSession(stored);
      }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const currentLift = useMemo<OrmLiftResult | null>(() => {
    if (!session) return null;
    if (session.currentLiftIndex >= session.lifts.length) return null;
    return session.lifts[session.currentLiftIndex];
  }, [session]);

  const isComplete = session?.status === 'completed';

  // ── Actions ────────────────────────────────────────────────────────────────

  const startTest = useCallback(async (unit: 'kg' | 'lbs') => {
    // If an in-progress session exists, mark it abandoned and save
    const existing = await loadOrmTest();
    if (existing && existing.status === 'in_progress') {
      existing.status = 'abandoned';
      await saveOrmTest(existing);
    }

    const newSession: OrmTestSession = {
      id: makeId(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      unit,
      lifts: LIFT_ORDER.map(emptyLift),
      currentLiftIndex: 0,
      status: 'in_progress',
    };
    await saveOrmTest(newSession);
    sessionRef.current = newSession;
    setSession(newSession);
  }, []);

  const setEstimatedInput = useCallback((liftIndex: number, value: string) => {
    const capped = sanitizeWeight(value);
    setSession((prev) => {
      if (!prev) return prev;
      const lifts = [...prev.lifts];
      lifts[liftIndex] = { ...lifts[liftIndex], estimatedInput: capped };
      const next = { ...prev, lifts };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const generateSets = useCallback((liftIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const lift = prev.lifts[liftIndex];
      const est = parseFloat(lift.estimatedInput);
      if (isNaN(est) || est <= 0) return prev;
      const sets = buildSets(est, prev.unit);
      const lifts = [...prev.lifts];
      lifts[liftIndex] = { ...lift, sets };
      const next = { ...prev, lifts };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const updateSetReps = useCallback((liftIndex: number, setIndex: number, value: string) => {
    const capped = value.replace(/[^0-9]/g, "").slice(0, 2);
    setSession((prev) => {
      if (!prev) return prev;
      const lift = prev.lifts[liftIndex];
      const sets = [...lift.sets];
      sets[setIndex] = { ...sets[setIndex], reps: capped };
      const lifts = [...prev.lifts];
      lifts[liftIndex] = { ...lift, sets };
      const next = { ...prev, lifts };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const updateSetWeight = useCallback((liftIndex: number, setIndex: number, value: string) => {
    const capped = sanitizeWeight(value);
    setSession((prev) => {
      if (!prev) return prev;
      const lift = prev.lifts[liftIndex];
      const sets = [...lift.sets];
      sets[setIndex] = { ...sets[setIndex], weight: capped };
      const lifts = [...prev.lifts];
      lifts[liftIndex] = { ...lift, sets };
      const next = { ...prev, lifts };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const completeSet = useCallback((liftIndex: number, setIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const lift = prev.lifts[liftIndex];
      // Sets must be completed in order
      const completedCount = lift.sets.filter((s) => s.completed).length;
      if (setIndex !== completedCount) return prev;
      // Set 7 (index 6) requires reps to be filled
      const set = lift.sets[setIndex];
      if (set.prescribedReps === 'amrap' && set.reps === '') return prev;
      const sets = [...lift.sets];
      sets[setIndex] = { ...set, completed: true };
      const lifts = [...prev.lifts];
      lifts[liftIndex] = { ...lift, sets };
      const next = { ...prev, lifts };
      sessionRef.current = next;
      return next;
    });
  }, []);

  const completeLift = useCallback(async () => {
    const prev = sessionRef.current;
    if (!prev) return;

    const lift = prev.lifts[prev.currentLiftIndex];
    // Calculate finalOrm from set 7 (index 6)
    const set7 = lift.sets[6];
    const w = parseFloat(set7.weight);
    const r = parseFloat(set7.reps || '0');
    let orm: number;
    if (isNaN(w)) {
      orm = 0;
    } else if (r <= 1) {
      // At very low reps, back-calculate from the 90% set weight
      orm = Math.round(w / 0.9);
    } else {
      orm = Math.round(w * (1 + r / 30));
    }

    const lifts = [...prev.lifts];
    lifts[prev.currentLiftIndex] = {
      ...lift,
      finalOrm: String(orm),
      completed: true,
    };
    const updated: OrmTestSession = {
      ...prev,
      lifts,
      currentLiftIndex: prev.currentLiftIndex + 1,
    };

    sessionRef.current = updated;
    setSession(updated);
    await saveOrmTest(updated);
  }, []);

  const finishTest = useCallback(async () => {
    // Use ref to avoid stale closure
    const sess = sessionRef.current;
    if (!sess) return;

    const completedSession: OrmTestSession = {
      ...sess,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    };

    // Update local state
    sessionRef.current = completedSession;
    setSession(completedSession);

    // Write ALL 4 finalOrm values atomically to profile
    const estimated1RM: Record<string, string> = {};
    for (const lift of completedSession.lifts) {
      if (lift.finalOrm) {
        estimated1RM[lift.liftKey] = lift.finalOrm;
      }
    }
    await updateProfile({
      estimated1RM: estimated1RM as UserProfile['estimated1RM'],
      manual1RM: estimated1RM as UserProfile['manual1RM'],
      lastTestedAt: new Date().toISOString(),
      onboardingComplete: true,
      weightUnit: completedSession.unit,
    });

    // Save completed session then clear from storage
    await saveOrmTest(completedSession);
    await clearOrmTest();
  }, [updateProfile]);

  const saveAndExit = useCallback(async () => {
    // Use ref to avoid stale closure
    const sess = sessionRef.current;
    if (!sess) return;

    // Write any completed lift results to the profile
    const completedLifts = sess.lifts.filter((l) => l.completed && l.finalOrm);
    if (completedLifts.length > 0) {
      const estimated1RM: Record<string, string> = {};
      for (const lift of completedLifts) {
        estimated1RM[lift.liftKey] = lift.finalOrm!;
      }
      await updateProfile({
        estimated1RM: estimated1RM as UserProfile['estimated1RM'],
        manual1RM: estimated1RM as UserProfile['manual1RM'],
        onboardingComplete: true,
        weightUnit: sess.unit,
      });
    } else {
      // No lifts completed — still mark onboarding done so user isn't stuck
      await updateProfile({ onboardingComplete: true, weightUnit: sess.unit });
    }

    await clearOrmTest();
  }, [updateProfile]);

  const restartTest = useCallback(async (unit: 'kg' | 'lbs') => {
    // Mark current session abandoned
    const sess = sessionRef.current;
    if (sess && sess.status === 'in_progress') {
      const abandoned = { ...sess, status: 'abandoned' as const };
      await saveOrmTest(abandoned);
    }
    // Start fresh
    const newSession: OrmTestSession = {
      id: makeId(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      unit,
      lifts: LIFT_ORDER.map(emptyLift),
      currentLiftIndex: 0,
      status: 'in_progress',
    };
    await saveOrmTest(newSession);
    sessionRef.current = newSession;
    setSession(newSession);
  }, []);

  const clearSession = useCallback(async () => {
    await clearOrmTest();
    sessionRef.current = null;
    setSession(null);
  }, []);

  return {
    session,
    loading,
    currentLift,
    isComplete,
    startTest,
    setEstimatedInput,
    generateSets,
    updateSetReps,
    updateSetWeight,
    completeSet,
    completeLift,
    finishTest,
    saveAndExit,
    restartTest,
    clearSession,
  };
}
