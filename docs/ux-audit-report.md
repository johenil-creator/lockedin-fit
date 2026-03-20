# LockedInFIT — Unified UX/Product Audit Report
**Date**: 2026-03-15
**Agents**: UX Flow Architect, UI Systems Designer, Product Strategist, Theme/Brand Designer, QA/Usability Critic

---

## EXECUTIVE SUMMARY

LockedInFIT has a **strong foundation** — excellent visual system, fierce wolf theme in key moments, and a solid core workout loop. However, it's suffering from **feature sprawl, navigation confusion, and inconsistent brand immersion**. The app has 9 competing social/progression systems, orphaned screens, and generic language that undermines an otherwise phenomenal wolf-pack identity.

**Current State: 7/10**
**Achievable State: 9/10** with the changes below.

### The 3 Biggest Problems
1. **Users don't know what to do when they open the app** — too many competing CTAs on home
2. **Social features are scattered and hidden** — Packs, Community, Friends have no clear entry point
3. **The wolf theme is phenomenal in celebrations but generic everywhere else** — auth, tabs, buttons use standard fitness app language

---

## PART 1: SCREEN-BY-SCREEN AUDIT

---

### HOME SCREEN (`app/(tabs)/index.tsx`)
**Main Purpose**: Show today's workout and get user into a session
**Priority**: HIGH

**What's Working**:
- Greeting with user's name is personal
- Rank/XP/streak bar gives quick status
- Locke mascot with dynamic mood messages adds personality
- Today's workout card with plan progress is informative

**What's Confusing**:
- No single dominant CTA — workout card, quick actions, quests, and Locke panel all compete equally
- Quick action buttons (Log, Badges, Catalog, Settings) have tiny labels (13px, muted color)
- "Set your baseline" is vague — users don't know what 1RM means
- Progress snapshot is 200px+ below fold, many users never see it

**What Feels Cluttered**:
- 6+ sections stacked vertically with equal visual weight
- Quests, events, gifts shown conditionally but add density
- Dev tools panel visible in development (hardcoded top: 20)

**What Should Be Reorganized**:
- Make TODAY'S WORKOUT card visually dominant (larger, centered, accent border)
- Move progress snapshot above quick actions or lazy-load
- Integrate recovery readiness score into home (currently siloed in separate tab)
- Weekly Objective card placement is good — keep it

**Components to Change**:
- Remove: Dev tools panel from production
- Resize: Quick action labels to 15px
- Add: Recovery readiness summary (small badge/indicator from recovery tab)
- Simplify: Reduce to 3 sections max above fold (greeting + workout CTA + daily quest)

**Theme Fix**:
- "Set your baseline" → "Prove Your Strength" or "Calibration Trial"
- "Browse Plans" → "Scout Training"
- "Quick Workout" → "Open Hunt"

---

### RECOVERY TAB (`app/(tabs)/recovery.tsx`)
**Main Purpose**: Show readiness score and recovery status
**Priority**: LOW (already excellent)

**What's Working**:
- Circular readiness gauge is clear and animated
- Coach output with mood-based tips
- Muscle heatmap is visual and informative
- 7-day trend graph tells a data story
- Exemplary memoization and performance

**What's Confusing**:
- "ACWR" is never explained — novice users won't understand
- No guidance on "what do I do with this score?" (ready for hard day? deload?)
- Screen feels isolated — doesn't influence home screen decisions

**What Should Be Reorganized**:
- Add "What does this mean?" expandable section under readiness score
- Feed readiness score to home screen as a small indicator
- Add tooltips for technical terms (ACWR, acute/chronic load)

**Theme Fix**: This screen is appropriately gentle/analytical — no wolf intensity needed here.

---

### WORKOUT LOG (`app/(tabs)/workout-log.tsx`)
**Main Purpose**: View workout history and track progress
**Priority**: MEDIUM

**What's Working**:
- Two-tab toggle (History/Progress) is clean
- Calendar grid with workout dots is intuitive
- PR highlights carousel is engaging
- Empty state with Locke mascot is polished

**What's Confusing**:
- Progress tab redirects here from a hidden tab — confusing IA
- History and Progress are two different mental models crammed into one tab
- Stats labels use 9-10px font (below readable threshold)

**What Should Be Reorganized**:
- Remove the dead Progress tab redirect entirely
- Consider: History stays here, Progress moves to a card on home or plan tab
- Standardize stats label font to 12px minimum

**Components to Change**:
- Fix: Exercise card `marginBottom: spacing.sm + 4` → `spacing.md`
- Fix: Stats row `gap: 12` → `spacing.md (16)`
- Fix: Meta margins `marginTop: 2` → `spacing.xs (4)`

**Theme Fix**:
- Tab could be renamed "War Log" or "Session Record"

---

### PLAN TAB (`app/(tabs)/plan.tsx`)
**Main Purpose**: Manage training plan
**Priority**: MEDIUM

**What's Working**:
- Block tabs (Accumulation/Intensification/Realization) are properly structured
- Week stepper with completion dots is functional
- Day cards with exercise previews are informative

**What's Confusing**:
- Week navigation arrows at 25% opacity when disabled — too subtle
- No "Week X of Y" text visible
- Import options (CSV/Sheets/Excel) are buried
- This is a power-user feature occupying a primary tab position

**What Should Be Reorganized**:
- Add explicit "Week X / 12" text to week stepper
- Consider: Plan is a setup-once feature — could be modal from profile instead of primary tab
- But if users check it daily to see today's exercises, it earns its tab position

**Components to Change**:
- Add: "Week X / Y" label to WeekStepper
- Fix: Disabled arrow styling (grey out fully, not just 25% opacity)
- Add: Pull-to-refresh (currently missing)

---

### LEAGUES TAB (`app/(tabs)/leagues.tsx`)
**Main Purpose**: Compete in weekly rankings
**Priority**: HIGH

**What's Working**:
- Segmented toggle (League/Global) matches workout-log pattern
- Promotion banner is motivating
- Tier carousel is visually engaging
- Countdown to reset creates urgency

**What's Confusing**:
- "Top 5 promote, bottom 5 relegate" — not explained (how often? rewards?)
- League vs Global distinction unclear for new users
- No "How Leagues Work" explainer
- "Sign In to Compete" assumes user understands rank tiers

**What Feels Cluttered**:
- 5 features in 1 tab (tier progression, league ranking, global rank, notifications, events)
- Filter pills have inconsistent gap (10px, not a spacing constant)

**What Should Be Reorganized**:
- Add expandable "?" button with "How Leagues Work" explainer
- Consolidate: Leagues + Global + Events into cleaner hierarchy
- Notification bell could move to a global header, not per-screen

**Components to Change**:
- Add: League explainer card (collapsible)
- Fix: Filter pill gap from 10 → `spacing.sm (8)` or `spacing.md (16)`
- Fix: Countdown gap from 6 → `spacing.sm (8)`

**Theme Fix**:
- "Weekly Leagues" → "Pack Trials" or "Rank Wars"
- "Compete" → "Hunt" or "Prove Yourself"
- "Top 5 promote" → "Top 5 ascend, bottom 5 fall"

---

### PROFILE SCREEN (`app/profile.tsx`)
**Main Purpose**: Hub for account, customization, social, and training features
**Priority**: LOW (already well-organized)

**What's Working**:
- NavCard pattern is clean and scannable
- 4 sections (Customize, Social, Training, Settings) are logical groupings
- Summary card shows rank, XP, Fangs at a glance

**What's Confusing**:
- No pack context shown (which pack am I in?)
- "Badges" label is generic
- Settings is at the bottom — might be hard to find

**Components to Change**:
- Add: Pack info to summary card (if user is in a pack)
- Consider: Move Settings higher or add gear icon to header

**Theme Fix**:
- "Profile" → "Identity" or "Lair" (stretch)
- "Settings" → "Preferences" (neutral is fine here)
- "Friends" → "Pack Mates" (if thematic consistency desired)

---

### SESSION SCREEN (`app/session/[id].tsx`)
**Main Purpose**: Log exercises, sets, and weights during a workout
**Priority**: HIGH

**What's Working**:
- Exercise list with set entry is functional
- Rest timer with haptic feedback
- PR detection and celebration
- Coach marks for onboarding

**What's Confusing**:
- 1335 lines — too many responsibilities in one file
- No visible back button — user feels trapped
- Pause overlay renders inline, not as modal — might be missed if scrolled
- No "save draft" if user exits mid-session
- No undo for set deletion

**What Should Be Reorganized**:
- Add visible back button with "Discard Session?" confirmation
- Pause overlay should be a full-screen Modal, not inline View
- Coach marks need "Got it" dismiss button
- Add undo toast for set deletion (5-second window)

**Components to Change**:
- Add: Back button with discard confirmation
- Replace: PauseOverlay View → Modal component
- Add: Coach mark dismiss button
- Add: Set deletion undo

---

### WORKOUT COMPLETE (`app/workout-complete.tsx`)
**Main Purpose**: Celebrate finished workout, show rewards
**Priority**: LOW (already excellent — best screen in app)

**What's Working**:
- Particle burst animations with viridian glow
- Rank flavor text is incredible ("Nothing escapes you now." for Hunter)
- Haptic feedback on rank-up
- XP/Fangs earned display
- Gesture disabled to prevent accidental dismissal

**What's Confusing**:
- Confetti has no reduced-motion check (accessibility issue)
- No way to skip celebration for power users

**Theme Fix**: This IS the theme. No changes needed. **10/10 execution.**

---

### AUTH SCREEN (`app/auth.tsx`)
**Main Purpose**: Sign up or sign in
**Priority**: HIGH (first impression)

**What's Working**:
- Email/password form is functional
- Terms agreement checkbox exists

**What's Confusing**:
- Completely generic — "Create Account" / "Sign In" could be any app
- No Locke mascot, no wolf imagery, no personality
- Error messages are corporate ("Email and password are required")
- Terms checkbox is small with tiny legal text

**What Should Be Reorganized**:
- Add Locke mascot in background or header
- Make form feel like joining a pack, not signing up for a service

**Theme Fix** (HIGH PRIORITY):
- "Create Account" → "Join the Pack"
- "Sign In" → "Enter the Den"
- Add tagline: "Your pack is waiting." or "The hunt begins here."
- Error: "Email and password are required" → "Every wolf needs credentials."

---

### ONBOARDING (`app/onboarding.tsx`)
**Main Purpose**: Set up profile and explain app systems
**Priority**: MEDIUM

**What's Working**:
- 6-step flow with progress dots
- HealthKit gating for iOS only
- Manual 1RM entry is conditional

**What's Confusing**:
- Step order explains 1RM benefit AFTER asking for data (explain is step 5, manual is step 6)
- Android skips health step but progress dots show all steps — feels broken
- "Just your best guess" is vague — no indication empty fields are OK
- No "Skip" button on manual 1RM entry

**What Should Be Reorganized**:
- Reorder: Welcome → Unit → **Explain systems** → Health → Name → Manual 1RM
- Show platform-specific progress dots
- Add explicit "Skip" button on 1RM entry step
- Add "I'll do this later" option

---

### LOCKE STUDIO (`app/locke-studio.tsx`)
**Main Purpose**: Customize wolf avatar cosmetics
**Priority**: LOW

**What's Working**:
- 6 tabs (Fur, Eyes, Gear, Auras, Armor, Emotes) are comprehensive
- Fangs currency display with lightning bolt
- Real-time preview of customization
- Seasonal and prestige shops add depth

**What's Confusing**:
- Low-priority feature that's fun but rarely visited
- Combines customization AND monetization shop — two different intents
- No story/lore around cosmetics (why does this aura cost 200 Fangs?)

**Theme Fix**:
- Tab labels could be fiercer: "Fur" → "Pelt", "Gear" → "War Gear"
- Each cosmetic could have a one-line flavor text

---

### PACK DETAIL (`app/pack-detail.tsx`)
**Main Purpose**: Manage pack and access pack features
**Priority**: HIGH

**What's Working**:
- Pack info, code, and visibility toggle
- Member roster with roles
- Pack chat modal

**What Feels Cluttered**:
- 7+ sub-features dumped on one scrollable screen (war, boss, challenge, leaderboard, achievements, chat, members)
- Each subsystem deserves its own tab or modal
- Leader-only buttons (Start War, Spawn Boss) mixed with regular content

**What Should Be Reorganized**:
- Add internal tab bar: Overview | Battles | Challenge | Leaderboard | Chat
- Or use expandable sections instead of everything visible at once
- Separate leader actions into a "Manage Pack" section

**Components to Change**:
- Add: Internal tab bar or section headers with expand/collapse
- Move: Chat to its own tab within pack detail
- Group: War + Boss under "Battles" section

---

### ORPHANED/HIDDEN SCREENS
**Priority**: HIGH

These screens exist but have no navigation path:
- `community.tsx` — No visible link from any tab or screen
- `lifts.tsx` — No navigation reference anywhere
- `pack-discovery.tsx` — No entry from home or tabs
- `quick-workout.tsx` — No visible entry point
- `weekly-summary.tsx` — No visible entry point
- `user-profile.tsx` — Only reachable through friend list deep navigation

**Fix**: Either integrate these into navigation or remove them. Hidden features = wasted development.

---

## PART 2: CROSS-SCREEN CONSISTENCY AUDIT

### Navigation Patterns
| Pattern | Consistency | Issue |
|---------|------------|-------|
| Back button | INCONSISTENT | Mix of BackButton component, custom chevron-back, arrow-back |
| Pull-to-refresh | INCONSISTENT | Some screens have RefreshControl, Plan has none |
| Loading states | INCONSISTENT | Mix of Skeleton, ActivityIndicator, custom loaders |
| Empty states | MOSTLY CONSISTENT | EmptyState component exists but not used everywhere |
| Modal confirmations | INCONSISTENT | Mix of Alert.alert(), custom Modal, no confirmation |
| Error messages | INCONSISTENT | Mix of inline red text, toast, Alert.alert() |

### Spacing Inconsistencies
| Pattern | Expected | Actual | Files Affected |
|---------|----------|--------|---------------|
| Header top padding | `topInset + spacing.md` | `topInset + 12` | 3 tab screens |
| Card margin-bottom | `spacing.md (16)` | `spacing.sm + 4 (12)` | workout-log, progress cards |
| Meta text margin | `spacing.xs (4)` | `2` | 5+ files |
| Stats row gap | `spacing.md (16)` | `12` | StatsStrip, ExerciseCard |
| Button padding | `spacing.md (16)` | `15` | Button.tsx |
| Filter pill gap | `spacing.sm (8)` | `10` | leagues.tsx |
| Tab toggle padding | `spacing.sm (8)` | `7` | workout-log.tsx |

### Typography Inconsistencies
| Element | Expected | Actual | Impact |
|---------|----------|--------|--------|
| Stats labels | caption (12px) | 9-10px | Hard to read |
| Quick action labels | body (15px) | 13px muted | Nearly invisible |
| Tab toggle text | subheading (17px) | 13px 600w | Under-scaled |
| Exercise name in cards | body (15px) | 16px 600w | Over-scaled by 1px |

### Animation Inconsistencies
| Screen | Pattern | Duration |
|--------|---------|----------|
| Recovery | FadeInDown + delay(n) | 350ms |
| Workout Log | FadeInDown + delay(i*60) | 300ms |
| Home | Mixed/implicit | Varies |
| **Recommendation**: Standardize to 300ms with 60ms stagger |

---

## PART 3: HIGHEST-PRIORITY USABILITY PROBLEMS

### Tier 1 — Fix Immediately (Blocks Users)
1. **Home screen has no clear primary CTA** — Users don't know what to do first
2. **Social features are orphaned** — Community, Pack Discovery have no navigation path
3. **Progress tab is a dead redirect** — Broken tab bar UX
4. **Session screen has no back button** — Users feel trapped
5. **Auth screen is completely generic** — First impression has zero brand identity

### Tier 2 — Fix Soon (Confuses Users)
6. **Pack detail is feature-overloaded** — 7 systems on one scroll
7. **Onboarding explains 1RM AFTER asking for data** — Wrong step order
8. **League mechanics unexplained** — "Promote/relegate" assumes knowledge
9. **Unit conversion has no confirmation** — Silent kg/lbs toggle
10. **Disabled buttons use only opacity** — Unclear if tappable

### Tier 3 — Fix When Possible (Friction)
11. **Back button inconsistency** across screens
12. **Loading state inconsistency** (Skeleton vs Spinner)
13. **Pull-to-refresh missing** on Plan screen
14. **Accessibility: muted text contrast** fails WCAG AA
15. **Accessibility: icon buttons lack labels** for screen readers

---

## PART 4: LAYOUT & HIERARCHY IMPROVEMENTS

1. **Home screen**: Reduce to 3 above-fold sections (greeting bar → workout CTA → daily quest)
2. **Leagues**: Add "How it works" expandable card
3. **Pack detail**: Add internal tab bar (Overview | Battles | Challenge | Board | Chat)
4. **Session screen**: Extract PauseOverlay to full-screen Modal
5. **Profile**: Add pack info to summary card
6. **Recovery**: Add "What to do" guidance section
7. **All screens**: Standardize section headers with SectionLabel component
8. **All cards**: Use `spacing.md` consistently for marginBottom
9. **All headers**: Use `topInset + spacing.md` consistently

---

## PART 5: NAVIGATION FLOW IMPROVEMENTS

1. **Remove dead Progress tab** — Delete redirect, keep content in Log toggle
2. **Register missing screens in _layout.tsx** — friends, community, user-profile, pack-discovery, lifts
3. **Create social entry point** — Either a Social tab or prominent cards on home/profile
4. **Standardize animations** — Bottom-sheet animation only for actual modals, slide_from_right for push screens
5. **Add back button to session screen** with discard confirmation
6. **Reduce nesting for social actions** — Direct entry to Friends from home, not Profile → Friends → User → Challenge
7. **Pack entry point** — Add "Your Pack" card to home screen (if user has a pack)
8. **Standardize back button** — Use BackButton component everywhere

---

## PART 6: SEAMLESS & INTUITIVE RECOMMENDATIONS

1. **Define the main loop clearly**: Open → See today's workout + readiness → Start session → Complete → Celebrate → Check rank
2. **Integrate recovery into home**: Show readiness score as a small indicator on home screen
3. **One primary CTA per screen**: Every screen should have ONE thing it wants you to do
4. **Reduce cognitive load on home**: Move secondary features below fold or to dedicated screens
5. **Add onboarding tooltips**: First-time visitors get contextual hints on key screens
6. **Consistent pull-to-refresh**: Every scrollable screen should support it
7. **Consistent loading**: Use Skeleton loaders everywhere (not mix of Skeleton + Spinner)
8. **Consistent confirmations**: All destructive actions use same confirmation pattern
9. **Add glossary/help**: Technical terms (ACWR, RPE, 1RM) need inline explanations
10. **Reduce motion for accessibility**: Check `prefers-reduced-motion` for confetti/particles

---

## PART 7: THEME & COHESION RECOMMENDATIONS

### Language Changes (High Impact, Low Effort)
| Current | Proposed | Location |
|---------|----------|----------|
| "Create Account" | "Join the Pack" | auth.tsx |
| "Sign In" | "Enter the Den" | auth.tsx |
| "Weekly Leagues" | "Pack Trials" or "Rank Wars" | leagues tab title |
| "Set your baseline" | "Prove Your Strength" | home screen |
| "Browse Plans" | "Scout Training" | home quick action |
| "Quick Workout" | "Open Hunt" | home quick action |
| "What's on your mind?" | "Share your victory" | PostComposer placeholder |
| "Top 5 promote, bottom 5 relegate" | "Top 5 ascend, bottom 5 fall" | leagues explainer |
| "Create Pack" | "Forge a Pack" | create-pack screen |
| "View Pack" | "Enter the Den" | pack cards |
| "Daily Quests" | "Daily Trials" | quest cards |
| "Badges" | "Honors" or "Marks" | profile nav |

### Where Theme is Already Perfect (Don't Touch)
- Rank names (Runt → Scout → Stalker → Hunter → Sentinel → Alpha → Apex)
- Workout complete celebration (particle effects, rank flavor text, haptics)
- Locke personality messages (fierce, contextual, varied)
- Evolution path visualization
- Viridian green color system
- Currency name "Fangs"
- Group name "Packs"

### Where Theme Needs Work
- Auth screen (2/10 immersion — needs Locke, needs pack language)
- Tab names (generic fitness app labels)
- Button labels throughout (corporate, not fierce)
- Settings screen (utilitarian, no personality)
- Post composer (generic social media language)
- Onboarding (instructional, not immersive)

### Locke is Under-Utilized
Locke's personality exists in `lockeMessages.ts` with 10 mood states and contextual triggers, but users only hear from Locke:
- On home screen (random message)
- During workout completion
- In recovery coach output

**Recommendation**: Surface Locke more frequently:
- Loading states ("Locke is thinking...")
- Empty states ("Even Locke hasn't been here yet")
- Error states ("Even wolves hit walls. Try again.")
- Onboarding transitions ("Let's keep moving, pup")

---

## IMPLEMENTATION PRIORITY

### Sprint 1 (Quick Wins — 4-6 hours)
- [ ] Remove dead Progress tab redirect
- [ ] Register missing screens in _layout.tsx
- [ ] Standardize spacing (batch replace `spacing.sm + 4` → `spacing.md`)
- [ ] Standardize header padding (`topInset + 12` → `topInset + spacing.md`)
- [ ] Fix meta margins (`marginTop: 2` → `spacing.xs`)
- [ ] Add accessibility labels to icon-only buttons
- [ ] Update auth screen copy (Join the Pack / Enter the Den)

### Sprint 2 (Navigation & Flow — 8-12 hours)
- [ ] Add back button to session screen with discard confirmation
- [ ] Create social entry point (pack/friends cards on home or profile)
- [ ] Simplify home screen (reduce above-fold to 3 sections)
- [ ] Add "How Leagues Work" explainer card
- [ ] Reorder onboarding steps (explain before ask)
- [ ] Standardize back button component usage
- [ ] Standardize loading states (Skeleton everywhere)

### Sprint 3 (Theme & Polish — 6-8 hours)
- [ ] Update all button labels to wolf/pack language
- [ ] Update tab names if desired
- [ ] Add Locke to auth screen
- [ ] Add Locke to empty/error states
- [ ] Add reduced-motion check for confetti
- [ ] Improve muted text contrast
- [ ] Add pack detail internal tab bar

### Sprint 4 (Architecture — 12-16 hours)
- [ ] Integrate recovery readiness into home screen
- [ ] Split session screen into sub-components
- [ ] Consolidate social features into coherent hub
- [ ] Add inline tooltips for technical terms
- [ ] Add unit conversion confirmation toast
- [ ] Standardize confirmation dialogs

---

## AGENTS' CONSENSUS

All 5 agents agree on these core findings:

1. **The app's core workout loop is solid** — session logging, completion celebration, and rank progression are excellent
2. **Feature sprawl is the #1 problem** — 9 social/progression systems compete for attention without clear hierarchy
3. **The wolf theme is exceptional when present but absent in ~40% of screens** — language changes would dramatically improve immersion
4. **Home screen needs simplification** — one dominant CTA, fewer competing sections
5. **Navigation has gaps** — orphaned screens, inconsistent back buttons, no clear social entry point
6. **Design system is well-defined but inconsistently applied** — spacing, typography, and loading patterns need batch fixes
7. **Recovery tab is the reference implementation** — memoization, spacing, hierarchy all done right
8. **Workout Complete is the gold standard** — don't touch it, replicate its intensity elsewhere
