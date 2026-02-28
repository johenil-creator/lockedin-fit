# Recovery & Adaptive Training — QA Checklist

> Status: **ACTIVE** — Tasks #13 (dashboard) and #15 (session integration) complete. Task #16 (UX polish) in progress.
> Items still marked ⏳ require Task #16 to land. Remove markers and re-test as polish merges.
>
> Test device targets: iOS (iPhone 14 Pro, iOS 17+), Android (Pixel 7, API 34).
> Performance bar: 60 fps during all animations; <100 ms for any user-initiated action.
>
> Reference implementations:
> - `lib/recoveryEstimator.ts` — per-muscle recovery curves
> - `lib/readinessScore.ts` — 5-component readiness score
> - `lib/adaptationModel.ts` — ACWR / training load
> - `lib/blockPeriodization.ts` — 12-week block cycles
> - `lib/plateauDetection.ts` — strength plateau detection
> - `lib/smartDeload.ts` — deload trigger prescriptions
> - `lib/lockeCoachEngine.ts` — coach mood + advice
> - `lib/muscleMapping.ts` — exercise → muscle mapping
> - `components/recovery/MuscleHeatmap.tsx`
> - `components/recovery/RecoveryTrendGraph.tsx`
> - `lib/storage.ts` — AsyncStorage keys + batch loading

---

## A — Recovery Estimator

### A1 — Basic Estimation
- [ ] Calling `estimateRecovery` with fatigue=0 returns `{ hoursToFull: 0, pctRecovered: 100 }`
- [ ] Calling `estimateRecovery` with fatigue=100 returns `hoursToFull` close to 48–72 h (matches configured half-life)
- [ ] `pctRecovered` increases monotonically as `hoursSince` increases from 0 → 72
- [ ] `pctRecovered` never exceeds 100 regardless of input magnitude
- [ ] `pctRecovered` never drops below 0

### A2 — Half-life correctness
- [ ] At exactly `halfLife` hours elapsed, `pctRecovered` ≈ 50% of the remaining fatigue decayed
- [ ] Larger muscle groups (quads, hamstrings, back) produce longer `hoursToFull` than smaller groups
- [ ] High-frequency muscles (`freq` > 4) produce faster estimated recovery than low-frequency muscles

### A3 — Caching
- [ ] Calling `estimateRecovery` twice with identical params returns the same object reference (cache hit)
- [ ] Calling `estimateAllMuscles` twice with identical params returns the same object reference
- [ ] Cache hit count does not grow unboundedly — cache entry count stays ≤ 64 (LRU eviction)
- [ ] After `clearRecoveryCache()`, the next call recomputes (no stale data)
- [ ] Cache key correctly rounds continuous inputs — fatigue 49.9 and 50.1 may or may not share a key; verify this is intentional per `recoveryEstimator.ts:buildCacheKey`

### A4 — Edge cases
- [ ] `fatigue < 0` (defensive: clamped to 0, no crash)
- [ ] `fatigue > 100` (defensive: clamped to 100, no crash)
- [ ] `hoursSince < 0` (defensive: treated as 0, no crash)
- [ ] Unknown `muscle` passed — function returns a sensible default (no exception)

---

## B — Muscle Readiness Score

### B1 — Score ranges
- [ ] Score 80–100 produces label `"Prime"` (green)
- [ ] Score 60–79 produces label `"Ready"` (yellow-green)
- [ ] Score 40–59 produces label `"Manage Load"` (orange)
- [ ] Score 0–39 produces label `"Recover"` (red)
- [ ] Score never exceeds 100; never drops below 0

### B2 — Component weights
- [ ] With all fatigue = 0, streak = 1, ACWR = 1.0, forecastRisk = 0 → score ≈ 100
- [ ] With all fatigue = 100, blockType = `accumulation` → muscleFreshness = 0, score drops substantially (verify ≤ 45)
- [ ] With all fatigue = 100, blockType = `realization` → score is lower than same fatigue in `accumulation`
- [ ] streakDays = 3 → no penalty (score unchanged from streakDays = 1)
- [ ] streakDays = 20 → streakModifier clamped to 40 floor (doesn't zero out score)
- [ ] forecastRisk = 100 (maximum risk) → forecastScore = 0; total score is measurably lower
- [ ] ACWR = 1.0 (sweet-spot) → acwrScore = 100 (maximum contribution)
- [ ] ACWR = 0.6 → acwrScore = 50; ACWR = 0.5 → acwrScore = 0
- [ ] ACWR = 1.3 → acwrScore = 100; ACWR = 1.5 → acwrScore = 50; ACWR = 1.6 → acwrScore = 0

### B3 — Dominant factor
- [ ] `dominantFactor` returns the component with the lowest raw sub-score
- [ ] When all components are equal, a deterministic winner is returned (first in the list)
- [ ] Label returned is human-readable (one of: "Muscle Fatigue", "Training Block", "Rest Frequency", "Session Risk", "Workload Ratio")

### B4 — LRU cache
- [ ] Same inputs produce the same `ReadinessScore` object identity (cache hit)
- [ ] After `clearReadinessCache()`, next call recomputes
- [ ] Cache size stays ≤ 64 entries under sustained unique-input calls

### B5 — Edge cases
- [ ] `fatigueMap` with all zeros → muscleFreshness = 100
- [ ] `streakDays = 0` → no penalty (edge case: newly onboarded user)
- [ ] `forecastRisk = 0` (no forecast available, neutral default) → forecastScore = 100

---

## C — Muscle Heatmap

### C1 — Color scale
- [ ] Muscle at fatigue 0 — no fill rendered (transparent)
- [ ] Muscle at fatigue 15 (0–25) — green fill visible
- [ ] Muscle at fatigue 35 (26–50) — yellow fill visible
- [ ] Muscle at fatigue 65 (51–79) — orange fill visible
- [ ] Muscle at fatigue 90 (80–100) — red fill visible and pulsing

### C2 — Pulse animation
- [ ] Muscles with fatigue ≥ 80 pulse with an opacity oscillation (visible to eye)
- [ ] Muscles with fatigue < 80 do NOT pulse
- [ ] Pulse animation runs at ≥ 60 fps (measure with Flipper or React Native Perf Monitor)
- [ ] Only ONE `Animated.View` node drives ALL pulsing muscles (not N separate nodes) — verify in component code
- [ ] `cancelAnimation` is called before restarting when `hasPulse` changes from true → false
- [ ] When ALL muscles drop below fatigue 80, pulse animation stops; opacity resets to 1.0

### C3 — Layout
- [ ] On screen width ≥ 340px, front and back views render side-by-side with "FRONT" / "BACK" labels
- [ ] On screen width < 340px, a tabbed toggle (Front / Back) renders correctly
- [ ] Active tab button has primary color background; inactive is muted
- [ ] Front and back body silhouettes are visually proportionate with no clipping artifacts
- [ ] Heatmap fills cover the correct anatomical region (chest paths cover chest, quads cover thighs, etc.)

### C4 — Interactivity
- [ ] Tapping a muscle group (when `onMusclePress` is provided) calls the callback with the correct `MuscleGroup` string
- [ ] Tapping the pulse overlay paths also fires the correct callback
- [ ] No double-fire (static + pulse path both hitTestable) — verify only one fires per tap

### C5 — Theming
- [ ] Skin fill is dark (`#1C2128`) in dark mode
- [ ] Skin fill is light (`#EDE8E2`) in light mode
- [ ] Body outline uses `theme.colors.border` — visible in both modes

### C6 — Performance (memoization)
- [ ] `React.memo` comparator prevents re-render when `fatigueMap` reference is unchanged
- [ ] Re-render fires when `fatigueMap` reference changes (even if values are identical objects)
- [ ] `shouldRasterizeIOS` is set on the base SVG (static layer) — verify in source
- [ ] `renderToHardwareTextureAndroid` is set on the base SVG — verify in source
- [ ] Pulse SVG is NOT rasterized (it's animating) — verify `shouldRasterizeIOS` is absent/false on pulse overlay

---

## D — Weekly Recovery Trend Graph

### D1 — Rendering
- [ ] With 0 snapshots, graph renders an empty chart (no crash, no paths drawn)
- [ ] With 1 snapshot, a single point is rendered (no line, just a dot)
- [ ] With 7 snapshots (default window), 7 data points and a smooth line are rendered
- [ ] X-axis labels show correct day abbreviations (Sun, Mon, Tue…) aligned to the actual calendar day
- [ ] Y-axis labels show 0, 25, 50, 75, 100 aligned to correct pixel heights
- [ ] Grid lines align exactly with Y-axis labels

### D2 — Multi-line display
- [ ] Overall fatigue line (viridian green) is drawn thicker than muscle lines (2.5 vs 1.5 strokeWidth)
- [ ] Up to 3 individual muscle lines appear (orange, blue, purple — matching `MUSCLE_PALETTE`)
- [ ] Legend shows "Overall" plus names of the top 3 muscles
- [ ] Muscle legend names are capitalized (e.g., "Upper Back" not "upper_back")
- [ ] If fewer than 3 muscles have data, fewer than 3 muscle lines appear (no empty/zero lines)

### D3 — Fade-in animation
- [ ] Chart fades in from opacity 0 → 1 on mount over ~600 ms
- [ ] Fade-in uses `useAnimatedStyle` (UI thread) — verify in source
- [ ] `shouldRasterizeIOS={false}` during the fade — verify in source (rasterizing while animating causes glitches)

### D4 — Window sizes
- [ ] `days=7` (default) shows the last 7 calendar days
- [ ] `days=30` shows 30 days with X-axis labels every other day
- [ ] `days=84` (max) shows 12 weeks, caps at `MAX_DAYS`; days > 84 are silently clamped
- [ ] `days=1` is clamped to 2 (minimum) — no crash on single-point window

### D5 — Performance
- [ ] `React.memo` comparator prevents re-render when `data` array reference is unchanged
- [ ] All path computation happens inside a single `useMemo` (no per-render allocations)

---

## E — Block Periodization

### E1 — Block identification
- [ ] Week 1–4 of a 12-week plan resolves to `blockType = "accumulation"`
- [ ] Week 5–8 resolves to `blockType = "intensification"`
- [ ] Week 9–12 resolves to `blockType = "realization"`
- [ ] Week 4 (end of accumulation) returns `blockWeekPosition` indicating a pivot deload

### E2 — Volume adjustments
- [ ] Accumulation weeks return higher volume multipliers than realization weeks
- [ ] Realization (taper) weeks return significantly lower volume (≤ 70% of accumulation)
- [ ] Week 12 (final realization) returns the lowest intensity adjustment (peak week)

### E3 — Integration with readiness
- [ ] `blockContextScore` returns higher scores during `accumulation` when fatigue is moderate (50–70)
- [ ] `blockContextScore` returns lower scores during `realization` when fatigue > 30
- [ ] Readiness label changes meaningfully between identical fatigue inputs across different block types

### E4 — Edge cases
- [ ] Plan with 0 completed weeks resolves gracefully (no crash; defaults to accumulation)
- [ ] Plan with 13+ weeks wraps or caps to a valid block index (no out-of-bounds array access)

---

## F — ACWR and Adaptation Model

### F1 — Load computation
- [ ] No sessions in last 7 days → acute load = 0
- [ ] No sessions in last 28 days → chronic load = 0
- [ ] Acute load increases linearly with session volume (more sets/reps → higher load)
- [ ] A single high-volume session raises acute load significantly more than chronic load
- [ ] After 4 weeks of consistent moderate sessions, ACWR approaches 1.0

### F2 — ACWR ranges
- [ ] ACWR = 0.8–1.3 → "sweet spot" — readiness acwr contribution = 100
- [ ] ACWR > 1.5 → overreaching zone — triggers deload evaluation (verified in smartDeload)
- [ ] ACWR < 0.6 → undertrained zone — readiness contribution = 0
- [ ] ACWR = 0 (first week of training) handled gracefully (no division-by-zero)

### F3 — Training age
- [ ] New user (1 session) → trainingAge = 0 weeks
- [ ] User with 6 months of history → trainingAge ≈ 26 weeks
- [ ] `deriveTrainingAgeWeeks` uses a single O(n) min/max scan — NOT sort — to find first and last session timestamps (perf regression guard)

### F4 — Storage
- [ ] `loadTrainingLoad` returns null on first launch (no stored data)
- [ ] `saveTrainingLoad` → `loadTrainingLoad` round-trips correctly (no data loss)
- [ ] `updateTrainingLoad` persists to storage after computing new load values

---

## G — Fatigue Forecast Engine

> Engine complete (Task #10 done — `lib/fatigueForecast.ts`). Dashboard integration pending Task #16.
> G1–G2 are pure engine tests — testable now. G3 requires #16.

### G1 — Basic forecast (`forecastNextSession`)
- [ ] With all muscles at fatigue = 0 and a heavy planned session → `overtrainedMuscles` is empty (starting fresh)
- [ ] With all muscles at fatigue = 90 and a full-body session → `overtrainedMuscles` includes primary movers
- [ ] `projectedFatigueMap` values are all ≥ their post-recovery baseline (fatigue only increases during a session)
- [ ] `nextDayLabel` is echoed in the returned `ForecastResult`
- [ ] No crash when `nextExercises` is an empty array
- [ ] `hoursUntilSession = 0` means no recovery applied before projecting session fatigue
- [ ] `blockType = "realization"` produces higher projected fatigue than `"accumulation"` for the same exercises (higher RPE scaling)

### G2 — Warnings and suggestions
- [ ] At least one `ForecastWarning` is generated for each muscle in `overtrainedMuscles`
- [ ] Warning `severity` field is one of `'caution' | 'warning' | 'danger'`
- [ ] `message` is non-empty for every warning
- [ ] When `overtrainedMuscles.length ≥ 3`, a blanket rest-day suggestion replaces individual swap suggestions
- [ ] `suggestions` array is non-empty when any overtraining is projected

### G2a — Caching
- [ ] Calling `forecastNextSession` twice with identical params returns the same `ForecastResult` object (cache hit)
- [ ] After `clearForecastCache()`, next call recomputes (cache miss)
- [ ] Cache respects 5-minute TTL — result computed before TTL returns cached; result after TTL recomputes

### G3 — Dashboard integration ⏳
- [ ] ⏳ `forecastRisk` is derived from `ForecastResult.warnings` and passed to `computeReadiness` (not hardcoded 0)
- [ ] ⏳ Dashboard readiness score changes when forecast warns of high-risk exercises

---

## H — Volume Auto-Periodization

> Engine complete (Task #7 done — `lib/volumeEngine.ts`). Session screen integration pending Task #16.
> H1–H2 are pure engine tests — testable now. H3 requires #16.

### H1 — Volume adjustment logic (`computeVolumeAdjustments`)
- [ ] With readiness ≥ 70: at least one muscle group receives an increase recommendation
- [ ] With readiness < 50: at least one muscle group receives a reduce recommendation
- [ ] With readiness 50–69: recommendations are "maintain" (no increase or reduce)
- [ ] `VolumeAdjustment.multiplier` is never negative and never > 2.0 for any returned adjustment
- [ ] During a `realization` block, volume cap restricts multipliers to ≤ 0.90 (hard ceiling)
- [ ] Beginner (trainingAge < 12 weeks) receives larger volume increases than advanced (≥ 52 weeks) at the same readiness

### H2 — Per-muscle adjustments
- [ ] Muscle with fatigue > 80 receives a reduced volume recommendation
- [ ] Fully recovered muscle (fatigue < 20) receives normal or slightly elevated volume
- [ ] Adjustment is per muscle group, not global — different muscles can have different directions simultaneously
- [ ] `computeVolumeHistory` sorts sessions once and passes a pre-sorted array downstream (perf regression guard)

### H3 — Session screen integration ⏳
- [ ] ⏳ Volume multipliers are applied to planned set counts before session screen renders
- [ ] ⏳ Original plan target is preserved in plan data (changes are non-destructive)

---

## I — Plateau Detection

### I1 — Detection criteria
- [ ] User with < 3 weeks of history → returns `null` (insufficient data)
- [ ] User with 3+ weeks, steady top-set progression → returns `null` (no plateau)
- [ ] User with 14–21 days of no top-set progression AND adherence ≥ 70% → returns a `PlateauInsight`
- [ ] User with 14–21 days stagnation but adherence < 70% → returns `null` (missed sessions; not a true plateau)

### I2 — Classification
- [ ] Average readiness < 50 → classification = `"under_recovered"`
- [ ] Consistently high readiness (> 75) + low/flat volume → classification = `"under_stimulated"`
- [ ] Adherence 70–85% with variable session quality → classification = `"inconsistent"`
- [ ] Classification is deterministic — same input always produces same result

### I3 — Insight fields
- [ ] `PlateauInsight.classification` is one of `"under_recovered" | "under_stimulated" | "inconsistent"`
- [ ] `PlateauInsight.daysSinceImprovement` reflects the actual stagnation window (14–21 days)
- [ ] `PlateauInsight.adherencePercent` is between 70 and 100 (only triggers above 70%)
- [ ] `PlateauInsight.recommendation` is a non-empty human-readable string

### I4 — Edge cases
- [ ] Single exercise with 1 session → no plateau (insufficient data)
- [ ] All sessions have identical volume → correctly detected as stagnation
- [ ] Exercise renamed between sessions → treat as different exercises (no false plateau)

---

## J — Smart Deload Trigger

### J1 — Trigger conditions
- [ ] 2+ muscles at fatigue ≥ 80 for 3+ consecutive days → triggers deload
- [ ] 1 muscle at fatigue ≥ 80 for 3 days (below the 2-muscle threshold) → does NOT trigger
- [ ] Readiness score < 45 for 5 out of the last 7 snapshots → triggers deload
- [ ] Readiness score < 45 for only 4 out of 7 days → does NOT trigger
- [ ] `PlateauInsight.classification = "under_recovered"` → triggers deload
- [ ] `PlateauInsight.classification = "under_stimulated"` → does NOT trigger deload
- [ ] ACWR > 1.5 → triggers deload
- [ ] ACWR = 1.49 → does NOT trigger (boundary test)

### J2 — Severity prescription
- [ ] 1 trigger → mild: volumeReduction = 0.40, intensityReduction = 0.05
- [ ] 2 triggers → moderate: volumeReduction = 0.45, intensityReduction = 0.07
- [ ] 3+ triggers → heavy: volumeReduction = 0.50, intensityReduction = 0.10
- [ ] Volume and intensity reductions are always positive fractions (0–1 range)

### J3 — Guard clause
- [ ] `blockWeekPosition = "pivot_deload"` → does NOT trigger new deload; returns a note to pull deload forward if within 7 days
- [ ] When guard clause fires and scheduled deload is > 7 days away, no recommendation is returned

### J4 — Return shape
- [ ] `DeloadTrigger.recommended = false` when no trigger fires
- [ ] `DeloadTrigger.recommended = true` when any trigger fires
- [ ] `DeloadTrigger.triggerReasons` array is non-empty when `recommended = true`
- [ ] `DeloadTrigger.triggerReasons` is empty when `recommended = false`

---

## K — Locke Coach Engine

### K1 — Mood mapping
- [ ] Readiness label `"Prime"` → coach mood is upbeat/positive
- [ ] Readiness label `"Recover"` → coach mood is concerned/cautious
- [ ] Readiness label `"Manage Load"` → coach mood is advisory
- [ ] Coach mood updates when readiness changes (not stale between sessions)

### K2 — Advice content
- [ ] Muscle-specific tip is surfaced when a muscle group exceeds fatigue threshold
- [ ] Plateau tip is surfaced when a `PlateauInsight` is present in coach output
- [ ] Deload tip is surfaced when `DeloadTrigger.recommended = true`
- [ ] When all systems are green, coach returns a motivational (not warning) message

### K3 — Phrase rotation
- [ ] Successive calls with the same context do not repeat the same phrase consecutively
- [ ] Phrase rotation is deterministic (no `Math.random`) — same cursor state → same output
- [ ] Cursor state persists across renders (module-level `cursors` map)

### K4 — Animation intensity
- [ ] `CoachOutput.animationIntensity` is `"calm"` for high readiness states
- [ ] `CoachOutput.animationIntensity` is `"concerned"` or `"alert"` for low readiness / deload
- [ ] LockeMascot renders the correct animation clip for each intensity level

---

## L — Session Integration (Fatigue Tracking)

> Task #15 complete — `recordSessionFatigue` in `app/session/[id].tsx`. Fire-and-forget; never blocks UI.

### L1 — Post-session fatigue update
- [ ] Completing a session calls `computeSessionFatigue` with the correct exercises and sets
- [ ] Resulting fatigue is merged with decayed existing state via `mergeFatigue`
- [ ] Merged fatigue is persisted via `saveCachedFatigueState` (NOT `saveMuscleFatigue` — decay-at-read pattern requires the timestamped cache form)
- [ ] `clearRecoveryCache()` is called after saving (invalidates 5-min TTL cache in recoveryEstimator)
- [ ] `clearReadinessCache()` is called after saving (invalidates LRU-64 cache in readinessScore)
- [ ] `clearForecastCache()` is called after saving (invalidates 5-min TTL cache in fatigueForecast)
- [ ] The fatigue pipeline is fire-and-forget (`void recordSessionFatigue(...)`) — session completion UI does NOT await it

### L2 — Decay on load
- [ ] When the Recovery Dashboard opens, `CachedFatigueState.computedAt` timestamp is read
- [ ] Decay is applied with exact elapsed hours since `computedAt` using exponential model (half-life = 36 h)
- [ ] User who hasn't trained in 36 h sees ~50% lower fatigue than immediately post-session
- [ ] User who hasn't trained in 72 h sees ~75% lower fatigue than immediately post-session

### L3 — Daily snapshot
- [ ] A `DailySnapshot` is saved after each session completes (keyed by `completedAt` date)
- [ ] `DailySnapshot.overallFatigue` is the unweighted mean across all 16 muscles (simple average, not size-weighted)
- [ ] `DailySnapshot.topMusclesFatigue` contains at most 3 entries — the highest-fatigue muscles with fatigue > 0
- [ ] `saveDailySnapshot` replaces an existing snapshot for the same date (no duplicate entries per calendar day)
- [ ] Snapshot history is capped at 30 days — `saveDailySnapshot` pruning verified after 31+ sessions on different days

### L4 — Training load update
- [ ] `updateTrainingLoad` is called inside `recordSessionFatigue` (fire-and-forget, after session)
- [ ] `saveTrainingLoad` is called with the computed result
- [ ] ACWR is available on next Recovery Dashboard open (not before post-workout screen — fire-and-forget timing)

---

## M — Recovery Dashboard

> Task #13 complete — `app/(tabs)/recovery.tsx`. Tab added to `_layout.tsx` (position 2, heart icon).

### M1 — Data loading
- [ ] Dashboard uses `loadRecoveryBundle` (single `AsyncStorage.multiGet`) — confirm with network inspector that only 1 AsyncStorage batch call fires on mount
- [ ] Skeleton cards are shown while data loads (no flash of empty/white content)
- [ ] On first launch (no data): renders empty state ("No recovery data yet") without crash
- [ ] Pull-to-refresh (`RefreshControl`) reloads data and updates all sections
- [ ] `loadingRef` prevents double-load on React StrictMode double-invoke

### M2 — Readiness score display
- [ ] Score numeral (0–100), label ("Prime" / "Ready" / "Manage Load" / "Recover"), and arc color all match `computeReadiness` output
- [ ] Circular gauge arc fills proportionally to the score (270° sweep at score=100; 0° at score=0)
- [ ] Three breakdown pills show: Freshness (`muscleFreshness`), Block Fit (`blockContext`), Workload (`acwrScore`)
- [ ] Pill values are rounded integers (no decimal places)
- [ ] Score updates on pull-to-refresh after a completed session

### M3 — Heatmap integration
- [ ] Heatmap renders with decayed fatigue values (not raw post-session values)
- [ ] Tapping a muscle opens the bottom sheet with: muscle name, status badge, fatigue bar, tip text
- [ ] Status badge color matches fatigue level (Fresh/green, Warming Up/yellow, Fatigued/orange, Overtrained/red)
- [ ] Closing the bottom sheet (swipe or tap away) dismisses cleanly without state leak

### M4 — Trend graph
- [ ] 7-day trend graph renders when `data.snapshots.length > 0`
- [ ] Trend graph section is hidden entirely when `data.snapshots.length === 0` (no empty-graph render)
- [ ] Overall fatigue line (primary green) is thicker than muscle lines (2.5 vs 1.5 strokeWidth)
- [ ] Legend entries match the lines shown

### M5 — Coach section
- [ ] Locke mascot mood matches `data.coach.mascotMood`
- [ ] Coach headline and subtext are non-empty strings
- [ ] "Tap for tips ↓" hint appears when tips exist; disappears when expanded
- [ ] Tips expand/collapse correctly on card press; tips content matches `data.coach.tips`

### M6 — Deload card
- [ ] Deload card appears when `data.deloadTriggered === true` and `data.blockContext !== null`
- [ ] Deload card body text references the correct block type (accumulation / intensification / realization)
- [ ] Deload card is absent when `data.deloadTriggered === false`
- [ ] ⏳ Dismissing the deload card persists dismissal across tab navigations (requires #16 persistence)

### M7 — Block context badge
- [ ] Block badge in header shows correct block type and week position (e.g. "Accumulation · build")
- [ ] Block badge is hidden when no plan exists
- [ ] Training Load card shows correct ACWR, acute load, and chronic load values
- [ ] Training Load card is hidden when `chronicLoad === 0` (new user with no history)

---

## N — Storage Layer

### N1 — Key isolation
- [ ] Each recovery key uses the `@lockedinfit/` namespace prefix — no collision with workout/plan keys
- [ ] `fatigueState` key and `muscleFatigue` key are distinct (different purposes — decay-at-read vs raw)
- [ ] Clearing one key does not affect other recovery keys

### N2 — Round-trip integrity
- [ ] `saveCachedFatigueState` / `loadCachedFatigueState` round-trips without data loss
- [ ] `saveMuscleFatigue` / `loadMuscleFatigue` round-trips correctly for all 16 muscle groups
- [ ] `saveDailySnapshot` / `loadDailySnapshots` returns snapshots newest-first
- [ ] `saveTrainingLoad` / `loadTrainingLoad` round-trips without loss of floating-point precision

### N3 — Batch loading
- [ ] `loadRecoveryBundle` makes exactly ONE `AsyncStorage.multiGet` call (not two sequential reads)
- [ ] `loadRecoveryBundle` returns `{ fatigueState: null, dailySnapshots: [] }` on first launch
- [ ] `loadRecoveryBundle` returns correct data when both keys have stored values

### N4 — Data lifecycle
- [ ] `clearAllData()` removes all recovery keys (verified by checking each key is null after call)
- [ ] Post-`clearAllData` app launch initializes all recovery state to zero/empty defaults (no crash)
- [ ] Corrupt JSON in any recovery key is silently handled (parse error returns null, not crash)

---

## O — Performance (60fps / <100ms)

### O1 — Animation frame rate
- [ ] MuscleHeatmap pulse animation stays at 60 fps under normal scroll (use Flipper/Perf Monitor)
- [ ] RecoveryTrendGraph fade-in does not drop below 60 fps
- [ ] Switching Recovery Dashboard tabs does not cause a frame drop spike > 2 frames
- [ ] Navigating to the Recovery tab from Home maintains 60 fps during tab bar press

### O2 — Render count
- [ ] MuscleHeatmap does not re-render when parent re-renders with the same `fatigueMap` reference
- [ ] RecoveryTrendGraph does not re-render when parent re-renders with the same `data` reference
- [ ] Readiness score component does not re-render every second (no timer-driven parent state)

### O3 — Computation timing
- [ ] `computeReadiness` completes in < 2ms (verify with `console.time` in development)
- [ ] `estimateAllMuscles` completes in < 5ms
- [ ] Full dashboard data hydration (load + decay + score) completes in < 100ms on target devices
- [ ] `loadRecoveryBundle` (`multiGet`) completes in < 50ms (single round-trip)

### O4 — Memory
- [ ] Module-level caches (recoveryEstimator, readinessScore) do not leak between app sessions (cleared on session complete)
- [ ] No Animated values accumulate across navigation (cancel called before unmount)
- [ ] DailySnapshot history is capped at 30 entries (storage does not grow unboundedly)

### O5 — Slow device simulation
- [ ] Enable JS thread throttle (5× slowdown) in Metro/Flipper; verify pulse animation still runs (UI thread)
- [ ] Enable network throttle; verify dashboard loads without timeout (local AsyncStorage)

---

## P — Accessibility

### P1 — Heatmap
- [ ] Each MuscleHeatmap path has an accessible label (or the parent view has an overall description)
- [ ] Pulsing red muscles do not cause issues for users with photosensitive epilepsy (pulse is slow ≥ 700ms, below 3Hz threshold)
- [ ] Color is not the ONLY indicator of fatigue level (severity labels present elsewhere in UI)

### P2 — Score & labels
- [ ] Readiness score is readable by screen reader (VoiceOver/TalkBack) with label + numeric value
- [ ] Color-coded score badge also displays the text label ("Prime", "Ready", etc.)
- [ ] Trend graph includes a text summary accessible to screen readers (or is marked as decorative)

### P3 — Interactive elements
- [ ] Tab buttons (Front/Back, 7d/30d) have `accessibilityRole="tab"` and `accessibilityState={{ selected }}`
- [ ] Deload dismissal button has a clear accessible label ("Dismiss deload recommendation")
- [ ] Minimum tap target size: 44×44pt for all interactive elements

---

## Q — Theming and Edge Cases

### Q1 — Dark / Light mode
- [ ] All fatigue colors are visible in both dark and light mode
- [ ] Heatmap skin color switches correctly (`#1C2128` dark / `#EDE8E2` light)
- [ ] Dashboard text, labels, and grid lines use theme colors (no hardcoded light/dark hex values on text)

### Q2 — First launch (no data)
- [ ] Recovery tab with zero workout history renders without crash
- [ ] Heatmap shows a completely unfilled body (all muscles at 0)
- [ ] Readiness score = 100 / label = "Prime" with no data
- [ ] Trend graph shows empty state placeholder
- [ ] No deload banner on first launch

### Q3 — Data edge cases
- [ ] User who only trains cardio (no strength sessions) — fatigue map stays empty; readiness = Prime
- [ ] User who only trains one muscle group — heatmap shows fatigue only for that group; all others empty
- [ ] 30+ day training gap — all fatigue decays to ~0; readiness = Prime; ACWR = 0 (handled gracefully)

---

## R — Tab Navigation & Regression

### R1 — Recovery tab entry
- [ ] Recovery tab appears at position 2 in the tab bar (between Home and Log), with a heart icon
- [ ] Heart icon is filled when tab is active, outline when inactive
- [ ] Tab label reads "Recovery" in both light and dark mode
- [ ] Navigating to Recovery tab from any other tab loads the dashboard without a white flash

### R2 — Back-navigation and remount
- [ ] Navigating away from Recovery and back does NOT trigger a fresh `loadRecoveryBundle` call (tab is kept mounted by Expo Router)
- [ ] Pull-to-refresh manually re-fetches data and reflects any session completed since last visit
- [ ] After completing a session and navigating to Recovery, cache invalidation ensures fresh data on pull-to-refresh

### R3 — TypeScript regression guard
- [ ] `ReadinessScore.components` keys in `recovery.tsx` match the type in `lib/types.ts` exactly (`muscleFreshness`, `blockContext`, `streakModifier`, `forecastScore`, `acwrScore`) — no stale keys (`adherenceBonus`, `acwrPenalty`)
- [ ] No TypeScript errors in `hooks/useRecovery.ts` when `computeReadiness` is called (all 5 params provided)
- [ ] `emptyFatigueMap()` spread + partial decayed map produces a valid full `MuscleFatigueMap` for all 16 muscles

### R4 — Concurrent modification guard
- [ ] `loadingRef.current` prevents double-load if `refresh` is called twice in rapid succession
- [ ] `recordSessionFatigue` errors are swallowed silently in production (no unhandled rejection bubbling to the session screen)

---

*Checklist generated by perf-engineer agent · 2026-02-28*
*Last updated: 2026-02-28 — Tasks #13, #15 resolved. Task #16 (polish) in progress.*
*Remaining ⏳: G3, H3, M6 (deload dismiss persistence), P3 (accessibility). Re-test when #16 merges.*
