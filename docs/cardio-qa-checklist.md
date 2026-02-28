# Cardio Feature — QA Checklist

> Status: **DRAFT** — written ahead of integration (Task #8). Update after integration is merged.
>
> Test device targets: iOS (iPhone 14 Pro, iOS 17+), Android (Pixel 7, API 34).
>
> All expected XP values use base rates from `lib/xpService.ts`:
> - Per virtual set: 2 XP
> - Session complete bonus: 15 XP
> - PR bonus: 10 XP

---

## A — Cardio Setup Flow

### A1 — Modality Selection
- [ ] All cardio modalities appear (Run, Bike, Row, Swim, Elliptical, Stairmaster, Jump Rope, Other)
- [ ] Selecting a modality highlights it visually and advances to goal step
- [ ] Modality icons/labels are readable in both light and dark themes
- [ ] Back navigation from goal step restores the previously selected modality (no reset)

### A2 — Goal Selection
- [ ] All goal types appear (Steady-State, Intervals, HIIT, Distance Target, Time Target)
- [ ] Selecting "Intervals" reveals interval configuration fields (rounds, work duration, rest duration)
- [ ] Selecting "HIIT" reveals intensity distribution fields
- [ ] Selecting "Steady-State", "Distance Target", or "Time Target" shows only the relevant inputs
- [ ] Minimum interval work duration is enforced (>= 10 seconds; no silent acceptance of 0)
- [ ] Minimum interval rest duration is enforced (>= 0 seconds; 0 is valid for AMRAP-style)
- [ ] Maximum rounds cap is enforced (no negative or absurdly high values crashing the timer)
- [ ] Back navigation from intensity step restores previously selected goal (no reset)

### A3 — Intensity / RPE Selection
- [ ] RPE scale (1–10) is displayed with descriptive labels at key points (e.g., 1=Rest, 5=Moderate, 10=Max)
- [ ] Selecting RPE updates the expected XP preview (if shown)
- [ ] Distance target field accepts numeric input only; non-numeric characters are rejected
- [ ] Duration target field accepts numeric input only; negative values are rejected
- [ ] Unit preference (km vs mi, kg vs lbs) from user profile is respected throughout setup

### A4 — Start Cardio Session
- [ ] Tapping "Start" creates a cardio session and navigates to the session screen
- [ ] An active session banner appears on the Home screen while session is in progress
- [ ] Starting cardio does NOT interfere with any in-progress strength session (alert or block)
- [ ] Session `startedAt` timestamp is recorded in ISO format at tap time
- [ ] Session appears in workout log with "Active" badge while in progress

---

## B — Cardio Session Screen

### B1 — Timer Behavior
- [ ] Main elapsed timer starts at 00:00 and counts up immediately on session start
- [ ] Timer continues running when the app is backgrounded (background timer / AppState handling)
- [ ] Timer resumes correctly on foreground return (no double-counting, no reset)
- [ ] Timer displays hours when session exceeds 59:59 (format: H:MM:SS, e.g., 1:05:32)
- [ ] Timer is readable at a glance; font size is appropriate for quick checks mid-workout

### B2 — Pause and Resume
- [ ] Tapping Pause freezes the main timer immediately
- [ ] Tapping Resume restarts the timer from the paused position (no drift)
- [ ] Pausing prevents interval advancement (if applicable)
- [ ] Backgrounding while paused does NOT restart the timer on foreground
- [ ] Pause state is visually distinct (e.g., pulsing indicator stops, button label changes)
- [ ] Multiple rapid pause/resume taps do not cause timer drift or double-counting

### B3 — Interval Mode
- [ ] Work phase countdown starts at selected work duration, counts down to 0
- [ ] Rest phase countdown starts at selected rest duration, counts down to 0
- [ ] Transition from work to rest plays audio or haptic cue
- [ ] Transition from rest to next work interval plays audio or haptic cue
- [ ] Interval number increments correctly (e.g., "Interval 3 of 8")
- [ ] Final interval completion triggers session-end prompt rather than cycling back
- [ ] Skipping an interval manually advances correctly (no off-by-one in count)
- [ ] Pausing during work phase pauses the work countdown (not the rest countdown)
- [ ] Pausing during rest phase pauses the rest countdown

### B4 — Ending the Session
- [ ] Tapping "End Session" shows a confirmation prompt before completing
- [ ] Dismissing the confirmation returns to the live session (no data loss)
- [ ] Confirming end records `completedAt` timestamp and calculates duration correctly
- [ ] Minimum session duration is enforced for XP (sub-1-minute sessions receive 0 or base XP only — confirm threshold with Systems team)
- [ ] Session `isActive` flag is cleared on completion
- [ ] Session `xpClaimed` starts as `false` on completion (user must tap Claim XP)

---

## C — XP Calculation

> Reference: `lib/xpService.ts` — `awardSessionXP` and virtual set logic.
>
> **Virtual Set Formula (to be confirmed with Systems team):**
> `virtualSets = floor(durationMinutes / minutesPerVirtualSet)`
> where `minutesPerVirtualSet` depends on intensity/RPE.

### C1 — Virtual Set Calculation
- [ ] 10-minute session at RPE 5 → expected virtual sets: confirm with Systems team
- [ ] 30-minute session at RPE 6 (steady-state) → expected total XP: ~45 XP (30 virtual sets × 2 XP = 60, + 15 session bonus, minus any cap)
- [ ] 60-minute session at RPE 7 → virtual sets do not exceed the defined cap (confirm cap value with Systems team)
- [ ] 5-minute session → virtual sets = 0 (below minimum threshold); only session bonus applies
- [ ] RPE multiplier is applied before rounding (not after)
- [ ] Duration used for virtual set calculation is `completedAt - startedAt`, NOT session elapsed display time
- [ ] Paused duration is subtracted from active duration before XP calculation

### C2 — XP Multipliers
- [ ] RPE 1–3 (very light): multiplier <= 1.0
- [ ] RPE 4–6 (moderate): baseline multiplier = 1.0
- [ ] RPE 7–8 (hard): multiplier > 1.0
- [ ] RPE 9–10 (max): multiplier at or near cap (confirm cap with Systems team)
- [ ] Interval sessions with high RPE work phases receive appropriate multiplier
- [ ] HIIT sessions do not receive a multiplier greater than the defined maximum

### C3 — XP Caps
- [ ] Single cardio session cannot award more than the defined per-session XP cap (confirm value with Systems team)
- [ ] Cap is applied to total (sets + session bonus + PR bonus) not to each component individually
- [ ] Cap does not block streak milestone XP or rank-up bonus (these apply after the session cap)

### C4 — Idempotency
- [ ] Tapping "Claim XP" a second time does NOT double-award XP (button becomes disabled after first claim)
- [ ] Navigating back from workout-complete screen and re-opening does NOT re-trigger XP award
- [ ] `xpClaimed` flag is persisted to AsyncStorage before navigation away from workout-complete screen
- [ ] Reopening the app and navigating to the completed session shows `xpClaimed: true` (no re-claim UI)

### C5 — Expected Value Reference Cases

| Scenario | Duration | RPE | Expected Virtual Sets | Session Bonus | PR Bonus | Approx Total XP |
|---|---|---|---|---|---|---|
| Short easy run | 20 min | 4 | TBD by Systems | 15 | 0 | ~TBD |
| Steady-state bike | 30 min | 6 | TBD | 15 | 0 | ~45 |
| Hard interval run | 30 min | 8 | TBD (× multiplier) | 15 | +10 if PR | ~TBD |
| Max HIIT | 20 min | 10 | TBD (capped) | 15 | 0 | capped total |
| Sub-minimum session | 4 min | 7 | 0 | 15 | 0 | 15 |

> NOTE: Fill in exact values once Systems team documents the formula constants.

---

## D — PR Detection

> PR detection for cardio differs from strength. Confirm all 8 PR types with Systems team before testing.
> Assumed PR types for cardio (to be verified):
> 1. Longest Distance (any modality)
> 2. Fastest Pace / Mile (run)
> 3. Longest Duration (any modality)
> 4. Most Calories (any modality, if tracked)
> 5. Fastest 5K
> 6. Fastest 10K
> 7. Most Intervals Completed
> 8. Highest Avg Watts (bike/row)

### D1 — All 8 PR Types
- [ ] PR type 1 (Longest Distance): triggered when distance exceeds all prior sessions for that modality
- [ ] PR type 2 (Fastest Pace): triggered only when pace improves (lower is better); edge case: pace cannot be 0
- [ ] PR type 3 (Longest Duration): triggered when elapsed active time exceeds all prior for that modality
- [ ] PR type 4 (Most Calories): triggered when calories exceed prior sessions (only if calorie tracking enabled)
- [ ] PR type 5 (Fastest 5K): triggered only for run modality; distance must be >= 5K
- [ ] PR type 6 (Fastest 10K): triggered only for run modality; distance must be >= 10K
- [ ] PR type 7 (Most Intervals): triggered when completed interval count exceeds prior sessions
- [ ] PR type 8 (Highest Avg Watts): triggered only for bike/row modality; watts must be > 0
- [ ] Each PR type stores a timestamp and session ID for the record
- [ ] PR display name on the completion screen matches the PR type (e.g., "Fastest 5K" not "PR Hit")

### D2 — Strict Improvement (Equal Does Not Count)
- [ ] Distance PR: matching prior best (equal) does NOT trigger PR (must be strictly greater)
- [ ] Duration PR: matching prior best (equal) does NOT trigger PR
- [ ] Pace PR: matching prior best (equal) does NOT trigger PR (must be strictly faster)
- [ ] Watts PR: matching prior best (equal) does NOT trigger PR
- [ ] First-ever cardio session of that modality DOES trigger PR (baseline = no prior record)

### D3 — Caps
- [ ] More than 3 PRs in a single session: display capped at 3 PR pills on completion screen (confirm cap with Systems team)
- [ ] XP awarded for PR is flat +10 regardless of how many PRs hit in a session (no per-PR stacking unless documented otherwise)
- [ ] Calorie-based PRs are only evaluated when calorie data is available (HealthKit or manual entry); no PR for "0 calories"

### D4 — No Duplicates
- [ ] Running two sessions back-to-back for the same modality: second session only gets PR if it truly exceeds the first
- [ ] PR check reads from persisted storage, not from in-memory state, to survive app restarts
- [ ] Deleting a session from the log does NOT incorrectly restore the PR that session set (PR record should be immutable once set, or recalculated — confirm with Systems team)

---

## E — Badge System

> 11 badges to be verified. Badge list to be confirmed with Systems team.
> Assumed badges (to be verified):
> 1. First Cardio Session
> 2. Cardio Streak — 3 Days
> 3. Cardio Streak — 7 Days
> 4. Distance Milestone — 5K First Time
> 5. Distance Milestone — 10K First Time
> 6. Distance Milestone — 21K First Time (Half Marathon)
> 7. Interval Warrior — Complete 10 Interval Sessions
> 8. Endurance — Complete a 60-Minute Session
> 9. Speed Demon — Achieve Sub-6-Minute Mile Pace
> 10. Early Bird — Complete a Cardio Session Before 7 AM
> 11. Iron Lungs — Complete Cardio Sessions on 30 Different Days

### E1 — All 11 Badges Unlock Correctly
- [ ] Badge 1 (First Cardio Session): unlocks after first ever completed cardio session
- [ ] Badge 2 (3-Day Cardio Streak): unlocks after 3 consecutive days with completed cardio (not reset by rest days unless streak breaks)
- [ ] Badge 3 (7-Day Cardio Streak): unlocks after 7 consecutive days
- [ ] Badge 4 (5K First Time): unlocks first time user completes a run with distance >= 5.0 km / 3.1 mi
- [ ] Badge 5 (10K First Time): unlocks first time user completes a run >= 10.0 km / 6.2 mi
- [ ] Badge 6 (Half Marathon): unlocks first time user completes a run >= 21.1 km / 13.1 mi
- [ ] Badge 7 (Interval Warrior): counter increments per completed interval session; badge at 10
- [ ] Badge 8 (Endurance): unlocks when a single session duration >= 60 minutes (3600 seconds active time)
- [ ] Badge 9 (Speed Demon): unlocks when any run segment achieves pace < 6:00/mi; unit conversion respected
- [ ] Badge 10 (Early Bird): session `startedAt` hour < 07:00 local time (not UTC)
- [ ] Badge 11 (Iron Lungs): counter increments by distinct calendar day; badge at 30

### E2 — One-Time Unlock
- [ ] Each badge is awarded exactly once; completing the trigger condition again does NOT re-award
- [ ] Badge unlock is persisted to AsyncStorage before completion screen navigation
- [ ] Newly unlocked badges appear on the completion screen on the session they are earned
- [ ] Badge unlock does NOT appear again on a subsequent session that also meets the criteria

### E3 — No XP for Badges
- [ ] Badge unlock does NOT add any XP entry to `XPRecord.history`
- [ ] XP breakdown on completion screen does NOT list badge unlock as a line item
- [ ] Total XP awarded is identical whether 0 or 5 badges are unlocked in the same session

---

## F — Completion Screen

### F1 — Cardio Stats Display
- [ ] Duration displays correctly formatted (MM:SS for < 1 hour; H:MM:SS for >= 1 hour)
- [ ] Distance (if tracked) displays in user's preferred unit (km or mi) with 2 decimal places
- [ ] Calories (if tracked) display as integer (no decimals)
- [ ] Modality name appears in the completion headline (e.g., "Run Complete!" not "Workout Complete!")
- [ ] Average pace displayed for run sessions (formatted as MM:SS / unit)
- [ ] Interval count displayed for interval sessions
- [ ] Completion percentage card shows 100% for sessions where all intervals were completed
- [ ] Duration card shows active time only (paused time excluded)

### F2 — PR Pills
- [ ] Each new PR surfaces as a pill/badge with descriptive label (e.g., "Fastest 5K", "Longest Run")
- [ ] PR pills animate in on screen entry (consistent with strength PR display)
- [ ] Up to 3 PR pills shown; if more than 3 PRs achieved, an overflow indicator appears (e.g., "+2 more")
- [ ] No PR pills shown if no PRs were achieved
- [ ] PR pills do not appear if the session was not completed (abandoned sessions have no PRs)

### F3 — Badge Display
- [ ] Newly unlocked badges appear below PR pills (or in a dedicated section)
- [ ] Badge icon and name are shown correctly
- [ ] Previously earned badges do NOT appear on the completion screen
- [ ] If no new badges earned, badge section is hidden entirely (no empty placeholder)
- [ ] Multiple badges display in a horizontal scroll or grid without overflow clipping

### F4 — Level Up Overlay
- [ ] LevelUpOverlay appears after CLAIM XP if `rankedUp === true`
- [ ] Rank image, rank name, and flavor text for new rank are correct for all 7 ranks (Runt → Apex)
- [ ] Particle burst animation fires on overlay entry
- [ ] Haptics fire at overlay entry (Success) and rank name appear (Heavy)
- [ ] "CONTINUE" button navigates to Home screen (not back to session)
- [ ] Back hardware button is blocked during overlay (Android)
- [ ] LevelUpOverlay does NOT appear if session was completed but no rank-up occurred

### F5 — Claim XP Interaction
- [ ] "CLAIM XP" button is enabled on screen entry and disabled immediately after first tap
- [ ] Button label changes to "CLAIMED!" after tap
- [ ] XP counter animates from 0 to awarded value over ~800ms
- [ ] XP stat card pulses (scale animation) on claim
- [ ] Tapping "CLAIM XP" a second time (rapid double-tap) does NOT double-execute handler
- [ ] After claiming (no rank-up), navigation to Home occurs after ~1200ms

---

## G — Integration

### G1 — Workout Log
- [ ] Completed cardio session appears in workout log with:
  - [ ] Session name (modality + date or user-defined name)
  - [ ] "Done" green badge
  - [ ] Date displayed correctly
  - [ ] Exercise count shows "1 exercise" (or equivalent for cardio entry)
- [ ] Cardio session is tappable and navigates to session detail view
- [ ] Session detail view shows cardio-specific stats (duration, distance, modality) — not strength set/rep table
- [ ] Swiping to delete a cardio session removes it from the log without errors
- [ ] Deleting a cardio session does NOT reset the PR record incorrectly (confirm behavior with Systems)

### G2 — Calendar Integration
- [ ] Cardio session appears as a dot on the CalendarGrid on its completion date
- [ ] Filtering by date (tapping a calendar day) shows the cardio session in the filtered list
- [ ] Multiple sessions on the same day (e.g., strength + cardio) both appear under that date

### G3 — Streak
- [ ] Completing a cardio session counts toward the daily activity streak
- [ ] Streak increments when `lastActivityDate` is yesterday or today
- [ ] Completing cardio on the same day as a strength session does NOT increment streak twice
- [ ] Streak milestone XP (3, 7, 14, 30, 60, 100 days) awarded correctly when cardio session completes the milestone day

### G4 — Home Screen CTAs
- [ ] Home screen shows "Start Session" CTA when plan is active (strength); cardio sessions do not interfere with plan state
- [ ] Home screen shows "Quick Workout" CTA; confirm cardio is accessible from quick-workout flow (if applicable)
- [ ] Active cardio session banner appears on Home: "Session in Progress — [session name] — tap to continue"
- [ ] Tapping the active session banner navigates to the correct in-progress cardio session
- [ ] After completing cardio session, active session banner is cleared from Home screen

### G5 — Locke Tips and Suggestions (from Task #6/#7)
- [ ] Locke tip card appears on the cardio session screen
- [ ] Tips are relevant to the selected modality (run tips for running, general tips for other)
- [ ] Tips rotate or can be dismissed without crashing
- [ ] Locke mascot mood on workout-complete screen is "celebrating" for cardio completions
- [ ] Locke `session_complete` trigger fires after cardio completion (check `LockeContext`)
- [ ] If the session achieves a PR, Locke `pr_hit` trigger fires (`LockeMachineEvent.PR_ACHIEVED`)

### G6 — TypeScript Correctness
- [ ] `WorkoutSession` type (or new `CardioSession` type) is correctly typed; no `any` casts in cardio-specific code
- [ ] New PR types are exported from `lib/types.ts` and imported consistently
- [ ] New badge types are exported from `lib/types.ts`
- [ ] `WorkoutCompleteParams` (or a `CardioCompleteParams` variant) includes all cardio-specific fields
- [ ] `awardSessionXP` function receives correct virtual-set count, not raw set count
- [ ] TypeScript strict mode passes with no new errors: `npx tsc --noEmit`

### G7 — Onboarding Navigation Leak Check
- [ ] Completing onboarding and immediately starting a cardio session does NOT navigate back to onboarding
- [ ] `onboardingComplete` is set to `true` before navigating to Home from any onboarding exit path
- [ ] Profile context `hydrated` flag is `true` before onboarding check runs (no race condition)
- [ ] Re-opening the app after completing onboarding does NOT flash the onboarding screen before Home
- [ ] "Skip" in onboarding sets `onboardingComplete: true` — skipping users can still access cardio

---

## DEV Log — Expected Console Output

> Add these `console.log` / `console.debug` statements in the relevant services. Remove or gate behind `__DEV__` before production.

### Virtual Set Calculation
```
[CARDIO XP] Duration: 30 min | RPE: 6 | Multiplier: 1.0 | Virtual sets: 15 | Set XP: 30
```
Expected for 30 min steady RPE 6:
- virtualSets = floor(30 / minutesPerSet) — confirm `minutesPerSet` constant
- setXP = virtualSets × 2
- sessionBonus = 15
- totalXP = setXP + 15 (before PR/streak bonuses)

### XP Breakdown
```
[CARDIO XP BREAKDOWN]
  Sets (15 virtual): +30 XP
  Session complete:  +15 XP
  Personal record:   +10 XP  (if applicable)
  Streak (7 days):   +10 XP  (if applicable)
  Rank up:           +20 XP  (if applicable)
  TOTAL AWARDED:     +85 XP
```

### PR Detection Results
```
[CARDIO PR CHECK] Modality: run | Session distance: 8.2 km
  Previous best distance: 6.4 km → NEW PR: Longest Run
  Previous best pace: 5:45/km | Current pace: 5:30/km → NEW PR: Fastest Pace
  PR count this session: 2
```
Expected: 2 PR pills on completion screen, +10 XP (single PR bonus).

### Badge Check Results
```
[BADGE CHECK] Evaluating 11 badges for session: <sessionId>
  Badge: first_cardio_session → SKIPPED (already unlocked on 2026-01-15)
  Badge: cardio_streak_3 → UNLOCKED (streak: 3 days)
  Badge: endurance_60min → SKIPPED (duration: 1820s < 3600s)
  ...
  New badges this session: [cardio_streak_3]
```
Expected: only newly unlocked badges shown on completion screen.

---

## Edge Cases — Additional Checks

- [ ] Session with 0 seconds duration (immediate end) — no crash, minimal XP (session bonus only)
- [ ] Distance entered as 0.0 — no distance PR triggered
- [ ] RPE not set (default value) — XP calculation uses default multiplier (confirm default with Systems)
- [ ] App killed mid-session — on relaunch, session is still in "Active" state in workout log; user can resume or abandon
- [ ] Two rapid taps on "End Session" confirm — only one completion recorded (idempotent end handler)
- [ ] Rank-up triggered by streak milestone XP (not session XP) — `didRankUp` still detects and shows overlay
- [ ] Apex rank user — no level-up overlay shown; `nextRankName` is `null`; XP bar shows "MAX"
- [ ] Offline mode — all cardio data persists to AsyncStorage; no network calls required
- [ ] Unit switch (kg ↔ lbs, km ↔ mi) mid-session — stats on completion screen use unit active at session start
