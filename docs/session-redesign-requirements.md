# Session Screen Redesign Requirements

**Goal**: Redesign `app/session/[id].tsx` to visually match the 1RM test screen (`app/orm-test.tsx`) while preserving all existing session functionality.

---

## 1. Header

### Current (Session)
- Left: `<-` back arrow (Pressable, navigates back)
- Center: Session name + "Active" badge + elapsed timer + date
- Right: `completedSets/totalSets` Badge + UnitToggle (kg/lbs pill switcher)

### Target (match ORM test)
- **Left**: `X` exit button (`fontSize: 24`, `color: theme.colors.muted`, `padding: 4`) — opens an "End Session?" confirmation modal (replaces inline Alert)
- **Center**: Session name (bold, `fontSize: 17`) + elapsed timer (monospace, `fontSize: 12`, muted) — vertically stacked
- **Right**: Static unit label (`unit.toUpperCase()`, `fontSize: 13`, `fontWeight: 700`, `letterSpacing: 0.5`, muted) — NOT a toggle. The unit is locked for the session (set from `profile.weightUnit` on session start or from existing session data).
- Spacing: `paddingHorizontal: 24`, `marginBottom: 12`
- Row layout: `flexDirection: "row"`, `justifyContent: "space-between"`, `alignItems: "center"`

### Behavior Change
- The UnitToggle component is removed. Unit is fixed for the session.
- The back arrow (`<-`) becomes an `X` button that triggers an exit modal (see Section 7).

---

## 2. Progress Bar

### Current (Session)
- No progress bar. Only a Badge showing `completedSets/totalSets`.

### Target (match ORM test's `OrmProgressBar`)
- Add an animated progress bar below the header.
- **Track**: `height: 6`, `borderRadius: 3`, `backgroundColor: theme.colors.mutedBg`
- **Fill**: Animated via `react-native-reanimated` `useSharedValue` + `withTiming(400ms)`. `backgroundColor: theme.colors.primary`. Absolute-positioned, left-aligned.
- **Label**: Below the bar. `fontSize: 12`, `fontWeight: 600`, `letterSpacing: 0.3`, muted color.
  - Format: `"Set {completedSets} of {totalSets}"` (adapting ORM's "Lift X of Y")
- Container: `paddingHorizontal: 24`, `marginBottom: 24`
- `onLayout` to measure track width, then animate fill to `trackWidth * (completedSets / totalSets)`.

---

## 3. Locke Mascot

### Current (Session)
- No Locke mascot on the session screen.

### Target (match ORM test)
- Add `<LockeMascot size="icon" mood={...} />` centered between the progress bar and scroll content.
- Container: `alignItems: "center"`, `marginVertical: 8`
- **Mood logic**:
  - Default: `"encouraging"` (session in progress)
  - All sets complete: `"celebrating"`
  - Session has PR (detected live if possible, or just keep encouraging): `"intense"` if 80%+ sets done
- Keep it simple: `encouraging` during session, `celebrating` when `completedSets === totalSets`.

---

## 4. Set Table Layout

### Current (Session)
- Inside a `Card` per exercise.
- Header row: `Set | Weight | Reps | checkmark` with basic flex layout.
- Column widths: Set=`28`, Weight=`flex:1`, Reps=`flex:1`, Check=`36`.
- Set number column: plain text `W1, W2...` for warm-ups, `1, 2...` for working sets.

### Target (match ORM test column system)
- **Column widths** (matching ORM test exactly):
  - `setColNum`: `width: 56` (wider, to accommodate warm-up labels like "W1", "W2", percentage labels)
  - `setColWeight`: `flex: 1`, `marginRight: 8`
  - `setColReps`: `flex: 1`, `marginRight: 8`
  - `setColCheck`: `width: 36`
- **Header row** (matching ORM test):
  - Labels: `SET | WEIGHT | REPS | DONE`
  - Style: `fontSize: 10`, `fontWeight: 700`, `letterSpacing: 0.8`, `textTransform: "uppercase"`, muted color
  - `marginBottom: 8`
- **Set rows**:
  - `flexDirection: "row"`, `alignItems: "center"`, `marginBottom: 8`
  - Weight input: `borderRadius: 6`, `paddingVertical: 8`, `paddingHorizontal: 10`, `fontSize: 14`, `textAlign: "center"`, `backgroundColor: theme.colors.mutedBg`
  - Reps input: same style as weight input
  - Checkmark button: `width: 36`, `height: 36`, `borderRadius: 6`, centered. Uncompleted: `bg: mutedBg`, `color: muted`. Completed: `bg: primary`, `color: primaryText`.
- **Warm-up set styling**:
  - Set number column shows `W1`, `W2`, etc. in `theme.colors.accent` (matching current behavior but in the wider 56px column)
  - Row opacity: `0.85` for warm-up sets (current behavior, keep)
- **Working set styling**:
  - Set number column shows `1`, `2`, etc. in `theme.colors.muted`
  - Full opacity

---

## 5. Checkmark Buttons & Rest Timers

### Current (Session)
- Checkmark toggles `completed` on/off.
- On completion: haptic feedback + starts a rest timer.
- Rest timer: pill below the set row, shows `Rest: M:SS`, tappable to dismiss.

### Target
- **Checkmark**: Keep toggle behavior (session sets can be un-checked, unlike ORM test). Match ORM test visual style:
  - `width: 36`, `height: 36`, `borderRadius: 6`
  - Uncompleted: `bg: theme.colors.mutedBg`, checkmark in `theme.colors.muted`
  - Completed: `bg: theme.colors.primary`, checkmark in `theme.colors.primaryText`
  - Haptic feedback on check (keep existing `Haptics.impactAsync(Medium)`)
- **Rest timer**: Keep existing pill design but move it to sit below the set row within the same exercise section. Style stays the same (accent-tinted bg, monospace countdown).

---

## 6. Exercise Management

### Current (Session)
- Each exercise wrapped in a `Card`.
- Exercise header: name (left) + `X` remove button (right).
- Notes: LockeTips or editable note input.
- `+ Set` button at bottom of each exercise card.
- `Add Exercise` button below all cards (opens modal picker).

### Target (keep all functionality, restyle cards)
- **Exercise card**: Keep the `Card` wrapper. No visual change to the Card component itself.
- **Exercise header**:
  - Name: `fontSize: 17`, `fontWeight: 600` (keep current)
  - Remove button: `X` in muted color (keep current)
- **Notes section**: Keep as-is (LockeTips + editable notes). No change needed.
- **`+ Set` button**: Keep as-is at bottom of card.
- **`Add Exercise` button**: Keep as-is below all cards. Stays as `Button variant="secondary"`.
- **Exercise picker modal**: Keep existing modal with plan exercise list + manual input. No visual changes needed here (it already uses the bottom-sheet pattern matching ORM test's exit modal).

---

## 7. End Session Flow

### Current (Session)
- "End Session" button at bottom of ScrollView (only shown when `session.isActive`).
- Uses `Alert.alert` for confirmation.
- On confirm: marks session complete, awards XP, records streak, detects PRs, fires Locke trigger, navigates home.

### Target (match ORM test's exit modal pattern)
- **Replace Alert with a proper Modal** (matching ORM test's `ExitModal` pattern):
  - Bottom sheet style: `borderTopLeftRadius: 16`, `borderTopRightRadius: 16`, `padding: 24`, `paddingBottom: 40`
  - Overlay: `rgba(0,0,0,0.4)`
  - Animation: `animationType="slide"`
  - Content:
    - Title: "End Session?" (`fontSize: 20`, `fontWeight: 700`)
    - Body: `"{completedSets}/{totalSets} sets completed across {exerciseCount} exercise(s)."` (`fontSize: 14`, `lineHeight: 20`, muted)
    - Buttons (vertical stack, matching ORM test modal):
      1. **"End Session"** — primary button. Runs all existing end-session logic (XP, streak, PR, Locke, performance week, navigate home).
      2. **"Discard Session"** — danger variant. Deletes/discards the session without saving completion data. Shows a nested Alert confirmation before discarding.
      3. **"Keep Going"** — secondary button. Closes the modal.
- **Trigger**: The `X` button in the header opens this modal. Remove the bottom "End Session" button.
- **All existing post-session logic MUST be preserved exactly**:
  - `updateWorkout` with `isActive: false`, `completedAt`
  - `recordActivity()` for streak
  - PR detection (Epley 1RM comparison across previous sessions)
  - `awardSessionXP` call
  - `buildPerformanceWeek` + `upsertPerformanceWeek`
  - `fire()` Locke trigger (rank_up / pr_hit / streak_milestone / session_complete)
  - `router.replace("/")`

---

## 8. Session Notes

### Current
- Collapsible "Session Notes" card at top of ScrollView.
- Toggle open/close with arrow indicator.

### Target
- Keep as-is. No visual changes needed. The collapsible session notes card is unique to the session screen and does not need to match ORM test.

---

## 9. Scroll & Layout Structure

### Current (Session)
- `container`: `flex: 1`, `paddingTop: 56`, `paddingHorizontal: 24`
- ScrollView with `paddingBottom: 40`

### Target (match ORM test)
- `container`: `flex: 1`, `paddingTop: 56` (no horizontal padding on container — let header have its own `paddingHorizontal: 24`)
- **Header**: own `paddingHorizontal: 24`
- **Progress bar**: own `paddingHorizontal: 24`
- **Locke mascot**: centered, own margins
- **ScrollView content**: `paddingHorizontal: 24`, `paddingBottom: 40` (matching ORM test's `scrollContent` style)
- Add `KeyboardAvoidingView` wrapping the ScrollView (`behavior: "padding"` on iOS) — matching ORM test pattern for better input handling.

---

## 10. Imports & Dependencies to Add

- `react-native-reanimated`: `useSharedValue`, `useAnimatedStyle`, `withTiming` (for progress bar)
- `KeyboardAvoidingView`, `Platform` from react-native
- `LockeMascot` from `../../components/Locke/LockeMascot`
- Remove: `UnitToggle` import, `Badge` import (no longer needed in header)

---

## 11. Summary of Visual Changes

| Element | Current Session | Target (ORM-style) |
|---|---|---|
| Exit button | `<-` back arrow | `X` button, opens modal |
| Unit control | Pill toggle (kg/lbs) | Static label (locked) |
| Progress indicator | Badge `3/10` | Animated bar + label |
| Locke mascot | None | `icon` size, mood-driven |
| Set column widths | Set=28, flex, flex, 36 | Set=56, flex+mr8, flex+mr8, 36 |
| Set header labels | Set, Weight, Reps, checkmark | SET, WEIGHT, REPS, DONE |
| Set header font | 11px, 600 | 10px, 700, 0.8 spacing |
| Checkmark style | Same base | Match ORM (already close) |
| End session | Bottom button + Alert | X header + bottom-sheet Modal |
| Container padding | paddingHorizontal on container | paddingHorizontal on children |
| Keyboard handling | None | KeyboardAvoidingView |

---

## 12. What NOT to Change

- All session CRUD logic (addExercise, addSet, updateSet, removeExercise)
- Rest timer system (start, dismiss, intervals)
- Exercise notes (LockeTips, editable notes, pending notes state)
- Session notes collapsible card
- Exercise picker modal (plan list + manual input)
- All end-session business logic (XP, streak, PR detection, performance, Locke triggers)
- Warm-up set labeling logic (W1, W2, etc.)
- Data types and storage
