import type { MovementPattern, OrmLiftKey, LoadModifier } from "../types";

// ── Layer 1: Keyword Rules ──────────────────────────────────────────────────
// Each keyword maps to a movement pattern, optional baseLift, and a score (1-10).
// Higher scores indicate stronger signal for that pattern.

export type KeywordRule = {
  pattern: MovementPattern;
  baseLift: OrmLiftKey | null;
  score: number;
};

export const KEYWORD_RULES: Record<string, KeywordRule> = {
  // Squat patterns
  "squat":        { pattern: "squat",           baseLift: "squat",    score: 10 },
  "leg press":    { pattern: "squat",           baseLift: "squat",    score: 7 },
  "hack":         { pattern: "squat",           baseLift: "squat",    score: 6 },
  "pistol":       { pattern: "squat",           baseLift: "squat",    score: 5 },
  "sissy":        { pattern: "squat",           baseLift: null,       score: 4 },
  "wall sit":     { pattern: "squat",           baseLift: null,       score: 3 },

  // Hip-hinge patterns
  "deadlift":     { pattern: "hip-hinge",       baseLift: "deadlift", score: 10 },
  "rdl":          { pattern: "hip-hinge",       baseLift: "deadlift", score: 9 },
  "romanian":     { pattern: "hip-hinge",       baseLift: "deadlift", score: 9 },
  "stiff-leg":    { pattern: "hip-hinge",       baseLift: "deadlift", score: 8 },
  "good morning": { pattern: "hip-hinge",       baseLift: "deadlift", score: 7 },
  "pull":         { pattern: "hip-hinge",       baseLift: "deadlift", score: 3 },
  "clean":        { pattern: "hip-hinge",       baseLift: "deadlift", score: 5 },
  "snatch-grip":  { pattern: "hip-hinge",       baseLift: "deadlift", score: 6 },
  "rack pull":    { pattern: "hip-hinge",       baseLift: "deadlift", score: 7 },
  "block pull":   { pattern: "hip-hinge",       baseLift: "deadlift", score: 7 },
  "pin pull":     { pattern: "hip-hinge",       baseLift: "deadlift", score: 7 },
  "trap bar":     { pattern: "hip-hinge",       baseLift: "deadlift", score: 7 },

  // Horizontal push
  "bench":        { pattern: "horizontal-push", baseLift: "bench",    score: 10 },
  "chest press":  { pattern: "horizontal-push", baseLift: "bench",    score: 8 },
  "push-up":      { pattern: "horizontal-push", baseLift: null,       score: 5 },
  "push up":      { pattern: "horizontal-push", baseLift: null,       score: 5 },
  "dip":          { pattern: "horizontal-push", baseLift: "bench",    score: 5 },
  "floor press":  { pattern: "horizontal-push", baseLift: "bench",    score: 8 },
  "squeeze press":{ pattern: "horizontal-push", baseLift: "bench",    score: 6 },
  "hex press":    { pattern: "horizontal-push", baseLift: "bench",    score: 6 },
  "svend press":  { pattern: "horizontal-push", baseLift: null,       score: 3 },
  "flye":         { pattern: "horizontal-push", baseLift: null,       score: 4 },
  "fly":          { pattern: "horizontal-push", baseLift: null,       score: 4 },
  "crossover":    { pattern: "horizontal-push", baseLift: null,       score: 4 },
  "pec deck":     { pattern: "horizontal-push", baseLift: null,       score: 4 },

  // Horizontal pull
  "row":          { pattern: "horizontal-pull", baseLift: null,       score: 8 },
  "cable row":    { pattern: "horizontal-pull", baseLift: null,       score: 7 },
  "face pull":    { pattern: "horizontal-pull", baseLift: null,       score: 5 },
  "pull-apart":   { pattern: "horizontal-pull", baseLift: null,       score: 4 },
  "rear delt":    { pattern: "horizontal-pull", baseLift: null,       score: 5 },
  "reverse flye": { pattern: "horizontal-pull", baseLift: null,       score: 5 },
  "reverse pec":  { pattern: "horizontal-pull", baseLift: null,       score: 5 },

  // Vertical push
  "overhead press":  { pattern: "vertical-push",  baseLift: "ohp",   score: 10 },
  "ohp":             { pattern: "vertical-push",  baseLift: "ohp",   score: 10 },
  "shoulder press":  { pattern: "vertical-push",  baseLift: "ohp",   score: 9 },
  "military press":  { pattern: "vertical-push",  baseLift: "ohp",   score: 9 },
  "push press":      { pattern: "vertical-push",  baseLift: "ohp",   score: 8 },
  "arnold":          { pattern: "vertical-push",  baseLift: "ohp",   score: 7 },
  "landmine press":  { pattern: "vertical-push",  baseLift: "ohp",   score: 6 },
  "z press":         { pattern: "vertical-push",  baseLift: "ohp",   score: 7 },
  "viking press":    { pattern: "vertical-push",  baseLift: "ohp",   score: 7 },
  "lateral raise":   { pattern: "vertical-push",  baseLift: null,    score: 4 },
  "lateral":         { pattern: "vertical-push",  baseLift: null,    score: 3 },
  "front raise":     { pattern: "vertical-push",  baseLift: null,    score: 3 },
  "shrug":           { pattern: "vertical-push",  baseLift: null,    score: 3 },

  // Vertical pull
  "pull-up":       { pattern: "vertical-pull",  baseLift: null,      score: 8 },
  "pullup":        { pattern: "vertical-pull",  baseLift: null,      score: 8 },
  "chin-up":       { pattern: "vertical-pull",  baseLift: null,      score: 8 },
  "chinup":        { pattern: "vertical-pull",  baseLift: null,      score: 8 },
  "lat pulldown":  { pattern: "vertical-pull",  baseLift: null,      score: 8 },
  "pulldown":      { pattern: "vertical-pull",  baseLift: null,      score: 7 },
  "pullover":      { pattern: "vertical-pull",  baseLift: null,      score: 5 },

  // Hip extension
  "hip thrust":    { pattern: "hip-extension",  baseLift: null,      score: 9 },
  "glute bridge":  { pattern: "hip-extension",  baseLift: null,      score: 8 },
  "glute kickback":{ pattern: "hip-extension",  baseLift: null,      score: 5 },
  "donkey kick":   { pattern: "hip-extension",  baseLift: null,      score: 5 },
  "pull-through":  { pattern: "hip-extension",  baseLift: null,      score: 6 },
  "hyperextension":{ pattern: "hip-extension",  baseLift: null,      score: 5 },
  "back extension":{ pattern: "hip-extension",  baseLift: null,      score: 5 },
  "reverse hyper":  { pattern: "hip-extension", baseLift: null,      score: 5 },
  "glute-ham":     { pattern: "hip-extension",  baseLift: null,      score: 6 },
  "abduction":     { pattern: "hip-extension",  baseLift: null,      score: 4 },
  "fire hydrant":  { pattern: "hip-extension",  baseLift: null,      score: 3 },
  "frog pump":     { pattern: "hip-extension",  baseLift: null,      score: 4 },
  "clamshell":     { pattern: "hip-extension",  baseLift: null,      score: 3 },

  // Lunge patterns
  "lunge":         { pattern: "lunge",          baseLift: null,      score: 8 },
  "split squat":   { pattern: "lunge",          baseLift: null,      score: 8 },
  "step-up":       { pattern: "lunge",          baseLift: null,      score: 7 },
  "step up":       { pattern: "lunge",          baseLift: null,      score: 7 },

  // Isolation push (triceps)
  "pushdown":      { pattern: "isolation-push", baseLift: null,      score: 8 },
  "skull crusher":  { pattern: "isolation-push", baseLift: null,     score: 8 },
  "tricep":        { pattern: "isolation-push", baseLift: null,      score: 7 },
  "tricep kickback": { pattern: "isolation-push", baseLift: null,    score: 5 },
  "jm press":      { pattern: "isolation-push", baseLift: null,      score: 6 },

  // Isolation pull (biceps)
  "curl":          { pattern: "isolation-pull", baseLift: null,       score: 9 },
  "preacher":      { pattern: "isolation-pull", baseLift: null,       score: 7 },
  "concentration": { pattern: "isolation-pull", baseLift: null,       score: 7 },
  "spider":        { pattern: "isolation-pull", baseLift: null,       score: 7 },
  "bayesian":      { pattern: "isolation-pull", baseLift: null,       score: 7 },

  // Core
  "plank":         { pattern: "core",           baseLift: null,      score: 8 },
  "crunch":        { pattern: "core",           baseLift: null,      score: 7 },
  "sit-up":        { pattern: "core",           baseLift: null,      score: 7 },
  "sit up":        { pattern: "core",           baseLift: null,      score: 7 },
  "leg raise":     { pattern: "core",           baseLift: null,      score: 7 },
  "ab wheel":      { pattern: "core",           baseLift: null,      score: 8 },
  "rollout":       { pattern: "core",           baseLift: null,      score: 7 },
  "dead bug":      { pattern: "core",           baseLift: null,      score: 7 },
  "bird dog":      { pattern: "core",           baseLift: null,      score: 6 },
  "pallof":        { pattern: "core",           baseLift: null,      score: 7 },
  "russian twist":  { pattern: "core",          baseLift: null,      score: 6 },
  "woodchop":      { pattern: "core",           baseLift: null,      score: 6 },
  "hollow body":   { pattern: "core",           baseLift: null,      score: 7 },
  "l-sit":         { pattern: "core",           baseLift: null,      score: 7 },
  "bear crawl":    { pattern: "core",           baseLift: null,      score: 4 },
  "mountain climber":{ pattern: "core",         baseLift: null,      score: 4 },
  "v-up":          { pattern: "core",           baseLift: null,      score: 6 },

  // Conditioning
  "burpee":        { pattern: "conditioning",   baseLift: null,      score: 8 },
  "jump rope":     { pattern: "conditioning",   baseLift: null,      score: 7 },
  "sprint":        { pattern: "conditioning",   baseLift: null,      score: 7 },
  "rowing":        { pattern: "conditioning",   baseLift: null,      score: 7 },
  "bike":          { pattern: "conditioning",   baseLift: null,      score: 6 },
  "sled":          { pattern: "conditioning",   baseLift: null,      score: 7 },
  "prowler":       { pattern: "conditioning",   baseLift: null,      score: 7 },
  "battle rope":   { pattern: "conditioning",   baseLift: null,      score: 7 },
  "kettlebell swing": { pattern: "conditioning",baseLift: null,      score: 6 },
  "thruster":      { pattern: "conditioning",   baseLift: null,      score: 6 },
  "man maker":     { pattern: "conditioning",   baseLift: null,      score: 7 },
  "ball slam":     { pattern: "conditioning",   baseLift: null,      score: 6 },
  "wall ball":     { pattern: "conditioning",   baseLift: null,      score: 6 },
  "farmer":        { pattern: "conditioning",   baseLift: null,      score: 5 },
  "carry":         { pattern: "conditioning",   baseLift: null,      score: 5 },
  "stair":         { pattern: "conditioning",   baseLift: null,      score: 5 },
  "box jump":      { pattern: "conditioning",   baseLift: null,      score: 6 },
  "agility":       { pattern: "conditioning",   baseLift: null,      score: 5 },
  "jumping":       { pattern: "conditioning",   baseLift: null,      score: 5 },
  "high knees":    { pattern: "conditioning",   baseLift: null,      score: 5 },
};

// ── Layer 2: Modifier Rules ─────────────────────────────────────────────────
// Specific keywords that adjust the load fraction relative to the base lift.
// Longer keywords take priority for specificity.

export type ModifierRule = {
  keyword: string;
  forBaseLift: OrmLiftKey;
  modifier: LoadModifier;
};

export const MODIFIER_RULES: ModifierRule[] = [
  // Squat modifiers
  { keyword: "front squat",             forBaseLift: "squat",    modifier: { fraction: 0.85, label: "85% of Squat 1RM" } },
  { keyword: "goblet squat",            forBaseLift: "squat",    modifier: { fraction: 0.50, label: "50% of Squat 1RM" } },
  { keyword: "heel-elevated goblet",    forBaseLift: "squat",    modifier: { fraction: 0.50, label: "50% of Squat 1RM" } },
  { keyword: "safety bar squat",        forBaseLift: "squat",    modifier: { fraction: 0.90, label: "90% of Squat 1RM" } },
  { keyword: "belt squat",              forBaseLift: "squat",    modifier: { fraction: 0.80, label: "80% of Squat 1RM" } },
  { keyword: "box squat",               forBaseLift: "squat",    modifier: { fraction: 0.85, label: "85% of Squat 1RM" } },
  { keyword: "pause squat",             forBaseLift: "squat",    modifier: { fraction: 0.85, label: "85% of Squat 1RM" } },
  { keyword: "pin squat",               forBaseLift: "squat",    modifier: { fraction: 0.85, label: "85% of Squat 1RM" } },
  { keyword: "anderson squat",          forBaseLift: "squat",    modifier: { fraction: 0.80, label: "80% of Squat 1RM" } },
  { keyword: "tempo squat",             forBaseLift: "squat",    modifier: { fraction: 0.75, label: "75% of Squat 1RM" } },
  { keyword: "1.5 rep squat",           forBaseLift: "squat",    modifier: { fraction: 0.75, label: "75% of Squat 1RM" } },
  { keyword: "eccentric-only squat",    forBaseLift: "squat",    modifier: { fraction: 0.80, label: "80% of Squat 1RM" } },
  { keyword: "zercher squat",           forBaseLift: "squat",    modifier: { fraction: 0.70, label: "70% of Squat 1RM" } },
  { keyword: "hack squat",              forBaseLift: "squat",    modifier: { fraction: 0.80, label: "80% of Squat 1RM" } },
  { keyword: "pendulum squat",          forBaseLift: "squat",    modifier: { fraction: 0.80, label: "80% of Squat 1RM" } },
  { keyword: "smith machine squat",     forBaseLift: "squat",    modifier: { fraction: 0.85, label: "85% of Squat 1RM" } },
  { keyword: "dumbbell squat",          forBaseLift: "squat",    modifier: { fraction: 0.50, label: "50% of Squat 1RM" } },
  { keyword: "kettlebell front squat",  forBaseLift: "squat",    modifier: { fraction: 0.45, label: "45% of Squat 1RM" } },
  { keyword: "spanish squat",           forBaseLift: "squat",    modifier: { fraction: 0.40, label: "40% of Squat 1RM" } },
  { keyword: "leg press",               forBaseLift: "squat",    modifier: { fraction: 1.20, label: "120% of Squat 1RM" } },
  { keyword: "speed",                   forBaseLift: "squat",    modifier: { fraction: 0.60, label: "60% of 1RM (speed)" } },
  { keyword: "top single",              forBaseLift: "squat",    modifier: { fraction: 1.00, label: "100% of Squat 1RM" } },

  // Bench modifiers
  { keyword: "incline barbell",         forBaseLift: "bench",    modifier: { fraction: 0.80, label: "80% of Bench 1RM" } },
  { keyword: "incline dumbbell",        forBaseLift: "bench",    modifier: { fraction: 0.65, label: "65% of Bench 1RM" } },
  { keyword: "incline smith",           forBaseLift: "bench",    modifier: { fraction: 0.85, label: "85% of Bench 1RM" } },
  { keyword: "low-incline dumbbell",    forBaseLift: "bench",    modifier: { fraction: 0.65, label: "65% of Bench 1RM" } },
  { keyword: "low-incline smith",       forBaseLift: "bench",    modifier: { fraction: 0.85, label: "85% of Bench 1RM" } },
  { keyword: "close-grip bench",        forBaseLift: "bench",    modifier: { fraction: 0.85, label: "85% of Bench 1RM" } },
  { keyword: "close-grip floor press",  forBaseLift: "bench",    modifier: { fraction: 0.80, label: "80% of Bench 1RM" } },
  { keyword: "flat dumbbell",           forBaseLift: "bench",    modifier: { fraction: 0.70, label: "70% of Bench 1RM" } },
  { keyword: "dumbbell bench",          forBaseLift: "bench",    modifier: { fraction: 0.70, label: "70% of Bench 1RM" } },
  { keyword: "dumbbell squeeze",        forBaseLift: "bench",    modifier: { fraction: 0.55, label: "55% of Bench 1RM" } },
  { keyword: "hex press",               forBaseLift: "bench",    modifier: { fraction: 0.55, label: "55% of Bench 1RM" } },
  { keyword: "machine chest press",     forBaseLift: "bench",    modifier: { fraction: 0.75, label: "75% of Bench 1RM" } },
  { keyword: "smith machine bench",     forBaseLift: "bench",    modifier: { fraction: 0.90, label: "90% of Bench 1RM" } },
  { keyword: "hammer strength",         forBaseLift: "bench",    modifier: { fraction: 0.75, label: "75% of Bench 1RM" } },

  // Deadlift modifiers
  { keyword: "sumo deadlift",           forBaseLift: "deadlift", modifier: { fraction: 0.95, label: "95% of Deadlift 1RM" } },
  { keyword: "romanian deadlift",       forBaseLift: "deadlift", modifier: { fraction: 0.70, label: "70% of Deadlift 1RM" } },
  { keyword: "stiff-leg deadlift",      forBaseLift: "deadlift", modifier: { fraction: 0.70, label: "70% of Deadlift 1RM" } },
  { keyword: "deficit deadlift",        forBaseLift: "deadlift", modifier: { fraction: 0.85, label: "85% of Deadlift 1RM" } },
  { keyword: "paused deadlift",         forBaseLift: "deadlift", modifier: { fraction: 0.80, label: "80% of Deadlift 1RM" } },
  { keyword: "tempo deadlift",          forBaseLift: "deadlift", modifier: { fraction: 0.75, label: "75% of Deadlift 1RM" } },
  { keyword: "block pull",              forBaseLift: "deadlift", modifier: { fraction: 1.05, label: "105% of Deadlift 1RM" } },
  { keyword: "rack pull",               forBaseLift: "deadlift", modifier: { fraction: 1.10, label: "110% of Deadlift 1RM" } },
  { keyword: "pin pull",                forBaseLift: "deadlift", modifier: { fraction: 1.05, label: "105% of Deadlift 1RM" } },
  { keyword: "sumo block pull",         forBaseLift: "deadlift", modifier: { fraction: 1.00, label: "100% of Deadlift 1RM" } },
  { keyword: "snatch-grip deadlift",    forBaseLift: "deadlift", modifier: { fraction: 0.80, label: "80% of Deadlift 1RM" } },
  { keyword: "snatch-grip rdl",         forBaseLift: "deadlift", modifier: { fraction: 0.65, label: "65% of Deadlift 1RM" } },
  { keyword: "dumbbell rdl",            forBaseLift: "deadlift", modifier: { fraction: 0.50, label: "50% of Deadlift 1RM" } },
  { keyword: "clean pull",              forBaseLift: "deadlift", modifier: { fraction: 0.75, label: "75% of Deadlift 1RM" } },
  { keyword: "trap bar deadlift",       forBaseLift: "deadlift", modifier: { fraction: 1.05, label: "105% of Deadlift 1RM" } },
  { keyword: "wide-stance rdl",         forBaseLift: "deadlift", modifier: { fraction: 0.70, label: "70% of Deadlift 1RM" } },
  { keyword: "good morning",            forBaseLift: "deadlift", modifier: { fraction: 0.50, label: "50% of Deadlift 1RM" } },
  { keyword: "seated good morning",     forBaseLift: "deadlift", modifier: { fraction: 0.45, label: "45% of Deadlift 1RM" } },
  { keyword: "ssb good morning",        forBaseLift: "deadlift", modifier: { fraction: 0.50, label: "50% of Deadlift 1RM" } },
  { keyword: "speed",                   forBaseLift: "deadlift", modifier: { fraction: 0.60, label: "60% of 1RM (speed)" } },

  // OHP modifiers
  { keyword: "seated barbell overhead",  forBaseLift: "ohp",     modifier: { fraction: 0.95, label: "95% of OHP 1RM" } },
  { keyword: "seated dumbbell",          forBaseLift: "ohp",     modifier: { fraction: 0.65, label: "65% of OHP 1RM" } },
  { keyword: "dumbbell shoulder press",  forBaseLift: "ohp",     modifier: { fraction: 0.65, label: "65% of OHP 1RM" } },
  { keyword: "arnold press",             forBaseLift: "ohp",     modifier: { fraction: 0.60, label: "60% of OHP 1RM" } },
  { keyword: "landmine press",           forBaseLift: "ohp",     modifier: { fraction: 0.55, label: "55% of OHP 1RM" } },
  { keyword: "single-arm dumbbell press",forBaseLift: "ohp",     modifier: { fraction: 0.50, label: "50% of OHP 1RM" } },
  { keyword: "push press",               forBaseLift: "ohp",     modifier: { fraction: 1.10, label: "110% of OHP 1RM" } },
  { keyword: "viking press",             forBaseLift: "ohp",     modifier: { fraction: 1.00, label: "100% of OHP 1RM" } },
  { keyword: "z press",                  forBaseLift: "ohp",     modifier: { fraction: 0.80, label: "80% of OHP 1RM" } },
  { keyword: "machine shoulder press",   forBaseLift: "ohp",     modifier: { fraction: 0.75, label: "75% of OHP 1RM" } },
  { keyword: "jm press",                 forBaseLift: "ohp",     modifier: { fraction: 0.60, label: "60% of OHP 1RM" } },
];

// ── Layer 3: Exact Overrides ────────────────────────────────────────────────
// Direct lookup for all known exercises. Confidence = 1.0.
// baseLift + modifier fraction define the load calculation.

export type ExactOverride = {
  pattern: MovementPattern;
  baseLift: OrmLiftKey | null;
  modifierFraction: number;
};

export const EXACT_OVERRIDES: Record<string, ExactOverride> = {
  // ── Squat variants ─────────────────────────────────────────────────────
  "barbell squat":              { pattern: "squat", baseLift: "squat", modifierFraction: 1.0 },
  "back squat":                 { pattern: "squat", baseLift: "squat", modifierFraction: 1.0 },
  "back squat (speed)":         { pattern: "squat", baseLift: "squat", modifierFraction: 0.60 },
  "back squat (top single)":    { pattern: "squat", baseLift: "squat", modifierFraction: 1.0 },
  "front squat":                { pattern: "squat", baseLift: "squat", modifierFraction: 0.85 },
  "pause squat":                { pattern: "squat", baseLift: "squat", modifierFraction: 0.85 },
  "pin squat":                  { pattern: "squat", baseLift: "squat", modifierFraction: 0.85 },
  "anderson squat":             { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "box squat":                  { pattern: "squat", baseLift: "squat", modifierFraction: 0.85 },
  "low box squat":              { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "pause box squat":            { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "tempo squat":                { pattern: "squat", baseLift: "squat", modifierFraction: 0.75 },
  "1.5 rep squat":              { pattern: "squat", baseLift: "squat", modifierFraction: 0.75 },
  "eccentric-only squat":       { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "hack squat":                 { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "goblet squat":               { pattern: "squat", baseLift: "squat", modifierFraction: 0.50 },
  "heel-elevated goblet squat": { pattern: "squat", baseLift: "squat", modifierFraction: 0.50 },
  "dumbbell squat":             { pattern: "squat", baseLift: "squat", modifierFraction: 0.50 },
  "safety bar squat":           { pattern: "squat", baseLift: "squat", modifierFraction: 0.90 },
  "belt squat":                 { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "zercher squat":              { pattern: "squat", baseLift: "squat", modifierFraction: 0.70 },
  "pendulum squat":             { pattern: "squat", baseLift: "squat", modifierFraction: 0.80 },
  "smith machine squat":        { pattern: "squat", baseLift: "squat", modifierFraction: 0.85 },
  "kettlebell front squat":     { pattern: "squat", baseLift: "squat", modifierFraction: 0.45 },
  "spanish squat":              { pattern: "squat", baseLift: "squat", modifierFraction: 0.40 },
  "leg press":                  { pattern: "squat", baseLift: "squat", modifierFraction: 1.20 },
  "wide-stance leg press":      { pattern: "squat", baseLift: "squat", modifierFraction: 1.20 },

  // ── Bench variants ─────────────────────────────────────────────────────
  "flat barbell bench press":     { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 1.0 },
  "barbell bench press":          { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 1.0 },
  "incline barbell press":        { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.80 },
  "incline smith press":          { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.85 },
  "low-incline dumbbell press":   { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.65 },
  "low-incline smith press":      { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.85 },
  "close-grip bench press":       { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.85 },
  "close-grip floor press":       { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.80 },
  "flat dumbbell bench press":    { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.70 },
  "flat dumbbell press":          { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.70 },
  "dumbbell bench press":         { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.70 },
  "incline dumbbell press":       { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.65 },
  "dumbbell squeeze press":       { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.55 },
  "hex press":                    { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.55 },
  "machine chest press":          { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.75 },
  "smith machine bench":          { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.90 },
  "hammer strength press":        { pattern: "horizontal-push", baseLift: "bench", modifierFraction: 0.75 },

  // ── Deadlift variants ──────────────────────────────────────────────────
  "deadlift":                 { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.0 },
  "conventional deadlift":    { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.0 },
  "sumo deadlift":            { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.95 },
  "romanian deadlift":        { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.70 },
  "stiff-leg deadlift":       { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.70 },
  "dumbbell rdl":             { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.50 },
  "deficit deadlift":         { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.85 },
  "paused deadlift":          { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.80 },
  "tempo deadlift":           { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.75 },
  "block pull":               { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.05 },
  "rack pull":                { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.10 },
  "pin pull":                 { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.05 },
  "sumo block pull":          { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.00 },
  "deadlift (speed)":         { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.60 },
  "snatch-grip deadlift":     { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.80 },
  "snatch-grip rdl":          { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.65 },
  "clean pull":               { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.75 },
  "trap bar deadlift":        { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 1.05 },
  "wide-stance rdl":          { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.70 },
  "good morning":             { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.50 },
  "seated good morning":      { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.45 },
  "ssb good morning":         { pattern: "hip-hinge", baseLift: "deadlift", modifierFraction: 0.50 },

  // ── OHP variants ───────────────────────────────────────────────────────
  "overhead press":                      { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 1.0 },
  "standing overhead press":             { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 1.0 },
  "seated barbell overhead press":       { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.95 },
  "seated dumbbell shoulder press":      { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.65 },
  "seated dumbbell press (neutral grip)":{ pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.65 },
  "dumbbell shoulder press":             { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.65 },
  "arnold press":                        { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.60 },
  "landmine press":                      { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.55 },
  "half-kneeling landmine press":        { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.50 },
  "single-arm dumbbell press":           { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.50 },
  "push press":                          { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 1.10 },
  "viking press":                        { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 1.00 },
  "z press":                             { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.80 },
  "machine shoulder press":              { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.75 },
  "jm press":                            { pattern: "vertical-push", baseLift: "ohp", modifierFraction: 0.60 },
};
