import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lockeReact, type LockeContext as LockeCtxInput } from "../lib/lockeEngine";
import { defaultMachineRecord } from "../lib/lockeMachine";
import type { LockeState, LockeMachineRecord } from "../lib/types";
import type { LockeAnimationPreset } from "../lib/lockeMachine";
import { LockeOverlay } from "../components/Locke/LockeOverlay";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import type { RankKey } from "../components/Locke/lockeTokens";

/** Map system LockeState → visual LockeMascotMood (drops "onboarding_guide" → "neutral") */
function toMascotMood(state: LockeState): LockeMascotMood {
  if (state === "onboarding_guide") return "neutral";
  if (state === "savage") return "savage";
  return state;
}

const STORAGE_KEY = "lockedinfit:locke_machine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LockeMessage = {
  state:       LockeState;
  message:     string;
  animation:   LockeAnimationPreset;
  visible:     boolean;
  showOverlay: boolean;
  rank:        RankKey;
  eyebrow?:    string;
  ctaLabel:    string;
};

type LockeContextValue = {
  locke:   LockeMessage;
  fire:    (ctx: LockeCtxInput, durationMs?: number) => void;
  dismiss: () => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const DEFAULT_LOCKE: LockeMessage = {
  state:       "neutral",
  message:     "",
  animation:   "breathe",
  visible:     false,
  showOverlay: false,
  rank:        "runt",
  ctaLabel:    "Got it",
};

const LockeCtx = createContext<LockeContextValue>({
  locke:   DEFAULT_LOCKE,
  fire:    () => {},
  dismiss: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function LockeProvider({ children }: { children: React.ReactNode }) {
  const [locke,  setLocke]  = useState<LockeMessage>(DEFAULT_LOCKE);
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Persisted machine record — survives app restarts
  const machineRef          = useRef<LockeMachineRecord>(defaultMachineRecord());

  // Load persisted record on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as LockeMachineRecord;
        machineRef.current = parsed;
      } catch {
        // corrupt data — stay on default
      }
    });
  }, []);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocke((prev) => ({ ...prev, visible: false }));
  }, []);

  const fire = useCallback(
    (ctx: LockeCtxInput, durationMs = 8000) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const { state, message, animation, nextRecord } = lockeReact(
        ctx,
        machineRef.current
      );

      // Persist the updated record
      machineRef.current = nextRecord;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecord)).catch((err) => {
        if (__DEV__) console.warn("[LockeContext] Failed to persist machine record:", err);
      });

      const showOverlay = ctx.trigger === "rank_up" || ctx.trigger === "pr_hit";
      const eyebrow     = ctx.trigger === "rank_up" ? "RANK UP"
                        : ctx.trigger === "pr_hit"  ? "PERSONAL RECORD"
                        : undefined;
      const ctaLabel    = ctx.trigger === "rank_up" ? "Lock In" : "Got it";
      const rank        = ctx.rank ? (ctx.rank.toLowerCase() as RankKey) : "runt";

      setLocke({ state, message, animation, visible: true, showOverlay, rank, eyebrow, ctaLabel });

      timerRef.current = setTimeout(() => {
        setLocke((prev) => ({ ...prev, visible: false }));
      }, durationMs);
    },
    []
  );

  const value = useMemo(() => ({ locke, fire, dismiss }), [locke, fire, dismiss]);

  return (
    <LockeCtx.Provider value={value}>
      {children}
      <LockeOverlay
        visible={locke.visible && locke.showOverlay}
        mood={toMascotMood(locke.state)}
        rank={locke.rank}
        message={locke.message}
        eyebrow={locke.eyebrow}
        ctaLabel={locke.ctaLabel}
        onDismiss={dismiss}
      />
    </LockeCtx.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLocke() {
  return useContext(LockeCtx);
}
