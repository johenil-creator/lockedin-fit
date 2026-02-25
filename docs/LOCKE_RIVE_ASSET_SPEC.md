# Locke Rive Asset Specification

**Version:** 1.0
**Date:** 2026-02-24
**Project:** LockedIn Fit
**Target Runtime:** `rive-react-native` on Expo SDK 54
**Status:** Commission-ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Requirements](#2-file-requirements)
3. [Character Design Brief](#3-character-design-brief)
4. [Rig Structure](#4-rig-structure)
5. [State Machine Specification](#5-state-machine-specification)
6. [Animation Specifications](#6-animation-specifications)
7. [Rank System Variants](#7-rank-system-variants)
8. [Theme Color Variants](#8-theme-color-variants)
9. [Naming Conventions](#9-naming-conventions)
10. [Rive Editor Checklist](#10-rive-editor-checklist)
11. [Export and Integration Notes](#11-export-and-integration-notes)
12. [Reference Material](#12-reference-material)

---

## 1. Overview

Locke is the wolf mascot for LockedIn Fit, a strength-training fitness app. He functions as an emotional companion and accountability partner (comparable to Duolingo's Duo owl). Locke reacts to user behavior: session completion, PRs, streaks, inactivity, rank changes, and onboarding.

The Rive file replaces the current PNG + Reanimated micro-animation system with a single, self-contained interactive animation asset driven by a Rive state machine. The app code sends inputs (mood, rank, theme) and the Rive state machine handles all transitions, idle loops, and secondary motion internally.

### Design Personality

Locke is NOT cute, chibi, or cartoonish. He is:

- **Compact and athletic** -- a stylized wolf with a grounded, muscular silhouette
- **Stoic by default** -- resting neutral is calm confidence, not friendliness
- **Earned warmth** -- encouraging states feel respectful, not bubbly
- **Sharp when disappointed** -- not sad puppy; more cold, withdrawn, eyes dimmed
- **Intense when pushing** -- crouched, bright eyes, predatory energy

Think: a wolf coach who respects effort and has no patience for excuses.

---

## 2. File Requirements

| Property | Value |
|---|---|
| **File format** | `.riv` (Rive format, version 7+) |
| **File name** | `locke.riv` |
| **Artboard name** | `Locke` |
| **Artboard size** | 320 x 320 px (2x render target of 160px full-size) |
| **Max file size** | 150 KB (target under 100 KB) |
| **State machine count** | 1 (named `LockeStateMachine`) |
| **Animations count** | See Section 6 (minimum 12 timeline animations) |
| **Origin point** | Bottom-center of character feet (x: 160, y: 290) |
| **Safe area** | Character body fits within 240x280 centered region; 40px margin for glow/effects |
| **Background** | Transparent (no background fill on artboard) |

### Performance Budget

- Total bone count: 30 max
- Total shape/path count: 80 max
- No raster images embedded (vector only)
- No mesh deformations (use bones for all deformation)
- Constraints and IK: permissible but limit to 2 IK chains (arms)

---

## 3. Character Design Brief

### 3.1 Silhouette

Locke is a **standing bipedal wolf**, viewed from the front at a very slight 3/4 angle. Proportions are stylized (head is ~35% of total height, large expressive eyes, compact muscular torso, shorter legs). The silhouette should read clearly at 32px (icon mode) -- this means the head/ear shape must be distinctive even as a tiny circle crop.

```
Reference proportions (320px artboard):

         /\    /\          <- Ears: pointed, ~40px tall
        /  \  /  \
       | (eyes)   |        <- Head: ~112px wide, ~100px tall
        \  snout  /
         \______/
          |    |
         /|    |\           <- Shoulders: ~96px wide
        / | body| \         <- Torso: compact, ~70px tall
       /  |    |  \
          | legs|           <- Legs: ~60px tall, feet at y:290
          |____|
```

### 3.2 Color Palette

All hex values are exact. Do not approximate.

#### Fur

| Token | Hex | Usage |
|---|---|---|
| `fur-primary` | `#2E2E38` | Main body fill, head, limbs |
| `fur-secondary` | `#3D3D4A` | Sides of torso, top of head (subtle gradient break) |
| `fur-chest` | `#4A4A58` | Chest patch, inner muzzle area, belly highlight |
| `fur-ear-inner` | `#5A5A68` | Concave inner ear surface |
| `fur-outline` | `#1A1A22` | Brow stroke, mouth line, key contour strokes |

These are dark, desaturated blue-greys. Locke is NOT black and NOT grey -- he has a cool, steely undertone.

#### Eyes (Viridian Theme -- Default)

| Token | Hex | Usage |
|---|---|---|
| `eye-iris` | `#00E676` | Base iris fill |
| `eye-ring` | `#00FF6A` | Outer iris ring / secondary iris layer |
| `eye-pupil` | `#061009` | Pupil fill |
| `eye-sclera` | `#141A15` | Sclera (mostly hidden by iris) |
| `eye-glow` | `#00FF6A` | Radial bloom behind/around iris |

#### Eyes (Ice Theme -- Alternate)

| Token | Hex | Usage |
|---|---|---|
| `eye-iris` | `#5BBCFF` | Base iris fill |
| `eye-ring` | `#A8E0FF` | Outer iris ring |
| `eye-pupil` | `#05101A` | Pupil fill |
| `eye-sclera` | `#141C22` | Sclera |
| `eye-glow` | `#5BBCFF` | Radial bloom |

#### Rim Glow (per mood)

The character has a subtle radial glow halo behind/around the body. Color and opacity vary by mood:

| Mood | Color | Base Opacity |
|---|---|---|
| `neutral` | `#00FF6A` | 0.08 |
| `encouraging` | `#00FF6A` | 0.22 |
| `celebrating` | `#00FF6A` | 0.50 |
| `disappointed` | `#5BBCFF` | 0.12 |
| `intense` | `#FF3B30` | 0.28 |
| `onboarding_guide` | `#00FF6A` | 0.15 |

#### Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `pendant-glow` | Same as `eye-glow` | Collar pendant energy effect |
| `intense-red` | `#FF3B30` | Rim glow in intense mood only |

### 3.3 Facial Features

**Eyes:** Large, almond-shaped, angled slightly upward at outer corners. Positioned at ~38.5% from top of artboard. Gap between eyes is roughly 1.7x eye width. Eyes are the primary expression vector.

- Default state: iris fills most of the eye shape, pupils centered
- Brow: a short fur-outline stroke above each eye; position drives expression
- Eyelids: top eyelid descends for blinks and squints; controlled by bone

**Mouth/Muzzle:** Minimal. A short `fur-outline` stroke for the mouth line. Mouth does NOT open or move in V1. Expression comes entirely from eyes + brows + posture.

**Ears:** Tall, pointed, triangular. Inner concave uses `fur-ear-inner`. Ears rotate at base for expression (alert = upright, disappointed = drooped back, intense = pinned forward).

### 3.4 Body Features

**Torso:** Compact, slightly V-shaped (wider shoulders, narrower waist). Chest patch lighter fur.

**Arms:** Short, stylized. Rest at sides in neutral. Can raise for celebrate/intense poses. No hands/fingers needed -- simple tapered endpoints.

**Legs:** Short, planted. Feet are simple rounded shapes. Character should feel grounded and stable.

**Tail:** Extends from lower back, visible on one side. Medium length. Sways and angles per mood. Key expression element.

**Collar/Pendant:** A thin band around the neck with a small pendant at center-front. Pendant glows with eye-glow color. Visibility is rank-dependent (see Section 7).

---

## 4. Rig Structure

### 4.1 Bone Hierarchy

```
root (origin: bottom-center)
  +-- body_main
  |     +-- torso
  |     |     +-- chest
  |     |     +-- shoulder_L
  |     |     |     +-- arm_L
  |     |     +-- shoulder_R
  |     |     |     +-- arm_R
  |     |     +-- collar
  |     |           +-- pendant
  |     +-- head
  |     |     +-- ear_L
  |     |     +-- ear_R
  |     |     +-- brow_L
  |     |     +-- brow_R
  |     |     +-- eyelid_L
  |     |     +-- eyelid_R
  |     |     +-- pupil_L
  |     |     +-- pupil_R
  |     |     +-- jaw (minimal -- for future use)
  |     +-- hip
  |           +-- leg_L
  |           +-- leg_R
  |           +-- tail_base
  |                 +-- tail_mid
  |                       +-- tail_tip
  +-- fx_rim_glow (effect layer, behind body)
  +-- fx_eye_glow_L (effect layer, over eye)
  +-- fx_eye_glow_R (effect layer, over eye)
  +-- fx_pendant_glow (effect layer, over pendant)
```

### 4.2 Grouping / Layer Order (back to front)

1. `fx_rim_glow` -- radial gradient ellipse, behind everything
2. `tail` group -- tail segments, behind body
3. `body` group -- torso, legs, arms
4. `head` group -- head shape, ears, face features
5. `fx_eye_glow_L`, `fx_eye_glow_R` -- additive bloom circles over eyes
6. `fx_pendant_glow` -- bloom circle over pendant
7. `collar` group -- collar band + pendant shape (above body, below head)

### 4.3 Key Constraints

- `body_main` bone controls overall translateY (breathing float) and scaleY (breathe compression)
- `head` has slight independent motion (secondary bob, 15% less amplitude than body)
- Ears, brows, eyelids are driven by individual bones for per-mood keying
- Tail uses a 3-bone chain for smooth wave motion
- Arms can be posed via shoulder rotation + arm translation

---

## 5. State Machine Specification

### 5.1 State Machine: `LockeStateMachine`

One state machine controls all of Locke's behavior. The app drives it via **inputs**; the state machine handles all transitions and blending internally.

### 5.2 Inputs

| Input Name | Type | Values / Range | Description |
|---|---|---|---|
| `mood` | Number | 0-5 (enum) | Current emotional state |
| `rank` | Number | 0-6 (enum) | Current rank tier |
| `theme` | Number | 0-1 | 0 = viridian eyes, 1 = ice blue eyes |
| `triggerCelebrate` | Trigger | -- | Fire once for celebrate entry animation |
| `triggerDisappointed` | Trigger | -- | Fire once for disappointed entry animation |
| `triggerEncouraging` | Trigger | -- | Fire once for encouraging entry nod |
| `triggerIntense` | Trigger | -- | Fire once for intense entry snap |
| `triggerBlink` | Trigger | -- | Fire externally or auto-scheduled internally |

#### Mood Enum Mapping

| Value | Mood | Description |
|---|---|---|
| 0 | `neutral` | Default idle. Calm confidence. |
| 1 | `encouraging` | Warm, earned approval. |
| 2 | `celebrating` | Terse celebration. PR, rank-up. |
| 3 | `disappointed` | Cold withdrawal. Inactivity. |
| 4 | `intense` | Competitive, pushing, hard-edged. |
| 5 | `onboarding_guide` | Welcoming, clear orientation. |

#### Rank Enum Mapping

| Value | Rank | Eye Rings | Glow Blur | Collar | Collar Glow | Rim Intensity |
|---|---|---|---|---|---|---|
| 0 | Runt | 1 | 3 | hidden | no | 0.4x |
| 1 | Scout | 1 | 5 | hidden | no | 0.6x |
| 2 | Stalker | 1 | 6 | hidden | no | 0.7x |
| 3 | Hunter | 2 | 7 | visible | no | 0.8x |
| 4 | Sentinel | 2 | 9 | visible | no | 0.85x |
| 5 | Alpha | 3 | 11 | visible | yes | 0.95x |
| 6 | Apex | 3 | 14 | visible | yes | 1.0x |

### 5.3 State Machine Layers

Use **3 layers** in the state machine to allow independent, concurrent animation:

#### Layer 1: Body Mood (controls posture, breathing, body motion)

States:
- `idle_neutral` (default) -- standard breathing loop
- `idle_encouraging` -- warm breathing, slight forward lean
- `idle_celebrating` -- post-jump settled, energetic breathing
- `idle_disappointed` -- drooped, slow breathing, sunk posture
- `idle_intense` -- fast breathing, crouched, tense
- `idle_onboarding` -- warm, steady breathing

Entry animations (one-shot, transitions TO idle):
- `enter_celebrating` -- jump + squash/stretch + land
- `enter_disappointed` -- slow sink + droop
- `enter_encouraging` -- quick nod + micro-bounce
- `enter_intense` -- abrupt snap into crouch

#### Layer 2: Face (controls eyes, brows, ears independently)

States:
- `face_neutral` -- relaxed brows, ears upright, standard glow
- `face_encouraging` -- brows up 1px, ears slightly forward, warmer glow
- `face_celebrating` -- brows raised, ears perked, bright glow flash
- `face_disappointed` -- brows heavy, ears drooped back, dimmed eyes
- `face_intense` -- brows furrowed down, ears pinned forward, bright sharp glow
- `face_onboarding` -- brows slightly raised, open expression

Blink sub-state (runs on all face states):
- Random interval blink: 3-7s (normal), 5-9s (disappointed)
- Blink down: 60ms ease-out-quad
- Blink up: 80ms ease-out-quad

#### Layer 3: Effects (controls glow layers independently)

States:
- `fx_neutral` -- rim glow at base opacity, no eye pulse
- `fx_encouraging` -- rim glow boosted, eye glow gentle pulse (1.2s cycle)
- `fx_celebrating` -- rim glow bright + pulse, eye glow flash then pulse
- `fx_disappointed` -- rim glow ice-blue dim, eye glow dimmed
- `fx_intense` -- rim glow red, eye glow sharp and bright
- `fx_onboarding` -- rim glow soft green pulse

### 5.4 Transition Rules

All mood transitions use **blend transitions** (not abrupt cuts).

| From | To | Blend Duration | Easing | Notes |
|---|---|---|---|---|
| Any idle | `enter_celebrating` | 0ms (instant start) | -- | One-shot, then blend to `idle_celebrating` |
| Any idle | `enter_disappointed` | 80ms crossfade | ease-out | Slow entry, 700ms animation |
| Any idle | `enter_encouraging` | 50ms crossfade | ease-out | Quick nod, 350ms animation |
| Any idle | `enter_intense` | 30ms crossfade | ease-out | Abrupt snap, 200ms animation |
| `idle_*` to `idle_*` | -- | 280ms crossfade | ease-in-out-sine | Standard mood shift |
| Face states | -- | 200ms crossfade | ease-out-quad | Slightly faster than body |
| FX states | -- | 350ms crossfade | ease-out | Glow fades smoothly |

---

## 6. Animation Specifications

### 6.1 Idle Loops (looping timeline animations)

All idle loops must be **seamless** -- first frame and last frame must produce identical poses when looped.

#### `anim_idle_neutral`

The baseline. Everything else is measured against this.

| Property | Target | Duration | Easing | Notes |
|---|---|---|---|---|
| `body_main.translateY` | 0 to -2 to 0 | 2800ms (half: 1400ms) | ease-in-out-sine | Gentle float |
| `body_main.scaleY` | 1.0 to 1.012 to 1.0 | 2800ms | ease-in-out-sine | Subtle breathe |
| `head.translateY` | Secondary motion: 85% of body amplitude | -- | -- | Slight lag, adds life |
| `tail_base.rotation` | -3deg to +3deg | 2800ms | ease-in-out-sine | Gentle sway |
| `ear_L/R.rotation` | 0 (upright) | -- | -- | Still |
| `brow_L/R.translateY` | 0 | -- | -- | Relaxed |
| Eye glow scale | 1.0 | -- | -- | No pulse |
| Rim glow opacity | mood base (0.08) | -- | -- | Static |

#### `anim_idle_encouraging`

Warm, slightly more alive than neutral. Closer to the user.

| Property | Target | Duration | Easing |
|---|---|---|---|
| `body_main.translateY` | 0 to -2 to 0 | 2800ms | ease-in-out-sine |
| `body_main.scaleY` | 1.0 to 1.015 to 1.0 | 2800ms | ease-in-out-sine |
| `head.translateY` | Secondary bob, 85% amplitude | -- | -- |
| `tail_base.rotation` | +17deg to +23deg | 2800ms | ease-in-out-sine |
| `brow_L/R.translateY` | -1px (slightly raised) | -- | -- |
| `ear_L/R.rotation` | +3deg (slightly forward) | -- | -- |
| Eye glow scale | 1.0 to 1.3 to 1.0 | 2400ms loop | ease-in-out-sine |
| Rim glow opacity | 0.22 | -- | -- |

#### `anim_idle_celebrating`

Post-jump settled state. Energetic, breathing faster, tail high.

| Property | Target | Duration | Easing |
|---|---|---|---|
| `body_main.translateY` | 0 to -2 to 0 | 1200ms (half: 600ms) | ease-in-out-sine |
| `body_main.scaleY` | 1.0 to 1.015 to 1.0 | 1200ms | ease-in-out-sine |
| `tail_base.rotation` | +32deg to +38deg | 1200ms | ease-in-out-sine |
| `brow_L/R.translateY` | -2px (raised) | -- | -- |
| `ear_L/R.rotation` | +5deg (alert, perked) | -- | -- |
| Eye glow scale | 1.0 to 1.3 to 1.0 | 2400ms loop | ease-in-out-sine |
| Rim glow opacity | 0.50, pulsing +/- 0.1 | 1500ms loop | ease-in-out-sine |

#### `anim_idle_disappointed`

Slow, heavy, withdrawn. Life drained out.

| Property | Target | Duration | Easing |
|---|---|---|---|
| `body_main.translateY` | +3 to +4 to +3 | 6400ms (half: 3200ms) | ease-in-out-sine |
| `body_main.scaleY` | 0.99 to 1.0 to 0.99 | 6400ms | ease-in-out-sine |
| `head.translateY` | +2 offset (drooped) | -- | -- |
| `tail_base.rotation` | -11deg to -5deg | 6400ms | ease-in-out-sine |
| `brow_L/R.translateY` | +5px (heavy, weighted) | -- | -- |
| `ear_L/R.rotation` | -12deg (folded back) | -- | -- |
| Eye glow scale | 0.85 (dimmed, no pulse) | -- | -- |
| Rim glow opacity | 0.12 (ice blue, dim) | -- | -- |

#### `anim_idle_intense`

Coiled energy. Fast breathing, predatory.

| Property | Target | Duration | Easing |
|---|---|---|---|
| `body_main.translateY` | 0 to -1 to 0 | 1200ms (half: 600ms) | ease-in-out-sine |
| `body_main.scaleY` | 1.0 to 1.012 to 1.0 | 1200ms | ease-in-out-sine |
| `torso.translateY` | +2 (slight crouch) | -- | -- |
| `tail_base.rotation` | +27deg to +33deg | 1200ms | ease-in-out-sine |
| `brow_L/R.translateY` | +3px (furrowed down) | -- | -- |
| `ear_L/R.rotation` | +8deg (pinned forward) | -- | -- |
| `arm_L/R.translateY` | -18px (raised, ready) | -- | -- |
| Eye glow scale | 1.25 (bright, sharp, no pulse) | -- | -- |
| Rim glow opacity | 0.28 (red) | -- | -- |

#### `anim_idle_onboarding`

Warm, approachable, steady. Guide mode.

| Property | Target | Duration | Easing |
|---|---|---|---|
| `body_main.translateY` | 0 to -2 to 0 | 3600ms (half: 1800ms) | ease-in-out-sine |
| `body_main.scaleY` | 1.0 to 1.012 to 1.0 | 3600ms | ease-in-out-sine |
| `tail_base.rotation` | +7deg to +13deg | 3600ms | ease-in-out-sine |
| `brow_L/R.translateY` | -1px (slightly open) | -- | -- |
| `ear_L/R.rotation` | +2deg | -- | -- |
| Eye glow scale | 1.0 to 1.15 to 1.0 | 3600ms loop | ease-in-out-sine |
| Rim glow opacity | 0.15 | -- | -- |

### 6.2 Entry Animations (one-shot transitions)

These play once when entering a mood, then blend into the corresponding idle loop. They provide the satisfying "moment" that makes the mascot feel alive.

#### `anim_enter_celebrating`

The signature move. A victory jump with squash-and-stretch.

| Phase | Property | Target | Duration | Easing |
|---|---|---|---|---|
| 1 - Anticipation | `body_main.scaleY` | 0.92 (squash) | 160ms | ease-out |
| 1 - Anticipation | `body_main.scaleX` | 1.04 (squash spread) | 160ms | ease-out |
| 2 - Jump | `body_main.translateY` | -14px (airborne) | 160ms | ease-out-back(1.5) |
| 2 - Jump | `body_main.scaleY` | 1.08 (stretch) | 160ms | ease-out |
| 2 - Jump | `body_main.scaleX` | 0.96 (stretch narrow) | 160ms | ease-out |
| 2 - Jump | Eye glow | flash to 1.5x + bright | 80ms | linear |
| 2 - Jump | Rim glow | flash to 0.6 opacity | 100ms | linear |
| 3 - Land | `body_main.translateY` | +4px (overshoot) | 120ms | ease-in-quad |
| 3 - Land | `body_main.scaleY` | 0.95 (land squash) | 120ms | ease-in-quad |
| 4 - Settle | `body_main.translateY` | -3px | 100ms | ease-in-out-sine |
| 5 - Settle | `body_main.translateY` | 0px | 120ms | ease-in-out-sine |
| 5 - Settle | `body_main.scaleY` | 1.0 | 120ms | ease-in-out-sine |
| 5 - Settle | `body_main.scaleX` | 1.0 | 120ms | ease-in-out-sine |

**Total duration:** ~660ms, then blend to `anim_idle_celebrating`

Ears perk to +8deg during jump phase (ease-out, 200ms), settle to +5deg.
Tail swings high (+40deg) during jump, settles to +35deg idle range.
Brows raise to -3px during jump, settle to -2px.

#### `anim_enter_disappointed`

A slow deflation. Not dramatic -- just... gone.

| Phase | Property | Target | Duration | Easing |
|---|---|---|---|---|
| 1 - Sink | `body_main.translateY` | +5px | 700ms | ease-out-quad |
| 1 - Sink | `head.translateY` | +3px (extra droop) | 800ms | ease-out-quad |
| 1 - Sink | `ear_L/R.rotation` | -12deg (fold back) | 600ms | ease-out-quad |
| 1 - Sink | `brow_L/R.translateY` | +5px (heavy) | 500ms | ease-out |
| 1 - Sink | `tail_base.rotation` | -8deg (droop) | 700ms | ease-out |
| 1 - Sink | Eye glow scale | 0.85 (dim) | 400ms | ease-out |
| 1 - Sink | Rim glow color | crossfade to `#5BBCFF` | 500ms | linear |
| 2 - Settle | `body_main.translateY` | +3px | 500ms | ease-in-out-sine |

**Total duration:** ~1200ms, then blend to `anim_idle_disappointed`

#### `anim_enter_encouraging`

A quick, confident nod. "I see you."

| Phase | Property | Target | Duration | Easing |
|---|---|---|---|---|
| 1 - Nod | `head.rotation` | -2deg (tilt) | 80ms | ease-out-quad |
| 1 - Nod | `body_main.translateY` | -6px (micro-bounce up) | 150ms | ease-out-quad |
| 2 - Return | `head.rotation` | 0deg | 270ms | ease-in-out-sine |
| 2 - Return | `body_main.translateY` | 0px | 150ms | ease-in-out-sine |
| 2 - Return | `tail_base.rotation` | +20deg (wag up) | 200ms | ease-out |
| 2 - Return | Eye glow | pulse to 1.2x | 200ms | ease-out |

**Total duration:** ~350ms, then blend to `anim_idle_encouraging`

#### `anim_enter_intense`

Abrupt snap. No flourish. Instant predator mode.

| Phase | Property | Target | Duration | Easing |
|---|---|---|---|---|
| 1 - Snap | `torso.translateY` | +2px (crouch) | 100ms | ease-out |
| 1 - Snap | `brow_L/R.translateY` | +3px (furrow) | 80ms | ease-out |
| 1 - Snap | `ear_L/R.rotation` | +8deg (pinned) | 100ms | ease-out |
| 1 - Snap | `arm_L/R.translateY` | -18px (raised) | 120ms | ease-out-back(1.1) |
| 1 - Snap | Eye glow | flash to 1.4x | 60ms | linear |
| 1 - Snap | Rim glow | flash red 0.35 | 80ms | linear |

**Total duration:** ~200ms, then blend to `anim_idle_intense`

### 6.3 Blink Animation

#### `anim_blink`

A single blink cycle. Triggered on a random timer by the state machine (or externally via `triggerBlink`).

| Phase | Property | Target | Duration | Easing |
|---|---|---|---|---|
| Close | `eyelid_L/R.scaleY` | 0 (closed) | 60ms | ease-out-quad |
| Open | `eyelid_L/R.scaleY` | 1 (open) | 80ms | ease-out-quad |

**Total duration:** 140ms

**Scheduling (inside state machine):**
- Normal moods: random interval between 3000-7000ms
- Disappointed mood: random interval between 5000-9000ms (sluggish)
- During entry animations: suppress blinks

### 6.4 Tail Wag Detail

The tail uses a 3-bone chain (`tail_base`, `tail_mid`, `tail_tip`) with cascading rotation for organic wave motion.

| Bone | Rotation Range | Phase Offset | Notes |
|---|---|---|---|
| `tail_base` | Per-mood `tailAngle +/- 3deg` | 0ms | Primary driver |
| `tail_mid` | `tail_base * 0.6` | 120ms delay | Follows base |
| `tail_tip` | `tail_base * 0.35` | 240ms delay | Whip end |

This creates a wave that travels from base to tip, like a real tail wag.

---

## 7. Rank System Variants

Rank affects visual intensity, NOT pose or animation timing. All rank changes must be achievable via the `rank` number input at runtime -- no separate artboards.

### 7.1 Rank Visual Progression

| Rank | Eye Rings | Eye Glow Blur | Eye Glow Opacity | Collar | Pendant Glow | Rim Intensity Multiplier | Posture Offset |
|---|---|---|---|---|---|---|---|
| 0 - Runt | 1 ring | stdDev 3 | 0.50 | hidden | none | 0.4x | +3px hunched |
| 1 - Scout | 1 ring | stdDev 5 | 0.65 | hidden | none | 0.6x | +1px |
| 2 - Stalker | 1 ring | stdDev 6 | 0.75 | hidden | none | 0.7x | 0px |
| 3 - Hunter | 2 rings | stdDev 7 | 0.85 | visible | off | 0.8x | 0px |
| 4 - Sentinel | 2 rings | stdDev 9 | 0.90 | visible | off | 0.85x | 0px |
| 5 - Alpha | 3 rings | stdDev 11 | 0.95 | visible | **glowing** | 0.95x | 0px |
| 6 - Apex | 3 rings | stdDev 14 | 1.00 | visible | **glowing** | 1.0x | 0px |

### 7.2 Implementation via Rive

**Eye rings:** Use nested iris shapes. Ring count controlled by opacity keyed to rank input:
- Rank 0-2: only `iris_ring_1` visible (opacity 1.0)
- Rank 3-4: `iris_ring_1` + `iris_ring_2` visible
- Rank 5-6: `iris_ring_1` + `iris_ring_2` + `iris_ring_3` visible

**Eye glow blur:** Use a radial gradient ellipse behind each eye. Increase gradient spread radius based on rank input (Rive constraint or blend state keyed to rank number).

**Collar visibility:** The collar group opacity is 0 for rank 0-2, 1 for rank 3+. Transition: 300ms ease-out.

**Pendant glow:** For rank 5-6, add a pulsing bloom circle on the pendant (same cycle as eye glow pulse, 2400ms).

**Rim intensity multiplier:** Scale the rim glow opacity by the rank's `rimIntensity` value. A rank 0 Runt in celebrating mood gets `0.50 * 0.4 = 0.20` rim opacity. An Apex gets `0.50 * 1.0 = 0.50`.

**Posture offset:** Runt has `body_main.translateY` offset +3px in all idle loops (hunched). Scout +1px. Stalker and above: 0px (proud posture). This is additive to the breathing float.

---

## 8. Theme Color Variants

The app supports two eye color themes: **viridian** (green, default) and **ice** (blue). Controlled by the `theme` number input.

### Implementation

Use Rive **color keying** or **blend states** on the eye group:

| Layer | Theme 0 (Viridian) | Theme 1 (Ice) |
|---|---|---|
| `iris_base` fill | `#00E676` | `#5BBCFF` |
| `iris_ring` fill | `#00FF6A` | `#A8E0FF` |
| `pupil` fill | `#061009` | `#05101A` |
| `sclera` fill | `#141A15` | `#141C22` |
| `eye_glow` fill | `#00FF6A` | `#5BBCFF` |
| `pendant_glow` fill | `#00FF6A` | `#5BBCFF` |

The transition between themes should crossfade over 400ms (ease-in-out-sine).

Rim glow colors are mood-dependent, NOT theme-dependent (see Section 3.2 rim glow table). The exception: disappointed mood uses `#5BBCFF` (ice blue) regardless of theme.

---

## 9. Naming Conventions

Consistent naming is critical for runtime binding. The app code will reference these names exactly.

### 9.1 Artboard

| Item | Name |
|---|---|
| Artboard | `Locke` |
| State Machine | `LockeStateMachine` |

### 9.2 Inputs

| Input | Name | Type |
|---|---|---|
| Mood selector | `mood` | Number |
| Rank selector | `rank` | Number |
| Theme selector | `theme` | Number |
| Celebrate trigger | `triggerCelebrate` | Trigger |
| Disappointed trigger | `triggerDisappointed` | Trigger |
| Encouraging trigger | `triggerEncouraging` | Trigger |
| Intense trigger | `triggerIntense` | Trigger |
| Blink trigger | `triggerBlink` | Trigger |

### 9.3 Timeline Animations

| Animation | Name | Loop | Duration |
|---|---|---|---|
| Neutral idle | `anim_idle_neutral` | loop | 2800ms |
| Encouraging idle | `anim_idle_encouraging` | loop | 2800ms |
| Celebrating idle | `anim_idle_celebrating` | loop | 1200ms |
| Disappointed idle | `anim_idle_disappointed` | loop | 6400ms |
| Intense idle | `anim_idle_intense` | loop | 1200ms |
| Onboarding idle | `anim_idle_onboarding` | loop | 3600ms |
| Celebrate entry | `anim_enter_celebrating` | one-shot | 660ms |
| Disappointed entry | `anim_enter_disappointed` | one-shot | 1200ms |
| Encouraging entry | `anim_enter_encouraging` | one-shot | 350ms |
| Intense entry | `anim_enter_intense` | one-shot | 200ms |
| Blink | `anim_blink` | one-shot | 140ms |

### 9.4 Bones

Use `snake_case` for all bone names. Match the hierarchy in Section 4.1 exactly.

### 9.5 Shapes / Groups

| Convention | Example |
|---|---|
| Body parts | `shape_torso`, `shape_head`, `shape_arm_L` |
| Eye parts | `shape_iris_L`, `shape_pupil_L`, `shape_eyelid_L` |
| Iris rings | `shape_iris_ring_1_L`, `shape_iris_ring_2_L`, `shape_iris_ring_3_L` |
| Effect layers | `shape_rim_glow`, `shape_eye_glow_L`, `shape_pendant_glow` |
| Groups | `grp_head`, `grp_body`, `grp_tail`, `grp_collar`, `grp_effects` |

---

## 10. Rive Editor Checklist

Use this checklist when building the file in the Rive editor. Each item should be verified before handoff.

### Phase 1: Setup

- [ ] Create artboard `Locke` at 320x320px, transparent background
- [ ] Set origin to bottom-center (x: 160, y: 290)
- [ ] Create folder structure in layer panel matching Section 4.2

### Phase 2: Character Build

- [ ] Build all shapes using **only vector paths** (no embedded images)
- [ ] Apply fur palette colors exactly per Section 3.2 table
- [ ] Eyes: create 3 nested iris ring shapes per eye (for rank system)
- [ ] Eyelids: create top-lid shapes that scale to 0 on Y axis for blink
- [ ] Ears: triangular with inner concave fill, rotate from base
- [ ] Tail: 3-segment chain with organic taper
- [ ] Collar: thin band shape, pendant circle at center-front
- [ ] Verify silhouette reads clearly when artboard is scaled to 32x32px

### Phase 3: Rigging

- [ ] Create bone hierarchy matching Section 4.1 exactly
- [ ] Bind all shapes to appropriate bones
- [ ] Verify `body_main` translateY moves entire character
- [ ] Verify each facial bone (brow, eyelid, ear) moves independently
- [ ] Verify tail chain creates wave motion with cascading rotation
- [ ] Set up collar group opacity linked to rank input (0 for rank 0-2, 1 for rank 3+)
- [ ] Set up iris ring visibility linked to rank input

### Phase 4: Effect Layers

- [ ] Create `shape_rim_glow`: radial gradient ellipse, centered, ~88% of artboard width
- [ ] Rim glow gradient: transparent center (45%), mood-color edge (100%)
- [ ] Create `shape_eye_glow_L` and `shape_eye_glow_R`: radial bloom circles at eye positions
- [ ] Create `shape_pendant_glow`: bloom circle at pendant position
- [ ] Verify all effect layers are behind body shapes (rim) or above (eye/pendant glow)
- [ ] Link rim glow color to mood input
- [ ] Link eye glow colors to theme input
- [ ] Link pendant glow to theme input and rank input (glow only for rank 5+)

### Phase 5: Animations

- [ ] Create all 6 idle loop animations (Section 6.1)
- [ ] Each idle loop: verify seamless loop (first frame = last frame)
- [ ] Each idle loop: verify head has secondary motion (85% body amplitude)
- [ ] Each idle loop: verify tail wag with cascading bone chain
- [ ] Create all 4 entry animations (Section 6.2)
- [ ] `anim_enter_celebrating`: squash-stretch-jump-land-settle sequence
- [ ] `anim_enter_disappointed`: slow sink with ear droop
- [ ] `anim_enter_encouraging`: quick nod + micro-bounce
- [ ] `anim_enter_intense`: abrupt snap to crouch
- [ ] Create `anim_blink` (Section 6.3): 60ms close, 80ms open
- [ ] Verify celebrate jump has visible squash (0.92) and stretch (1.08)

### Phase 6: State Machine

- [ ] Create state machine `LockeStateMachine`
- [ ] Add all 8 inputs per Section 5.2 with correct names and types
- [ ] Create 3 layers: Body Mood, Face, Effects
- [ ] Wire mood input to appropriate states in each layer
- [ ] Wire rank input to eye ring visibility, collar visibility, glow intensity
- [ ] Wire theme input to eye color blend states
- [ ] Wire trigger inputs to entry animations
- [ ] Set up transition blend durations per Section 5.4 table
- [ ] Verify entry animations play once then transition to idle
- [ ] Add blink scheduling: random timer node (3-7s normal, 5-9s disappointed)

### Phase 7: Rank Variants

- [ ] Test rank 0 (Runt): only 1 iris ring, no collar, dim glow, +3px hunch
- [ ] Test rank 3 (Hunter): 2 iris rings, collar visible, moderate glow
- [ ] Test rank 5 (Alpha): 3 iris rings, collar + pendant glow, near-full intensity
- [ ] Test rank 6 (Apex): all maxed -- full glow, full rim, proud posture
- [ ] Verify collar appears/disappears with 300ms transition
- [ ] Verify pendant glow pulses for rank 5+ only

### Phase 8: Quality Assurance

- [ ] Export `.riv` file, verify < 150 KB
- [ ] Test all 6 moods: visual correctness, timing feel, loop smoothness
- [ ] Test all 4 entry animations: impact, timing, settle quality
- [ ] Test blink in each mood: timing range feels natural
- [ ] Test theme 0 vs theme 1: eye colors switch correctly
- [ ] Test rank 0 through 6: progressive visual intensity
- [ ] Test rapid mood switching: no visual glitches or stuck states
- [ ] Test at 160x160 (full): all detail visible
- [ ] Test at 32x32 (icon): silhouette + eye glow readable
- [ ] Verify no raster images in file
- [ ] Verify bone count under 30
- [ ] Verify shape count under 80

---

## 11. Export and Integration Notes

### 11.1 File Delivery

- Deliver `locke.riv` file
- Place in project at: `assets/locke/locke.riv`
- Also deliver the Rive editor source file (`.rev` or shared Rive project link) for future iteration

### 11.2 Runtime Binding (for developers)

The React Native component will bind to the Rive file like this:

```tsx
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';

<Rive
  ref={riveRef}
  resourceName="locke"           // resolves to locke.riv
  artboardName="Locke"
  stateMachineName="LockeStateMachine"
  fit={Fit.Contain}
  alignment={Alignment.BottomCenter}
  style={{ width: 160, height: 160 }}
/>

// Setting inputs:
riveRef.current?.setInputState('LockeStateMachine', 'mood', 2);
riveRef.current?.setInputState('LockeStateMachine', 'rank', 3);
riveRef.current?.setInputState('LockeStateMachine', 'theme', 0);
riveRef.current?.fireState('LockeStateMachine', 'triggerCelebrate');
```

### 11.3 Icon Mode

For 32px icon usage, the app crops to a circular viewport centered on the head. The artist should ensure:
- Head + ears are within the top 55% of the artboard
- Eye glow is visible even at small scale
- Rim glow gradient reaches the head area

The app handles the crop -- no separate artboard needed for icon mode.

### 11.4 Performance Notes

- The Rive runtime on React Native renders on the UI thread via Skia
- All animations must run at 60fps on mid-range devices (iPhone 11 / Pixel 6a tier)
- Minimize overdraw: effect layers should use simple gradients, not complex shapes
- Avoid sharp color discontinuities in gradients (can cause banding on lower-end displays)

---

## 12. Reference Material

### 12.1 Existing Source Files

| File | Purpose |
|---|---|
| `components/Locke/lockeTokens.ts` | All color values, rank config, size presets, mood poses |
| `components/Locke/useLockeAnimation.ts` | Current Reanimated animation timing (use as timing reference) |
| `components/Locke/LockeSVG.tsx` | Current rendering approach (PNG + SVG overlay) |
| `components/Locke/LockeMascot.tsx` | Standalone Reanimated component (alternate timing reference) |
| `components/Locke/LockeOverlay.tsx` | Full-screen modal overlay usage |
| `lib/lockeMachine.ts` | Behavioral state machine (mood selection logic) |
| `lib/lockeMessages.ts` | Message bank (tone reference for each mood) |
| `lib/lockeEngine.ts` | Engine that bridges triggers to visual state |
| `assets/locke/locke_base.png` | Current PNG asset (use as visual reference only) |

### 12.2 Timing Reference Cross-Check

The following timing values from the existing Reanimated system should be matched in the Rive animations:

| Animation | Reanimated Value | Rive Target |
|---|---|---|
| Neutral breathe cycle | 4000ms (2000ms half) | 2800ms (more natural) |
| Encouraging breathe | 3000ms (1500ms half) | 2800ms (same as neutral, differentiate via pose) |
| Celebrate breathe | 1200ms (600ms half) | 1200ms (match) |
| Disappointed breathe | 6400ms (3200ms half) | 6400ms (match) |
| Celebrate jump up | 160ms ease-out-back(1.5) | 160ms ease-out-back(1.5) (match) |
| Celebrate land | 120ms ease-in-quad | 120ms ease-in-quad (match) |
| Disappointed sink | 700ms ease-out-quad | 700ms ease-out-quad (match) |
| Encouraging nod | 80ms ease-out-quad | 80ms ease-out-quad (match) |
| Blink close | 60-80ms ease-out | 60ms ease-out-quad (match) |
| Blink open | 80-100ms ease-out | 80ms ease-out-quad (match) |
| Blink interval (normal) | 3000-5000ms random | 3000-7000ms random (wider) |
| Blink interval (disappointed) | 4000-8000ms random | 5000-9000ms random (wider, sluggish) |

### 12.3 Feel Reference

The goal is **Duolingo Duo energy** adapted to a wolf personality:

- **Idle should feel alive.** The character must never feel static. Subtle constant motion (breathe, float, occasional ear twitch) makes it feel like a living creature waiting.
- **Transitions should have weight.** The celebrate jump needs visible squash-and-stretch. The disappointed droop needs to feel heavy. These micro-moments create emotional connection.
- **Eyes are everything.** Glow intensity, blink timing, and pupil stillness (not darting) create the illusion of attention and intelligence.
- **Tail is the secondary emotion channel.** High and wagging = happy. Low and slow = sad. Stiff and high = intense. The tail should never stop moving in any state.
- **Less is more on mouth.** No lip sync, no smile/frown. Let posture and eyes carry all expression. This keeps the character cool and stoic.

---

*End of specification.*
