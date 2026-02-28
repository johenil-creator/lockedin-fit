# LockedInFIT — Manual QA Checklist

**Date**: 2026-02-27
**Version**: Sprint — Block Periodization + Auto-Fill Engine

---

## 1. Catalog Plan Selection

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 1.1 | Open app fresh (no plan loaded) | Home shows "No plan" state, Browse Plans CTA visible | |
| 1.2 | Navigate to Plans catalog | 12+ plans displayed with name, goal, difficulty | |
| 1.3 | Tap a plan card | Detail screen shows plan description, weeks, days/week | |
| 1.4 | Start plan | Plan loads, Week 1 Day 1 shown | |
| 1.5 | Plan persists after app restart | Same plan + progress visible after kill/reopen | |
| 1.6 | Switch plan mid-programme | Old progress cleared, new plan Week 1 Day 1 shown | |

---

## 2. Block Periodization & Week Variety (Critical)

> 12-week programme = 3 blocks × 4 weeks. Consecutive weeks must always differ.
> Block 1 (W1-4): Accumulation — 8-12 reps compounds, 12-15 reps accessories
> Block 2 (W5-8): Intensification — 4-8 reps compounds, 10-12 reps accessories
> Block 3 (W9-12): Realization — 2-5 reps compounds, 8-10 reps accessories
> Weeks 4, 8, 12 are always deloads (3 sets / reduced volume).

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 2.1 | Browse Week 1 → Week 2 | Exercise names rotate (Block 1: all 4 variations used) | |
| 2.2 | Browse Week 2 → Week 3 | Sets increase (4→5 for compounds) | |
| 2.3 | Check Week 4 (deload) | 3 sets for compounds (vs 5 sets W3), higher reps (12) | |
| 2.4 | Browse Week 4 → Week 5 | Block 2 begins — reps drop to 6, compounds anchor on primary variation | |
| 2.5 | Browse Week 8 → Week 9 | Block 3 begins — intensity peaks, 4 reps for compounds | |
| 2.6 | Check Week 12 (deload) | 3 sets, reps back to 5 (linear) or 8 (percentage) | |
| 2.7 | Verify Week 12 ≠ Week 1 | Different sets/reps (W12 is deload, W1 is accumulation) | |
| 2.8 | Check any plan: W3 sets > W4 sets | W3 peak stress > W4 deload | |
| 2.9 | Check any plan: W7 sets > W8 sets | W7 peak stress > W8 deload | |
| 2.10 | Check any plan: W11 sets > W12 sets | W11 peak stress > W12 deload | |

---

## 3. Session Start from Plan

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 3.1 | Tap "Start Session" for Week 1 Day 1 | Session screen opens with correct exercises | |
| 3.2 | Exercise list matches plan day | Same exercises shown in plan browser | |
| 3.3 | Sets/reps match plan prescription | Week 1 compound shows correct sets×reps | |
| 3.4 | Warm-up sets appear for compounds | Compounds with warmUpSets > 0 show warm-up rows | |
| 3.5 | Rest timer displays correct time | Default rest time from plan slot (90s, 120s, etc.) | |
| 3.6 | Only one active session | Starting new session ends previous active session | |

---

## 4. Auto-Fill Weights (Critical)

> No exercise should show blank weight if user has 1RM data or history.

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 4.1 | Set squat 1RM, start squat session | Working weight auto-populated | |
| 4.2 | Squat Week 1 weight < Week 9 weight | Intensity increases across programme | |
| 4.3 | Week 4 (deload) weight < Week 3 | Deload shows reduced intensity | |
| 4.4 | Accessory exercise, no 1RM | Weight blank (Tier 3 — expected) | |
| 4.5 | Accessory with history | Weight populated from last session + RPE adjustment | |
| 4.6 | Romanian Deadlift auto-fill | ~75% of deadlift 1RM (hinge modifier) | |
| 4.7 | Bench Press auto-fill | ~100% intensity × week prescription | |
| 4.8 | Overhead Press auto-fill | Uses OHP 1RM, not bench | |
| 4.9 | Warm-up sets have graduated weights | 50%, 60%, 70%… of 1RM, lower reps | |
| 4.10 | No NaN or 0 in weight fields | All populated weights are valid numbers | |

---

## 5. Session Lifecycle

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 5.1 | Mark all sets complete | Session end screen triggers | |
| 5.2 | Pause session mid-workout | Timer pauses, data persists | |
| 5.3 | Resume paused session | Timer resumes, no data lost | |
| 5.4 | Kill app mid-session | Session still active on reopen | |
| 5.5 | Complete session | workout-complete screen shown | |
| 5.6 | Session marked as completed | Day marked done in plan progress | |
| 5.7 | Next day unlocked after completion | Next plan day shows "Start" (not locked) | |
| 5.8 | Cannot start same day twice | Day shows "Completed" badge | |
| 5.9 | isActive flag cleared on complete | No zombie active sessions in storage | |

---

## 6. XP and Rank

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 6.1 | Complete 5-set session | +10 XP (5 sets × 2) + 15 session bonus = 25 XP | |
| 6.2 | Hit PR in session | Additional +10 XP awarded | |
| 6.3 | 3-day streak | +5 XP bonus awarded once | |
| 6.4 | 7-day streak | +10 XP bonus awarded once (not re-awarded) | |
| 6.5 | Streak milestone idempotency | Same milestone not awarded twice across sessions | |
| 6.6 | Rank progression | Runt → Scout at 100 XP (verify threshold) | |
| 6.7 | Rank-up bonus | +20 XP when rank changes | |
| 6.8 | Rank shown on profile | Current rank image + label correct | |
| 6.9 | XP history preserved | History shows all past entries | |
| 6.10 | xpClaimed flag | Completing same session twice does not re-award XP | |

---

## 7. Plan Completion

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 7.1 | Complete all 12 weeks × days | isPlanComplete = true | |
| 7.2 | Plan complete screen shown | Celebration / summary visible | |
| 7.3 | Plan complete persists | After restart, plan still shows complete | |
| 7.4 | Start new plan after completion | Old progress cleared, new plan fresh | |

---

## 8. Edge Cases

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 8.1 | No profile / no 1RM | App does not crash, weights blank | |
| 8.2 | No internet connection | App works fully offline | |
| 8.3 | Very long exercise name | No overflow / truncation handled | |
| 8.4 | AMRAP reps field | "AMRAP" displayed correctly | |
| 8.5 | "30s" / "45-60s" reps | Time-based reps shown without crash | |
| 8.6 | Week 12 (final deload) | Only primary variation shown (no rotation) | |

---

## 9. Regression — Previous Bugs Fixed

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 9.1 | Week 1 same as Week 2 (bug) | FIXED — each week has unique exercises | |
| 9.2 | All weeks identical sets/reps (bug) | FIXED — sets/reps vary across all 12 weeks | |
| 9.3 | Deload weeks not reduced (bug) | FIXED — W4/W8/W12 have fewer sets | |
| 9.4 | Auto-fill returns blank for compound (bug) | FIXED — 1RM auto-fill works for all compounds | |
| 9.5 | Keyboard not dismissed on save (bug) | FIXED — keyboard dismisses on modal save/cancel | |

---

## Automated Test Results

Run: `npx ts-node __tests__/catalog.validation.ts` (or Jest when configured)

| Test Suite | Status |
|-----------|--------|
| All plans have 12 weeks | |
| No consecutive identical weeks | |
| Deload weeks have reduced volume | |
| Block rep ranges correct | |
| All exercises classify to valid patterns | |
| Auto-fill returns weight for compound exercises | |
