/**
 * LockeAvatarBuilder — Layer-swap avatar rendering engine.
 *
 * Architecture:
 *  All layers are pre-processed 1024×1536 PNGs with true alpha transparency.
 *  Layers are stacked in a fixed order with zero positioning or scaling.
 *
 * Layer order:
 *  0. master_base (always-on wolf silhouette with outlines)
 *  1. aura (behind everything)
 *  2. body_fur (optional color overlay on body)
 *  3. neck_accessory
 *  4. head_fur (optional color overlay on head)
 *  5. eyes
 *  6. brows
 *  7. nose_mouth
 *  8. ear_accessory
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Image, StyleSheet } from "react-native";
import { loadLockeCustomization } from "../../lib/storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { LockeCustomization } from "../../lib/types";

// ── Canvas dimensions ────────────────────────────────────────────────────────

const IMG_W = 1024;
const IMG_H = 1536;
const ASPECT = IMG_H / IMG_W; // 1.5

// ── Master base — always-on wolf silhouette ──────────────────────────────────

const MASTER_BASE = require("../../assets/avatar/layers/base/master_base.png");

// ── Asset map — all pre-processed layers at 1024×1536 ────────────────────────

const BODY_FUR: Record<string, ReturnType<typeof require>> = {
  brown:        require("../../assets/avatar/layers/base/body/body_fur_brown.png"),
  black:        require("../../assets/avatar/layers/base/body/body_fur_black.png"),
  arctic_white: require("../../assets/avatar/layers/base/body/body_fur_arctic_white.png"),
  merle:        require("../../assets/avatar/layers/base/body/body_fur_merle.png"),
};

const HEAD_FUR: Record<string, ReturnType<typeof require>> = {
  brown:        require("../../assets/avatar/layers/base/head/head_fur_brown.png"),
  black:        require("../../assets/avatar/layers/base/head/head_fur_black.png"),
  arctic_white: require("../../assets/avatar/layers/base/head/head_fur_arctic_white.png"),
  merle:        require("../../assets/avatar/layers/base/head/head_fur_merle.png"),
};

const EYES: Record<string, ReturnType<typeof require>> = {
  green:  require("../../assets/avatar/layers/face/eyes/eyes_green.png"),
  blue:   require("../../assets/avatar/layers/face/eyes/eyes_blue.png"),
  red:    require("../../assets/avatar/layers/face/eyes/eyes_red.png"),
  purple: require("../../assets/avatar/layers/face/eyes/eyes_purple.png"),
};

const BROWS: Record<string, ReturnType<typeof require>> = {
  neutral: require("../../assets/avatar/layers/face/brows/brows_neutral.png"),
  happy:   require("../../assets/avatar/layers/face/brows/brows_happy.png"),
  angry:   require("../../assets/avatar/layers/face/brows/brows_angry.png"),
};

const NOSE_MOUTH: Record<string, ReturnType<typeof require>> = {
  neutral: require("../../assets/avatar/layers/face/nose_mouth/nose_mouth_neutral.png"),
  smile:   require("../../assets/avatar/layers/face/nose_mouth/nose_mouth_smile.png"),
  smirk:   require("../../assets/avatar/layers/face/nose_mouth/nose_mouth_smirk.png"),
};

const NECK_ACCESSORIES: Record<string, ReturnType<typeof require>> = {
  collar_diamond:  require("../../assets/avatar/layers/accessories/neck/collar_diamond.png"),
  collar_round:    require("../../assets/avatar/layers/accessories/neck/collar_round.png"),
  collar_spikes:   require("../../assets/avatar/layers/accessories/neck/collar_spikes.png"),
  scout_bandana:   require("../../assets/avatar/layers/accessories/neck/scout_bandana.png"),
};

const HEAD_ACCESSORIES: Record<string, ReturnType<typeof require>> = {
  flower_crown: require("../../assets/avatar/layers/accessories/head/flower_crown.png"),
  apex_crown:   require("../../assets/avatar/layers/accessories/head/apex_crown.png"),
};

const EAR_ACCESSORIES: Record<string, ReturnType<typeof require>> = {
  earring_left:  require("../../assets/avatar/layers/accessories/ears/earring_left.png"),
  earring_right: require("../../assets/avatar/layers/accessories/ears/earring_right.png"),
};

const AURAS: Record<string, ReturnType<typeof require>> = {
  blue:    require("../../assets/avatar/layers/auras/aura_blue.png"),
  green:   require("../../assets/avatar/layers/auras/aura_green.png"),
  purple:  require("../../assets/avatar/layers/auras/aura_purple.png"),
  red:     require("../../assets/avatar/layers/auras/aura_red.png"),
  yellow:  require("../../assets/avatar/layers/auras/aura_yellow.png"),
};

// ── Default customization ────────────────────────────────────────────────────

export const DEFAULT_AVATAR: LockeCustomization = {
  bodyFur: null,
  headFur: null,
  eyes: null,
  brows: null,
  noseMouth: null,
  headAccessory: null,
  neckAccessory: null,
  earAccessory: null,
  aura: null,
};

// ── Layer component (memoized) ──────────────────────────────────────────────

type LayerProps = {
  source: ReturnType<typeof require>;
  imgStyle: { width: number; height: number };
  onLoad?: () => void;
};

const AvatarLayer = React.memo(function AvatarLayer({ source, imgStyle, onLoad }: LayerProps) {
  return (
    <Image
      source={source}
      style={[StyleSheet.absoluteFill, imgStyle]}
      resizeMode="contain"
      fadeDuration={0}
      onLoad={onLoad}
    />
  );
});

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  size: number;
  customization?: LockeCustomization;
  animated?: boolean;
};

// ── Main component ────────────────────────────────────────────────────────────

function LockeAvatarBuilderInner({ size, customization, animated = true }: Props) {
  const c = customization ?? DEFAULT_AVATAR;

  const bodyFurSrc = c.bodyFur ? (BODY_FUR[c.bodyFur] ?? BODY_FUR.brown) : null;
  const headFurSrc = c.headFur ? (HEAD_FUR[c.headFur] ?? HEAD_FUR.brown) : null;
  const eyesSrc = c.eyes ? (EYES[c.eyes] ?? EYES.green) : null;
  const browsSrc = c.brows ? (BROWS[c.brows] ?? BROWS.neutral) : null;
  const noseMouthSrc = c.noseMouth ? (NOSE_MOUTH[c.noseMouth] ?? NOSE_MOUTH.neutral) : null;
  const headAccSrc = c.headAccessory ? HEAD_ACCESSORIES[c.headAccessory] : null;
  const neckSrc = c.neckAccessory ? NECK_ACCESSORIES[c.neckAccessory] : null;
  const earSrc = c.earAccessory ? EAR_ACCESSORIES[c.earAccessory] : null;
  const auraSrc = c.aura ? AURAS[c.aura] : null;

  // Collect all active layer sources
  const activeSources: ReturnType<typeof require>[] = [];
  if (!bodyFurSrc && !headFurSrc) activeSources.push(MASTER_BASE);
  if (auraSrc) activeSources.push(auraSrc);
  if (bodyFurSrc) activeSources.push(bodyFurSrc);
  if (neckSrc) activeSources.push(neckSrc);
  if (headFurSrc) activeSources.push(headFurSrc);
  if (eyesSrc) activeSources.push(eyesSrc);
  if (browsSrc) activeSources.push(browsSrc);
  if (noseMouthSrc) activeSources.push(noseMouthSrc);
  if (headAccSrc) activeSources.push(headAccSrc);
  if (earSrc) activeSources.push(earSrc);

  // Gate: invisible only on first mount until all layers decode.
  // After first ready, stay visible so layer swaps don't blink.
  const loadedSet = useRef(new Set<ReturnType<typeof require>>());
  const hasEverBeenReady = useRef(false);
  const [ready, setReady] = useState(false);

  // When sources change, prune removed sources but never hide after first ready
  useEffect(() => {
    const activeSet = new Set(activeSources);
    for (const s of loadedSet.current) {
      if (!activeSet.has(s)) loadedSet.current.delete(s);
    }
    const allLoaded = activeSources.length > 0 && activeSources.every((s) => loadedSet.current.has(s));
    if (allLoaded) {
      hasEverBeenReady.current = true;
      setReady(true);
    } else if (!hasEverBeenReady.current) {
      setReady(false);
    }
    // If hasEverBeenReady, keep ready=true (no blink)
  }, [bodyFurSrc, headFurSrc, eyesSrc, browsSrc, noseMouthSrc, headAccSrc, neckSrc, earSrc, auraSrc, activeSources.length]);

  const activeSourcesRef = useRef(activeSources);
  activeSourcesRef.current = activeSources;

  const handleLayerLoad = useCallback((src: ReturnType<typeof require>) => {
    loadedSet.current.add(src);
    const all = activeSourcesRef.current;
    if (all.every((s) => loadedSet.current.has(s))) {
      hasEverBeenReady.current = true;
      setReady(true);
    }
  }, []);

  const w = size;
  const h = size * ASPECT;
  const imgStyle = { width: w, height: h };

  // Breathing idle animation
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (!animated) return;
    breathe.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [animated]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -breathe.value * 3 },
      { scaleY: 1 + breathe.value * 0.008 },
    ],
  }));

  // Aura pulse animation
  const auraPulse = useSharedValue(0);
  useEffect(() => {
    if (!auraSrc) return;
    auraPulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [auraSrc]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + auraPulse.value * 0.25,
  }));

  return (
    <View style={{ width: w, height: h, alignItems: "center", justifyContent: "center" }}>
      {/* Foot shadow */}
      <View
        style={[
          styles.footShadow,
          {
            width: w * 0.35,
            height: w * 0.03,
            borderRadius: w * 0.015,
            bottom: w * 0.06,
          },
        ]}
      />

      <Animated.View style={[{ width: w, height: h, opacity: ready ? 1 : 0 }, animated ? breatheStyle : undefined]}>
        {/* Layer 0: Master base — only shown when no fur is selected */}
        {!bodyFurSrc && !headFurSrc && (
          <AvatarLayer source={MASTER_BASE} imgStyle={imgStyle} onLoad={() => handleLayerLoad(MASTER_BASE)} />
        )}

        {/* Layer 1: Aura (behind fur but in front of base) */}
        {auraSrc && (
          <Animated.View style={[StyleSheet.absoluteFill, auraStyle]}>
            <AvatarLayer source={auraSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(auraSrc)} />
          </Animated.View>
        )}

        {/* Layer 2: Body fur */}
        {bodyFurSrc && <AvatarLayer source={bodyFurSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(bodyFurSrc)} />}

        {/* Layer 3: Neck accessory */}
        {neckSrc && <AvatarLayer source={neckSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(neckSrc)} />}

        {/* Layer 4: Head fur */}
        {headFurSrc && <AvatarLayer source={headFurSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(headFurSrc)} />}

        {/* Layer 5: Eyes */}
        {eyesSrc && <AvatarLayer source={eyesSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(eyesSrc)} />}

        {/* Layer 6: Brows */}
        {browsSrc && <AvatarLayer source={browsSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(browsSrc)} />}

        {/* Layer 7: Nose + Mouth */}
        {noseMouthSrc && <AvatarLayer source={noseMouthSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(noseMouthSrc)} />}

        {/* Layer 8: Head accessory */}
        {headAccSrc && <AvatarLayer source={headAccSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(headAccSrc)} />}

        {/* Layer 9: Ear accessory */}
        {earSrc && <AvatarLayer source={earSrc} imgStyle={imgStyle} onLoad={() => handleLayerLoad(earSrc)} />}
      </Animated.View>
    </View>
  );
}

export const LockeAvatarBuilder = React.memo(LockeAvatarBuilderInner);

/**
 * Hidden component that renders the user's actual avatar layers off-screen
 * to force image decode into the cache. Mount this once in the root layout.
 */
function resolveLayerSources(c: LockeCustomization): ReturnType<typeof require>[] {
  const sources: ReturnType<typeof require>[] = [];
  if (c.bodyFur && BODY_FUR[c.bodyFur]) sources.push(BODY_FUR[c.bodyFur]);
  if (c.headFur && HEAD_FUR[c.headFur]) sources.push(HEAD_FUR[c.headFur]);
  if (c.eyes && EYES[c.eyes]) sources.push(EYES[c.eyes]);
  if (c.brows && BROWS[c.brows]) sources.push(BROWS[c.brows]);
  if (c.noseMouth && NOSE_MOUTH[c.noseMouth]) sources.push(NOSE_MOUTH[c.noseMouth]);
  if (c.headAccessory && HEAD_ACCESSORIES[c.headAccessory]) sources.push(HEAD_ACCESSORIES[c.headAccessory]);
  if (c.neckAccessory && NECK_ACCESSORIES[c.neckAccessory]) sources.push(NECK_ACCESSORIES[c.neckAccessory]);
  if (c.earAccessory && EAR_ACCESSORIES[c.earAccessory]) sources.push(EAR_ACCESSORIES[c.earAccessory]);
  if (c.aura && AURAS[c.aura]) sources.push(AURAS[c.aura]);
  // Fallback to defaults if empty
  if (sources.length === 0) {
    sources.push(BODY_FUR.brown, HEAD_FUR.brown, EYES.green, BROWS.neutral, NOSE_MOUTH.neutral);
  }
  return sources;
}

export const AvatarPrewarmer = React.memo(function AvatarPrewarmer() {
  const [layers, setLayers] = useState<ReturnType<typeof require>[]>(() =>
    resolveLayerSources(DEFAULT_AVATAR)
  );

  useEffect(() => {
    loadLockeCustomization().then((c) => setLayers(resolveLayerSources(c)));
  }, []);

  const prewarmW = 80;
  const prewarmH = 80 * ASPECT;

  return (
    <View style={styles.prewarmer} pointerEvents="none">
      {layers.map((src, i) => (
        <Image
          key={i}
          source={src}
          style={{ width: prewarmW, height: prewarmH }}
          resizeMode="contain"
          fadeDuration={0}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  footShadow: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  prewarmer: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0.01,
  },
});
