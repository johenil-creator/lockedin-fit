# Locke Avatar Alignment Specification

> Single source of truth: `Master_Avatar_Template.png` (1024x1536)
> All measurements are in pixels at native canvas resolution.

---

## A. MASTER CANVAS SPEC

| Property | Value |
|---|---|
| Canvas size | 1024 x 1536 px |
| Aspect ratio | 2:3 (1.5) |
| Canvas center | (512, 768) |
| Color mode | RGBA (32-bit with alpha) |
| Background | Fully transparent (alpha = 0) |
| Character vertical range | y=443 (ear tips) to y=1137 (paw bottom) |
| Character vertical center | y=790 |
| Character horizontal center | x=512 |

### Rules

- **Every asset must be exported at exactly 1024x1536.**
- **Every asset must use RGBA with true transparency.**
- **No asset may be cropped, trimmed, or use a non-standard canvas.**
- **Transparent padding is mandatory** to maintain consistent positioning.
- **No white, black, or colored backgrounds.** Only alpha = 0 for empty space.
- Assets must render correctly when layered using a simple stack at (0, 0) with no offsets.

---

## B. GLOBAL ANCHOR SYSTEM

All anchors are absolute pixel positions on the 1024x1536 canvas.

### Primary Anchors

| Anchor | Position (px) | Normalized | Description |
|---|---|---|---|
| `canvas_center` | (512, 768) | (0.50, 0.50) | Canvas geometric center |
| `head_center` | (511, 680) | (0.50, 0.44) | Center of mass of head content |
| `body_center` | (574, 909) | (0.56, 0.59) | Center of mass of body content |
| `avatar_center` | (512, 790) | (0.50, 0.51) | Visual center of full character |

### Ear Anchors

| Anchor | Position (px) | Description |
|---|---|---|
| `left_ear_tip` | (278, 443) | Topmost pixel of left ear |
| `right_ear_tip` | (745, 443) | Topmost pixel of right ear |
| `left_ear_base` | (310, 560) | Where left ear meets head mass |
| `right_ear_base` | (714, 560) | Where right ear meets head mass |
| `left_earring_attach` | (419, 736) | Left earring center point |
| `right_earring_attach` | (624, 722) | Right earring center point |

### Eye Anchors

| Anchor | Position (px) | Description |
|---|---|---|
| `left_iris_center` | (408, 636) | Center of left eye iris |
| `right_iris_center` | (636, 636) | Center of right eye iris |
| `eye_midpoint` | (522, 636) | Midpoint between both irises |
| `inter_eye_span` | 228 px | Horizontal distance between iris centers |

### Face Anchors

| Anchor | Position (px) | Description |
|---|---|---|
| `brow_center` | (530, 600) | Brow line center (above eyes) |
| `nose_center` | (521, 708) | Center of nose |
| `mouth_center` | (521, 740) | Center of mouth area |
| `muzzle_center` | (521, 716) | Combined nose+mouth center |

### Neck / Collar Anchors

| Anchor | Position (px) | Description |
|---|---|---|
| `collar_center` | (511, 730) | Center of collar band region |
| `collar_band_top` | y=700 | Top edge of collar snap zone |
| `collar_band_bottom` | y=760 | Bottom edge of collar snap zone |
| `collar_tag_hang` | (511, 810) | Where pendant/tag hangs below collar |

### Aura Anchor

| Anchor | Position (px) | Description |
|---|---|---|
| `aura_center` | (511, 800) | Center of aura placement zone |

---

## C. SNAP REGIONS BY ASSET CATEGORY

### 1. HEAD BASE (`head_base`)

| Property | Value |
|---|---|
| Snap type | LOCKED to canvas |
| Content bbox | (0, 443) to (1024, 910) |
| Movement | None. Immovable reference. |
| Notes | Includes ears, cheek fur, head outline. No face features. |

### 2. BODY BASE (`body_base`)

| Property | Value |
|---|---|
| Snap type | LOCKED to canvas |
| Content bbox | (0, 681) to (1024, 1137) |
| Movement | None. Immovable reference. |
| Overlap | Overlaps head at y=681-910 (229px). Body renders BELOW head. |

### 3. HEAD FUR VARIANTS

| Property | Value |
|---|---|
| Snap type | Full canvas (1024x1536) |
| Must match | `head_base` silhouette exactly |
| Content zone | Same as head_base: y=443 to y=910 |
| Must NOT | Exceed head outline, leave gaps inside silhouette |
| Export rule | Content must perfectly overlap head_base when stacked |

### 4. BODY FUR VARIANTS

| Property | Value |
|---|---|
| Snap type | Full canvas (1024x1536) |
| Must match | `body_base` silhouette exactly |
| Content zone | Same as body_base: y=681 to y=1137 |
| Must NOT | Exceed body outline, leave gaps inside silhouette |
| Export rule | Content must perfectly overlap body_base when stacked |

### 5. EYES

| Property | Value |
|---|---|
| Snap type | Centered on `eye_midpoint` (522, 636) |
| Content bbox | Approx (315, 585) to (730, 670) |
| Max bounding | (280, 570) to (760, 690) |
| Left iris zone | (350, 600) to (470, 670) |
| Right iris zone | (580, 600) to (690, 670) |
| Must NOT | Drift outside eye zone, overlap brow or nose regions |
| Variant rule | All eye color variants must share identical shape/outline |

### 6. BROWS

| Property | Value |
|---|---|
| Snap type | Centered on `brow_center` (530, 600) |
| Primary content | y=577 to y=655 |
| Max bounding | (300, 560) to (750, 670) |
| Must NOT | Overlap into eye iris zone, extend below y=660 |
| Variant rule | Expression variants change angle/curve only. Same bounds. |
| Note | Brows sit ON TOP of eyes in layer order |

### 7. NOSE + MOUTH

| Property | Value |
|---|---|
| Snap type | Centered on `muzzle_center` (521, 716) |
| Nose zone | (451, 667) to (592, 749) |
| Mouth zone | (376, 740) to (670, 835) |
| Full content max | (370, 660) to (675, 840) |
| Must NOT | Overlap into eye zone (above y=660), extend below y=850 |
| Variant rule | All variants must keep nose at same position. Mouth expression varies below nose. |

### 8. EAR ACCESSORIES

| Property | Value |
|---|---|
| Snap type | Anchored to ear attachment points |
| Left earring zone | Center (419, 736), content bbox (383, 685) to (456, 787) |
| Right earring zone | Center (624, 722), content bbox (586, 669) to (663, 776) |
| Must NOT | Extend into face zone, exceed ear silhouette horizontally |
| Mirroring | Left and right are SEPARATE assets. Do NOT auto-mirror. Ear shapes are not symmetric. |
| Paired rule | Paired earrings = two separate PNGs on one canvas, or a single PNG with both. |
| Attachment variants | `top` = attached at ear tip, `lobe` = hanging from ear base. Specify in filename. |

### 9. COLLARS / NECK ACCESSORIES

| Property | Value |
|---|---|
| Snap type | Centered on `collar_center` (511, 730) |
| Collar band zone | y=700 to y=760, full width x=260-764 |
| Tag/pendant zone | Below collar band, center x=511, y=760 to y=850 |
| Must NOT | Extend above y=680 (would collide with chin), extend below y=870 |
| Overlap rule | Renders BETWEEN body_fur and head_fur in layer order. Chin fur covers collar top edge. |
| Spike rule | Spikes must remain symmetric around x=511. Keep within x=250-775. |

### 10. AURAS

| Property | Value |
|---|---|
| Snap type | Centered on `aura_center` (511, 800) |
| Content zone | Approx (205, 455) to (820, 1074) |
| Max bounding | (180, 430) to (845, 1100) |
| Must NOT | Require manual nudging, extend beyond max bounding |
| Shape rule | ALL color variants must use the IDENTICAL outer silhouette |
| Outline rule | `aura_outline` must exactly trace the silhouette of filled auras |
| Layer rule | Aura renders BEHIND all avatar layers (layer 1). Optional outline renders on TOP (layer 11). |

---

## D. LAYER ORDER

Strict bottom-to-top stacking. Higher number = rendered later = visually in front.

| Z-Order | Layer | Category | Required |
|---|---|---|---|
| 1 | `aura` | auras/ | Optional |
| 2 | `body_fur` | base/body/ | Required |
| 3 | `neck_accessory` | accessories/neck/ | Optional |
| 4 | `head_fur` | base/head/ | Required |
| 5 | `eyes` | face/eyes/ | Required |
| 6 | `brows` | face/brows/ | Required |
| 7 | `nose_mouth` | face/nose_mouth/ | Required |
| 8 | `ear_accessory` | accessories/ears/ | Optional |
| 9 | `aura_outline` | auras/ | Optional |

### Why This Order

- **Aura (1):** Glow behind everything.
- **Body fur (2):** Foundation layer.
- **Neck accessory (3):** Collar sits on body, partially hidden by head.
- **Head fur (4):** Covers collar top edge naturally (chin fur overlap).
- **Eyes (5):** On top of head fur.
- **Brows (6):** On top of eyes for expression emphasis.
- **Nose + mouth (7):** On top of head fur, below brow line.
- **Ear accessory (8):** Topmost character element, visible above everything.
- **Aura outline (9):** Optional front highlight, if design calls for it.

---

## E. NAMING CONVENTION

### Format

```
{category}_{variant}_{option}.png
```

### Rules

- Lowercase only
- Underscores only (no hyphens, no spaces)
- No version words: ~~final~~, ~~new~~, ~~v2~~, ~~fixed~~
- No special characters

### Examples by Category

| Category | Pattern | Examples |
|---|---|---|
| Body fur | `body_fur_{color}.png` | `body_fur_brown.png`, `body_fur_arctic_white.png` |
| Head fur | `head_fur_{color}.png` | `head_fur_black.png`, `head_fur_merle.png` |
| Eyes | `eyes_{color}.png` | `eyes_green.png`, `eyes_red.png` |
| Brows | `brows_{expression}.png` | `brows_neutral.png`, `brows_angry.png` |
| Nose+Mouth | `nose_mouth_{expression}.png` | `nose_mouth_smile.png`, `nose_mouth_smirk.png` |
| Earrings | `earring_{style}_{side}.png` | `earring_hoop_left.png`, `earring_stud_right.png` |
| Earrings (paired) | `earring_{style}_pair.png` | `earring_hoop_pair.png` |
| Collars | `collar_{style}.png` | `collar_diamond.png`, `collar_spikes.png` |
| Auras | `aura_{color}.png` | `aura_purple.png`, `aura_outline.png` |
| Future head acc. | `head_acc_{name}.png` | `head_acc_crown.png`, `head_acc_bandana.png` |
| Future face acc. | `face_acc_{name}.png` | `face_acc_scar.png`, `face_acc_glasses.png` |

### Mirroring Convention

- Use `_left` / `_right` suffix for sided accessories
- Use `_pair` suffix for a single PNG containing both sides
- NEVER auto-mirror programmatically (asymmetric character)

---

## F. MANIFEST / DATA MODEL

```json
{
  "version": 2,
  "canvas": { "width": 1024, "height": 1536 },
  "anchors": {
    "head_center": [511, 680],
    "body_center": [574, 909],
    "left_iris": [408, 636],
    "right_iris": [636, 636],
    "eye_midpoint": [522, 636],
    "nose_center": [521, 708],
    "mouth_center": [521, 740],
    "collar_center": [511, 730],
    "left_ear_tip": [278, 443],
    "right_ear_tip": [745, 443],
    "left_earring_attach": [419, 736],
    "right_earring_attach": [624, 722],
    "aura_center": [511, 800]
  },
  "layerOrder": [
    "aura",
    "body_fur",
    "neck_accessory",
    "head_fur",
    "eyes",
    "brows",
    "nose_mouth",
    "ear_accessory",
    "aura_outline"
  ],
  "categories": {
    "body_fur": {
      "path": "base/body",
      "required": true,
      "default": "brown",
      "variants": {
        "brown":        { "file": "body_fur_brown.png",        "rarity": "common",   "price": 0 },
        "black":        { "file": "body_fur_black.png",        "rarity": "uncommon", "price": 50 },
        "arctic_white": { "file": "body_fur_arctic_white.png", "rarity": "rare",     "price": 75 },
        "merle":        { "file": "body_fur_merle.png",        "rarity": "epic",     "price": 100 }
      }
    },
    "head_fur": {
      "path": "base/head",
      "required": true,
      "default": "brown",
      "variants": {
        "brown":        { "file": "head_fur_brown.png",        "rarity": "common",   "price": 0 },
        "black":        { "file": "head_fur_black.png",        "rarity": "uncommon", "price": 50 },
        "arctic_white": { "file": "head_fur_arctic_white.png", "rarity": "rare",     "price": 75 },
        "merle":        { "file": "head_fur_merle.png",        "rarity": "epic",     "price": 100 }
      }
    },
    "eyes": {
      "path": "face/eyes",
      "required": true,
      "default": "green",
      "variants": {
        "green":  { "file": "eyes_green.png",  "rarity": "common",   "price": 0 },
        "blue":   { "file": "eyes_blue.png",   "rarity": "uncommon", "price": 30 },
        "red":    { "file": "eyes_red.png",    "rarity": "rare",     "price": 75 },
        "purple": { "file": "eyes_purple.png", "rarity": "uncommon", "price": 50 }
      }
    },
    "brows": {
      "path": "face/brows",
      "required": true,
      "default": "neutral",
      "variants": {
        "neutral": { "file": "brows_neutral.png", "rarity": "common", "price": 0 },
        "happy":   { "file": "brows_happy.png",   "rarity": "common", "price": 20 },
        "angry":   { "file": "brows_angry.png",   "rarity": "common", "price": 20 }
      }
    },
    "nose_mouth": {
      "path": "face/nose_mouth",
      "required": true,
      "default": "neutral",
      "variants": {
        "neutral": { "file": "nose_mouth_neutral.png", "rarity": "common",   "price": 0 },
        "smile":   { "file": "nose_mouth_smile.png",   "rarity": "common",   "price": 20 },
        "smirk":   { "file": "nose_mouth_smirk.png",   "rarity": "uncommon", "price": 30 }
      }
    },
    "neck_accessory": {
      "path": "accessories/neck",
      "required": false,
      "default": null,
      "variants": {
        "collar_diamond": { "file": "collar_diamond.png", "rarity": "rare",     "price": 125 },
        "collar_round":   { "file": "collar_round.png",   "rarity": "uncommon", "price": 75 },
        "collar_spikes":  { "file": "collar_spikes.png",  "rarity": "epic",     "price": 150 }
      }
    },
    "ear_accessory": {
      "path": "accessories/ears",
      "required": false,
      "default": null,
      "mirrored": false,
      "pairable": true,
      "variants": {
        "earring_left":  { "file": "earring_left.png",  "side": "left",  "rarity": "uncommon", "price": 100 },
        "earring_right": { "file": "earring_right.png", "side": "right", "rarity": "uncommon", "price": 100 }
      }
    },
    "aura": {
      "path": "auras",
      "required": false,
      "default": null,
      "variants": {
        "blue":    { "file": "aura_blue.png",    "rarity": "rare",      "price": 150 },
        "green":   { "file": "aura_green.png",   "rarity": "rare",      "price": 150 },
        "purple":  { "file": "aura_purple.png",  "rarity": "epic",      "price": 200 },
        "red":     { "file": "aura_red.png",     "rarity": "epic",      "price": 200 },
        "yellow":  { "file": "aura_yellow.png",  "rarity": "legendary", "price": 250 },
        "outline": { "file": "aura_outline.png", "rarity": "uncommon",  "price": 100 }
      }
    }
  }
}
```

---

## G. RISK CHECK / ALIGNMENT ISSUES

### ISSUE 1: Brow layers have stray semi-transparent pixels

**Problem:** `brows_neutral` and `brows_happy` have bounding boxes spanning y=326 to y=909 (583px tall), but 90% of actual visible content is in a 40px band (y=581-622). Stray semi-transparent pixels from scaling/processing spread across the canvas.

**Fix:** Re-process brow layers with a minimum alpha threshold. Discard any pixel with alpha < 30 to eliminate stray artifacts. Actual brow content should have bbox within (300, 565) to (740, 660).

### ISSUE 2: Eye variant blue has smaller content bounds

**Problem:** `eyes_blue` content bbox is (340, 611)-(707, 671) while other eye variants extend to (315, 585)-(733, 669). The blue eyes are visually smaller and positioned ~25px lower.

**Fix:** Re-process `eyes_blue` from source, ensuring the same scale factor and anchor point as other eye variants. All eye variants must share identical bounds.

### ISSUE 3: Collar layers have near-full-canvas bounding boxes

**Problem:** Collar assets report bounding boxes spanning nearly the entire canvas (e.g., 1023x1523px) despite the actual collar being ~400px wide and ~60px tall. This indicates stray semi-transparent pixels from source export.

**Fix:** Apply alpha threshold cleanup (discard alpha < 20). Actual collar content should be bounded within (260, 690) to (765, 860).

### ISSUE 4: Earring layers have full-canvas bounding boxes

**Problem:** Same issue as collars. `earring_left` shows a 1024x1530 bbox for a tiny earring.

**Fix:** Same alpha threshold cleanup. Actual earring content:
- Left: (383, 685) to (456, 787)
- Right: (586, 669) to (663, 776)

### ISSUE 5: Arctic white fur uses base-alpha extraction

**Problem:** White fur on white background cannot be separated by color thresholding. Must use `body_base`/`head_base` alpha channel as mask. This creates a dependency: if the base silhouette doesn't match the fur drawing exactly, edge artifacts appear.

**Fix:** The artist must export `body_fur_arctic_white.png` and `head_fur_arctic_white.png` with proper alpha from the source application (Procreate/Photoshop). Do NOT rely on code-side alpha extraction for white-on-white assets.

### ISSUE 6: Aura silhouettes are not identical

**Problem:** Aura bounding boxes vary across color variants:
- Yellow: 613x619 (largest)
- Outline: 562x515 (smallest)
- Difference: 51px width, 104px height

**Fix:** All aura variants must be traced from a single master aura shape. Export all from the same template path, changing only fill color.

### ISSUE 7: Body-head seam at overlap zone

**Problem:** Body and head layers overlap at y=681-910. If fur colors between body and head don't blend at this seam, a visible line appears.

**Fix:** Head fur layer renders ON TOP of body fur. The head_fur drawing must include enough chest/neck fur to completely cover the overlap zone. The artist must paint head_fur content down to at least y=900.

---

## H. FINAL IMPLEMENTATION RULES

### For Developers

1. **Zero-offset stacking.** Every layer renders at position (0, 0) on the canvas. No translate, no offset, no manual adjustment. If a layer doesn't align, the ASSET is wrong, not the code.

2. **Identical canvas size.** Every PNG must be exactly 1024x1536. Reject any asset that doesn't match.

3. **Layer order is law.** Always render in the exact order specified in Section D. Never reorder layers.

4. **Use `resizeMode="contain"`** (React Native) or equivalent. Since all layers share the same aspect ratio (2:3), they will scale identically and maintain alignment at any display size.

5. **Alpha threshold cleanup.** On asset import, discard any pixel with alpha < 10. This eliminates stray semi-transparent artifacts from export tools.

6. **Validate before shipping.** Automated test: composite all default layers and compare against `Master_Avatar_Template.png`. Pixel difference should be < 5% in the character region.

### For Designers / Artists

1. **Always start from `Master_Avatar_Template.png`.** Open it as a locked background layer. Draw your asset on top. Export only your layer at 1024x1536.

2. **Never crop.** Export the full canvas including all transparent padding.

3. **Export as PNG-24 with alpha.** Not PNG-8. Not JPEG. Not flattened.

4. **Match the silhouette.** Fur variants must fill exactly the same area as the base. Not larger, not smaller.

5. **Test your export.** Stack your exported PNG on top of the master template at 100% zoom. If anything is misaligned by even 1 pixel, fix it before delivery.

6. **Consistent stroke weight.** All outlines must use the same stroke width as the master template. Measure it. Match it.

7. **Flat colors only.** No gradients, no blur, no glow, no soft shading. Flat fills with hard outlines.

8. **No embedded backgrounds.** The only pixels in your export should be your asset content. Everything else must be alpha = 0.

9. **Accessories attach, they don't float.** Every accessory must visually connect to its anchor point. Earrings touch the ear. Collars wrap the neck. Nothing hovers.

10. **Name correctly.** Follow Section E naming exactly. One wrong character in a filename breaks the asset pipeline.

---

## Quick Reference Card

```
Canvas:     1024 x 1536
Head top:   y = 443
Eyes:       y = 636,  left x = 408,  right x = 636
Nose:       y = 708,  x = 521
Collar:     y = 730,  x = 511
Body bottom: y = 1137
Overlap:    y = 681 to y = 910

Layer order (back to front):
  1. aura
  2. body_fur
  3. neck_accessory
  4. head_fur
  5. eyes
  6. brows
  7. nose_mouth
  8. ear_accessory
  9. aura_outline
```

---

## I. SELF-AUDIT AND CORRECTIONS

### 1. NAMING INCONSISTENCIES — CORRECTED

**Quick Reference Card used informal names.** The Quick Reference Card above originally said "collar" (layer 3) and "earrings" (layer 8). These MUST match the canonical category names used everywhere else: `neck_accessory` and `ear_accessory`. **Corrected above.**

**Catalog item ID prefixing is inconsistent.** The cosmetic catalog (`lockeCustomization.ts`) uses these ID patterns:

| Category | ID pattern | Example |
|---|---|---|
| body_fur | `body_fur_{variant}` | `body_fur_brown` |
| head_fur | `head_fur_{variant}` | `head_fur_black` |
| eyes | `eyes_{variant}` | `eyes_green` |
| brows | `brows_{variant}` | `brows_neutral` |
| nose_mouth | `nose_mouth_{variant}` | `nose_mouth_smile` |
| neck_accessory | `neck_collar_{variant}` | `neck_collar_diamond` |
| ear_accessory | `ear_earring_{variant}` | `ear_earring_left` |
| aura | `aura_{variant}` | `aura_blue` |

The `neck_` and `ear_` prefixes are redundant — no other category uses a namespace prefix. This creates a mismatch: the manifest variant key is `collar_diamond` but the catalog item ID is `neck_collar_diamond`. While these serve different purposes (catalog ID vs asset variant key), the inconsistency is a maintenance trap.

**Ruling:** Keep current IDs to avoid a migration, but for ALL future items, the canonical pattern is:

```
{category}_{variant}
```

New neck accessories: `neck_accessory_chain`, NOT `neck_collar_chain`.
New ear accessories: `ear_accessory_cuff`, NOT `ear_earring_cuff`.

### 2. AURA OUTLINE — LAYER 9 NOT IMPLEMENTED

**Problem:** Section D defines `aura_outline` as a separate layer 9 (topmost), but the renderer (`LockeAvatarBuilder.tsx`) treats `outline` as just another aura variant rendered at layer 1 (behind everything). There is no separate layer-9 rendering path. The user can equip `outline` OR a colored aura, but never both simultaneously.

**Impact:** If a designer creates an outline asset expecting it to render in front of the character, it will actually render behind. The spec claims a capability the code does not support.

**Correction:** Strike layer 9 from the spec until the renderer supports dual-aura rendering. The `aura_outline` variant renders at layer 1 like all other auras. If dual rendering is desired later, the `LockeCustomization` type needs a separate `auraOutline: boolean` field.

**Updated layer count: 8 active layers, not 9.**

| Z-Order | Layer | Implemented |
|---|---|---|
| 1 | `aura` (all variants incl. outline) | YES |
| 2 | `body_fur` | YES |
| 3 | `neck_accessory` | YES |
| 4 | `head_fur` | YES |
| 5 | `eyes` | YES |
| 6 | `brows` | YES |
| 7 | `nose_mouth` | YES |
| 8 | `ear_accessory` | YES |
| ~~9~~ | ~~`aura_outline`~~ | **NOT IMPLEMENTED** |

### 3. ALPHA THRESHOLD — THREE CONFLICTING VALUES

The spec defines three different alpha cleanup thresholds in different sections:

| Section | Threshold | Context |
|---|---|---|
| G, Issue 1 (brows) | alpha < 30 | Brow stray pixel cleanup |
| G, Issue 3 (collars) | alpha < 20 | Collar stray pixel cleanup |
| H, Rule 5 (global) | alpha < 10 | Global import rule |

**Correction:** Use a single threshold. **alpha < 15 is the canonical threshold.** This is strict enough to catch export artifacts but permissive enough to preserve intentional semi-transparent edges (soft shadows on collars, anti-aliased brow strokes). All three references above are superseded by this value.

### 4. WEAK ASSUMPTION: `resizeMode="contain"` ALIGNMENT GUARANTEE

The spec states that `resizeMode="contain"` ensures layer alignment (Section H, Rule 4). This is **only true if the container maintains the exact 2:3 aspect ratio**. If the container is square (e.g., a profile thumbnail), `contain` will add letterboxing and all layers will still align because they all receive identical treatment. However:

**Risk:** If individual layers were ever rendered in separate containers with different aspect ratios, alignment would break. The spec assumes all layers share one container but never states this explicitly.

**Correction — new rule:**

> **H.4a. Single container rule.** All layers MUST be children of the same parent container. Never render layers in separate Views/containers. The parent container's aspect ratio MUST be exactly 2:3 (width:height = 1:1.5). The renderer enforces this via `height = size * 1.5`.

### 5. WEAK ASSUMPTION: "FLAT COLORS ONLY" CONTRADICTS AURA ASSETS

Section H, Rule 7 for artists states: "No gradients, no blur, no glow, no soft shading. Flat fills with hard outlines."

Aura layers are inherently glow effects with soft transparency gradients. This rule cannot apply to them.

**Correction:** Amend Rule 7:

> **Flat colors only — for character layers (body_fur, head_fur, eyes, brows, nose_mouth, accessories).** Aura layers are exempt and MAY use soft gradients, glow, and variable alpha for atmospheric effects. However, aura layers must still maintain a consistent outer silhouette (Section C.10).

### 6. AMBIGUOUS ANCHORS — SPEC VS MANIFEST DIVERGENCE

The spec defines 20+ anchor points. The manifest (`manifest.json`) only contains 12. Missing from manifest:

| Anchor | In Spec | In Manifest |
|---|---|---|
| `canvas_center` | YES | NO |
| `avatar_center` | YES | NO |
| `left_ear_base` | YES | NO |
| `right_ear_base` | YES | NO |
| `brow_center` | YES | NO |
| `muzzle_center` | YES | NO |
| `collar_band_top` | YES | NO |
| `collar_band_bottom` | YES | NO |
| `collar_tag_hang` | YES | NO |
| `inter_eye_span` | YES (228px) | NO |

**Impact:** None for runtime — the renderer uses zero-offset stacking and doesn't read anchors. These anchors exist purely for artist/designer reference. However, if tooling is ever built to validate assets against anchor zones, the manifest would be incomplete.

**Correction:** The manifest is the **runtime** data source. The spec is the **design** reference. The manifest intentionally contains only anchors needed for programmatic use. The additional spec-only anchors (ear_base, brow_center, muzzle_center, band edges) are **design guides** and do NOT need to be in the manifest unless code needs them.

**Additionally:** `muzzle_center` is listed as (521, 716) but the midpoint of `nose_center` (521, 708) and `mouth_center` (521, 740) is (521, 724), not 716. The value 716 likely represents the visual centroid of the nose+mouth region weighted toward the nose. **Rename to `nose_mouth_anchor` and note it is NOT a simple average.** It represents the primary alignment point for nose_mouth layer placement.

### 7. EARRING-COLLAR Z-FIGHTING

**Problem:** Earring attachment points (`left_earring_attach` at y=736, `right_earring_attach` at y=722) fall within the collar band zone (y=700 to y=760). Since ear accessories render at layer 8 (above everything), and collars render at layer 3 (below head), this is not a visual conflict — the earrings will always render in front.

**However:** If an earring has a long dangle (extending below y=760), it would render in front of the head fur at the chin area, which may look unnatural. The earring appears to "float" in front of the chin rather than behind it.

**Correction — new constraint:**

> **Earring max-y rule:** Earring content MUST NOT extend below y=800. This prevents earring dangles from visually clipping over the chin/chest area where they should logically be behind the head.

### 8. SEASONAL/PRESTIGE ITEMS — NO ASSET PIPELINE

**Problem:** `seasonalCosmeticService.ts` defines 18 seasonal and prestige cosmetic items (e.g., `fur_spring_bloom`, `eye_alpha_crimson`, `acc_flower_crown`). These items reference categories like `body_fur`, `eyes`, and `neck_accessory`, but:

- No corresponding PNG assets exist in `assets/avatar/layers/`
- No `require()` entries exist in `LockeAvatarBuilder.tsx` asset maps
- The `preview` field contains hex colors (e.g., `#FF69B4`) or icon names (e.g., `flower-outline`), not variant keys

**Impact:** If a user purchases a seasonal item and tries to equip it, `selectItem()` will set a variant key (e.g., `spring_bloom`) that has no matching asset. The renderer will fall back to the default (`BODY_FUR.brown`), silently ignoring the purchase.

**Correction:** Seasonal/prestige items are **catalog placeholders only** until assets are produced. The spec must be explicit:

> **Seasonal item rule:** No seasonal or prestige item may be made purchasable in the studio UI until its corresponding PNG asset exists in the layer system AND a `require()` entry is added to `LockeAvatarBuilder.tsx`. The `preview` field on seasonal items currently holds swatch colors for the shop UI, NOT variant keys for the renderer.

### 9. ANIMATION INTERACTION — UNDOCUMENTED

**Problem:** The renderer applies two animations simultaneously:

1. **Breathing:** `translateY` (0 to -3px) + `scaleY` (1.0 to 1.008) on all layers
2. **Aura pulse:** `opacity` (0.7 to 1.0) + `scale` (1.0 to 1.03) on aura only

The aura's `Animated.View` is **nested inside** the breathing `Animated.View`. This means the aura receives BOTH transforms stacked: it breathes AND pulses. The combined scale at peak is `1.008 * 1.03 = 1.038` — a 3.8% scale increase that could push aura content ~15px beyond the max bounding box defined in Section C.10.

**Correction:** The aura max bounding box must account for animation scale:

> **Aura max bounding (animated):** Expand max bounding by 4% from `aura_center` in all directions. Static max: (180, 430) to (845, 1100). Animated max: (167, 415) to (858, 1115). Asset content should stay within static max; the animated max is the true screen-space boundary.

### 10. MISSING SPEC: UNEQUIP / "NONE" STATE

**Problem:** The spec defines optional categories (neck_accessory, ear_accessory, aura) but never specifies how "nothing equipped" is represented or how the user unequips an item.

**Correction:**

> **Unequip rule:** Optional categories use `null` in `LockeCustomization` to represent "nothing equipped." The studio UI must provide an explicit "None" option for each optional category. The manifest uses `"default": null` for optional categories. The renderer skips any layer where the source resolves to `null`.

### CORRECTIONS SUMMARY

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Quick Reference naming inconsistency | Low | **FIXED** in this revision |
| 2 | Layer 9 (aura_outline) not implemented | High | **DOCUMENTED** — strike from active spec |
| 3 | Three conflicting alpha thresholds | Medium | **RESOLVED** — canonical value: alpha < 15 |
| 4 | `resizeMode` assumption undocumented | Medium | **TIGHTENED** — single container rule added |
| 5 | "Flat colors" contradicts aura assets | Low | **AMENDED** — auras exempt from flat-color rule |
| 6 | Spec anchors not in manifest | Low | **CLARIFIED** — manifest is runtime, spec is design |
| 7 | Earring-collar z-fighting potential | Medium | **CONSTRAINED** — earring max-y=800 rule added |
| 8 | Seasonal items have no assets | High | **DOCUMENTED** — placeholders until assets exist |
| 9 | Animation affects bounding boxes | Low | **DOCUMENTED** — animated max bounding added |
| 10 | No unequip/none state documented | Medium | **DOCUMENTED** — null = unequipped |
