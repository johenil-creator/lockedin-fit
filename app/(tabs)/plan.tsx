import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import RNAnimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "expo-router";
import { usePlanContext } from "../../contexts/PlanContext";
import { useWorkouts } from "../../hooks/useWorkouts";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Skeleton } from "../../components/Skeleton";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { spacing, radius } from "../../lib/theme";
import type { Exercise } from "../../lib/types";
import {
  smartParse,
  groupByWeekDay,
  getBlockLabel,
  parseGoogleSheetsUrl,
  looksLikeHtml,
  validateParsedPlan,
} from "../../lib/importPlan";
import type { DayGroup, WeekGroup } from "../../lib/importPlan";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayCardState = "completed" | "next-up" | "available" | "locked";
type BlockName = "Accumulation" | "Intensification" | "Realization";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_LABELS: BlockName[] = ["Accumulation", "Intensification", "Realization"];

const BLOCK_COLORS: Record<BlockName, { color: string; bg: string }> = {
  Accumulation:    { color: "#3FB68B", bg: "#3FB68B22" },
  Intensification: { color: "#FF9F0A", bg: "#FF9F0A22" },
  Realization:     { color: "#F85149", bg: "#F8514922" },
};

const BLOCK_BANNERS: Record<BlockName, { icon: IoniconName; description: string }> = {
  Accumulation:    { icon: "layers-outline",  description: "High volume · Build work capacity" },
  Intensification: { icon: "flame-outline",   description: "Heavier loads · Fewer reps · Stronger" },
  Realization:     { icon: "trophy-outline",  description: "Peak intensity · Show your strength" },
};

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function ExerciseCard({ exercise: ex }: { exercise: Exercise }) {
  const { theme } = useAppTheme();
  return (
    <Card style={exStyles.card}>
      <View style={exStyles.top}>
        <Text style={[exStyles.name, { color: theme.colors.text }]}>{ex.exercise}</Text>
        <View style={exStyles.badges}>
          {ex.sets   && <Badge label={`${ex.sets} sets`} />}
          {ex.reps   && <Badge label={`${ex.reps} reps`} />}
          {ex.weight && <Badge label={ex.weight} variant="dark" />}
        </View>
      </View>
      {!!ex.comments && (
        <Text style={[exStyles.comments, { color: theme.colors.muted }]}>{ex.comments}</Text>
      )}
    </Card>
  );
}

const exStyles = StyleSheet.create({
  card:     { marginBottom: 8 },
  top:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  name:     { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  badges:   { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  comments: { marginTop: 8, fontSize: 13, fontStyle: "italic" },
});

// ── BlockTabs ─────────────────────────────────────────────────────────────────

function BlockTabs({ weeks, blockSize, selectedBlock, onSelect }: {
  weeks: WeekGroup[];
  blockSize: number;
  selectedBlock: number;
  onSelect: (idx: number) => void;
}) {
  const { theme } = useAppTheme();
  const numBlocks = Math.min(3, Math.ceil(weeks.length / blockSize));

  return (
    <View style={btStyles.row}>
      {BLOCK_LABELS.slice(0, numBlocks).map((label, i) => {
        const isActive = i === selectedBlock;
        const { color, bg } = BLOCK_COLORS[label];
        const count = Math.min(blockSize, weeks.length - i * blockSize);
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(i)}
            style={[
              btStyles.tab,
              {
                backgroundColor: isActive ? bg : theme.colors.mutedBg,
                borderColor: isActive ? color : "transparent",
              },
            ]}
          >
            <Text style={[btStyles.label, { color: isActive ? color : theme.colors.muted }]}>
              {label}
            </Text>
            <Text style={[btStyles.count, { color: isActive ? color : theme.colors.muted, opacity: 0.75 }]}>
              {count}w
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const btStyles = StyleSheet.create({
  row:   { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab:   { flex: 1, borderRadius: radius.full, borderWidth: 1.5, paddingVertical: 8, alignItems: "center" },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  count: { fontSize: 10, marginTop: 1 },
});

// ── WeekStepper ───────────────────────────────────────────────────────────────

function WeekStepper({ weeksInBlock, selectedWeekInBlock, canGoPrev, canGoNext, onPrev, onNext, isDayCompleted }: {
  weeksInBlock: WeekGroup[];
  selectedWeekInBlock: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isDayCompleted: (week: string, day: string) => boolean;
}) {
  const { theme } = useAppTheme();
  const selectedWg = weeksInBlock[selectedWeekInBlock];

  const isBlockDone = (wg: WeekGroup) =>
    wg.days.length > 0 && wg.days.every((d) => isDayCompleted(wg.week, d.day));

  return (
    <View style={wsStyles.row}>
      <Pressable onPress={onPrev} disabled={!canGoPrev} style={[wsStyles.arrow, { opacity: canGoPrev ? 1 : 0.25 }]} accessibilityRole="button" accessibilityLabel="Previous week">
        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
      </Pressable>

      <View style={wsStyles.center}>
        <Text style={[wsStyles.weekLabel, { color: theme.colors.text }]}>
          {selectedWg?.week ?? ""}
          <Text style={[wsStyles.ofLabel, { color: theme.colors.muted }]}>
            {" "}of {weeksInBlock.length}
          </Text>
        </Text>
        <View style={wsStyles.dots}>
          {weeksInBlock.map((wg, i) => {
            const done = isBlockDone(wg);
            const isCurrent = i === selectedWeekInBlock;
            return (
              <View
                key={wg.week}
                style={[
                  wsStyles.dot,
                  {
                    width: isCurrent ? 18 : 6,
                    backgroundColor: done
                      ? theme.colors.success
                      : isCurrent
                      ? theme.colors.primary
                      : "transparent",
                    borderColor: done || isCurrent ? "transparent" : theme.colors.muted,
                    borderWidth: done || isCurrent ? 0 : 1.5,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <Pressable onPress={onNext} disabled={!canGoNext} style={[wsStyles.arrow, { opacity: canGoNext ? 1 : 0.25 }]} accessibilityRole="button" accessibilityLabel="Next week">
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const wsStyles = StyleSheet.create({
  row:       { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  arrow:     { padding: 12 },
  center:    { flex: 1, alignItems: "center" },
  weekLabel: { fontSize: 15, fontWeight: "700" },
  ofLabel:   { fontSize: 13, fontWeight: "400" },
  dots:      { flexDirection: "row", gap: 4, marginTop: 5 },
  dot:       { height: 6, borderRadius: 3 },
});

// ── DayCard ───────────────────────────────────────────────────────────────────

function DayCard({ dayGroup, state, isStarting, isExpanded, onToggle, onStart }: {
  dayGroup: DayGroup;
  state: DayCardState;
  isStarting: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const { theme } = useAppTheme();
  const isCompleted = state === "completed";
  const isNextUp    = state === "next-up";
  const isLocked    = state === "locked";
  const isAvailable = state === "available";

  const previewExercises = dayGroup.exercises.slice(0, 2).map((e) => e.exercise);

  const headerIcon: IoniconName = isCompleted ? "checkmark-circle"
    : isNextUp   ? "play-circle-outline"
    : isLocked   ? "lock-closed-outline"
    : "ellipse-outline";

  const headerIconColor = isCompleted ? theme.colors.success
    : isNextUp   ? theme.colors.primary
    : theme.colors.muted;

  const labelColor = isCompleted ? theme.colors.success
    : isNextUp   ? theme.colors.primary
    : theme.colors.text;

  return (
    <View
      style={[
        dcStyles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isNextUp
            ? theme.colors.primary
            : isCompleted
            ? theme.colors.success + "44"
            : theme.colors.border,
          borderWidth: isNextUp ? 1.5 : 1,
          opacity: isLocked ? 0.45 : 1,
        },
      ]}
    >
      {/* Left accent bar for completed + next-up */}
      {(isCompleted || isNextUp) && (
        <View
          style={[
            dcStyles.accentBar,
            { backgroundColor: isCompleted ? theme.colors.success : theme.colors.primary },
          ]}
        />
      )}

      <View style={dcStyles.inner}>
        {/* Header row — tap to toggle exercises */}
        <Pressable onPress={isLocked ? undefined : onToggle} style={dcStyles.header}>
          <View style={dcStyles.headerLeft}>
            <View style={dcStyles.titleRow}>
              <Ionicons name={headerIcon} size={15} color={headerIconColor} />
              <Text style={[dcStyles.dayLabel, { color: labelColor }]}>{dayGroup.day}</Text>
              <Text style={[dcStyles.exCount, { color: theme.colors.muted }]}>
                · {dayGroup.exercises.length} exercise{dayGroup.exercises.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {!isExpanded && previewExercises.length > 0 && (
              <Text style={[dcStyles.preview, { color: theme.colors.muted }]} numberOfLines={1}>
                {previewExercises.join(" · ")}{dayGroup.exercises.length > 2 ? " + more" : ""}
              </Text>
            )}
          </View>

          <View style={dcStyles.headerRight}>
            {!isLocked && !isNextUp && (
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.muted}
              />
            )}
            {isAvailable && (
              <Pressable
                style={[dcStyles.smallBtn, { backgroundColor: theme.colors.mutedBg }]}
                onPress={onStart}
              >
                <Text style={[dcStyles.smallBtnText, { color: theme.colors.text }]}>Start</Text>
              </Pressable>
            )}
            {isCompleted && (
              <View style={[dcStyles.smallBtn, { backgroundColor: theme.colors.success + "22" }]}>
                <Text style={[dcStyles.smallBtnText, { color: theme.colors.success }]}>Done ✓</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Expanded exercise list */}
        {isExpanded && !isLocked && (
          <View style={{ marginTop: 8 }}>
            {dayGroup.exercises.map((ex, i) => (
              <ExerciseCard key={`${ex.exercise}-${i}`} exercise={ex} />
            ))}
          </View>
        )}

        {/* Full-width CTA — next-up state only */}
        {isNextUp && (
          <Pressable
            style={[
              dcStyles.startBtn,
              { backgroundColor: theme.colors.primary, opacity: isStarting ? 0.5 : 1 },
            ]}
            disabled={isStarting}
            onPress={onStart}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color={theme.colors.primaryText} />
            ) : (
              <View style={dcStyles.startBtnInner}>
                <Ionicons name="play-circle" size={16} color={theme.colors.primaryText} />
                <Text style={[dcStyles.startBtnText, { color: theme.colors.primaryText }]}>
                  Start Workout
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const dcStyles = StyleSheet.create({
  container:    { flexDirection: "row", borderRadius: 14, overflow: "hidden" },
  accentBar:    { width: 3 },
  inner:        { flex: 1, padding: 12 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:   { flex: 1, paddingRight: 8 },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  dayLabel:     { fontSize: 14, fontWeight: "700" },
  exCount:      { fontSize: 11 },
  preview:      { fontSize: 12, lineHeight: 16 },
  headerRight:  { flexDirection: "row", alignItems: "center", gap: 8 },
  smallBtn:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  smallBtnText: { fontSize: 12, fontWeight: "600" },
  startBtn:     { borderRadius: 10, paddingVertical: 11, marginTop: 10, alignItems: "center" },
  startBtnInner:{ flexDirection: "row", alignItems: "center", gap: 8 },
  startBtnText: { fontSize: 14, fontWeight: "700" },
});

// ── ProgressCard ──────────────────────────────────────────────────────────────

function ProgressCard({ doneDays, totalDays }: {
  doneDays: number;
  totalDays: number;
}) {
  const { theme } = useAppTheme();
  const pct = totalDays > 0 ? doneDays / totalDays : 0;
  const pctStr = `${Math.round(pct * 100)}%` as `${number}%`;

  return (
    <View style={[pcStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={pcStyles.topRow}>
        <Text style={[pcStyles.countText, { color: theme.colors.muted }]}>{doneDays}/{totalDays} days</Text>
        <Text style={[pcStyles.pctText, { color: theme.colors.muted }]}>{pctStr}</Text>
      </View>

      {/* 8px progress bar with milestone dots at 25 / 50 / 75 % */}
      <View style={[pcStyles.track, { backgroundColor: theme.colors.mutedBg }]}>
        <View style={[pcStyles.fill, { backgroundColor: theme.colors.primary, width: pctStr }]} />
        {([25, 50, 75] as const).map((m) => (
          <View
            key={m}
            style={[
              pcStyles.milestone,
              {
                left: `${m}%` as `${number}%`,
                backgroundColor: pct * 100 >= m ? theme.colors.primary : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {doneDays === totalDays && totalDays > 0 && (
        <View style={pcStyles.completeRow}>
          <Ionicons name="trophy" size={15} color={theme.colors.success} />
          <Text style={[pcStyles.completeText, { color: theme.colors.success }]}>Plan Complete!</Text>
        </View>
      )}
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card:             { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  topRow:           { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  countText:        { fontSize: 12, fontWeight: "600" },
  pctText:          { fontSize: 12, fontWeight: "600" },
  track:            { height: 8, borderRadius: 999, overflow: "hidden" },
  fill:             { height: "100%", borderRadius: 999, position: "absolute", left: 0, top: 0 },
  milestone:        { position: "absolute", width: 4, height: 4, borderRadius: 2, top: 2 },
  completeRow:      { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingTop: 10 },
  completeText:     { fontSize: 14, fontWeight: "700" },
});

// ── BlockBanner ───────────────────────────────────────────────────────────────

function BlockBanner({ blockName }: { blockName: BlockName }) {
  const { theme } = useAppTheme();
  const { color, bg } = BLOCK_COLORS[blockName];
  const { icon, description } = BLOCK_BANNERS[blockName];
  return (
    <View style={[banStyles.banner, { backgroundColor: bg, borderColor: color + "55" }]}>
      <Ionicons name={icon} size={16} color={color} />
      <View style={banStyles.text}>
        <Text style={[banStyles.phase, { color }]}>{blockName}</Text>
        <Text style={[banStyles.desc, { color: theme.colors.muted }]}>{description}</Text>
      </View>
    </View>
  );
}

const banStyles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 12 },
  text:   { marginLeft: 10, flex: 1 },
  phase:  { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  desc:   { fontSize: 12, marginTop: 1 },
});

// ImportMethodSheet removed — replaced with native Alert to avoid BottomSheet
// race conditions (closing one sheet while opening file picker / another sheet).


// ── EmptyPlanState ────────────────────────────────────────────────────────────

function EmptyPlanState({ onCatalog, onImport }: {
  onCatalog: () => void;
  onImport: () => void;
}) {
  const { theme } = useAppTheme();
  const cards = [
    { emoji: "📚", label: "Browse Catalog", hint: "16 ready-to-use plans", onPress: onCatalog },
    { emoji: "📊", label: "Import Plan",    hint: "CSV, Excel or Sheets",  onPress: onImport },
  ];
  return (
    <View style={epStyles.container}>
      <Text style={epStyles.hero}>📋</Text>
      <Text style={[epStyles.title, { color: theme.colors.text }]}>No plan loaded</Text>
      <Text style={[epStyles.subtitle, { color: theme.colors.muted }]}>
        Pick a structured plan or import your own spreadsheet
      </Text>
      <View style={epStyles.cards}>
        {cards.map((c) => (
          <Pressable
            key={c.label}
            style={[epStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={c.onPress}
          >
            <Text style={epStyles.cardEmoji}>{c.emoji}</Text>
            <Text style={[epStyles.cardLabel, { color: theme.colors.text }]}>{c.label}</Text>
            <Text style={[epStyles.cardHint,  { color: theme.colors.muted }]}>{c.hint}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[epStyles.hint, { color: theme.colors.muted }]}>
        Expected columns: Week · Day · Exercise · Sets · Reps
      </Text>
    </View>
  );
}

const epStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 64 },
  hero:      { fontSize: 56, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle:  { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  cards:     { flexDirection: "row", gap: 12, marginBottom: 20 },
  card:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center" },
  cardEmoji: { fontSize: 30, marginBottom: 8 },
  cardLabel: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  cardHint:  { fontSize: 11, textAlign: "center", marginTop: 4 },
  hint:      { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { planName, exercises, loading, clearPlan, isDayCompleted, completedDays, setPlan } = usePlanContext();
  const { startSessionFromPlan, getActiveSession } = useWorkouts();
  const { profile } = useProfileContext();
  const { showToast } = useToast();

  const [selectedWeek, setSelectedWeek]           = useState(0);
  const [urlModalVisible, setUrlModalVisible]     = useState(false);
  const [sheetUrl, setSheetUrl]                   = useState("");
  const [importing, setImporting]                 = useState(false);
  const [startingDay, setStartingDay]             = useState<string | null>(null);
  const [expandedDays, setExpandedDays]           = useState<Record<string, boolean>>({});


  const weeks = useMemo(() => groupByWeekDay(exercises), [exercises]);

  // ── Block / stepper calculations ───────────────────────────────────────────

  const blockSize = useMemo(
    () => (weeks.length <= 3 ? weeks.length : Math.ceil(weeks.length / 3)),
    [weeks.length]
  );
  const selectedBlock = useMemo(
    () => Math.min(Math.floor(selectedWeek / (blockSize || 1)), 2),
    [selectedWeek, blockSize]
  );
  const blockStart   = selectedBlock * blockSize;
  const blockEnd     = Math.min(blockStart + blockSize, weeks.length);
  const weeksInBlock = useMemo(() => weeks.slice(blockStart, blockEnd), [weeks, blockStart, blockEnd]);
  const selectedWeekInBlock = blockSize > 0 ? selectedWeek - blockStart : 0;

  const activeWeek = weeks[selectedWeek];

  function isWeekUnlocked(weekIndex: number): boolean {
    if (weekIndex === 0) return true;
    const prevWeek = weeks[weekIndex - 1];
    return prevWeek?.days.every((d) => isDayCompleted(prevWeek.week, d.day)) ?? false;
  }

  const activeWeekLocked = !isWeekUnlocked(selectedWeek);

  const nextIncompleteTarget = useMemo<{ weekIndex: number; weekGroup: WeekGroup; dayGroup: DayGroup } | null>(() => {
    for (let wi = 0; wi < weeks.length; wi++) {
      if (!isWeekUnlocked(wi)) break;
      const wg = weeks[wi];
      for (const dg of wg.days) {
        if (!isDayCompleted(wg.week, dg.day)) return { weekIndex: wi, weekGroup: wg, dayGroup: dg };
      }
    }
    return null;
  }, [weeks, completedDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const { totalDays, doneDays } = useMemo(() => {
    let total = 0, done = 0;
    for (const wg of weeks) {
      for (const dg of wg.days) {
        total++;
        if (isDayCompleted(wg.week, dg.day)) done++;
      }
    }
    return { totalDays: total, doneDays: done };
  }, [weeks, completedDays]);

  // Auto-advance to the week with the next incomplete day on plan load
  useEffect(() => {
    if (weeks.length === 0) return;
    if (nextIncompleteTarget) setSelectedWeek(nextIncompleteTarget.weekIndex);
  }, [weeks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const showBlockTabs = weeks.length > 3;
  const showStepper   = weeks.length > 1;
  const currentBlockName: BlockName | null =
    weeks.length > 3
      ? (BLOCK_LABELS[selectedBlock] ?? null)
      : ((getBlockLabel(selectedWeek, weeks.length) as BlockName) || null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleDay(dayKey: string) {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  }

  function showImportPicker() {
    Alert.alert("Import Workout Plan", "Choose a source to load your plan", [
      { text: "File (CSV or Excel)", onPress: handleFileImport },
      { text: "Google Sheets", onPress: () => setUrlModalVisible(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const handleFileImport = useCallback(async () => {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });
    } catch (e) {
      Alert.alert("File Picker Error", e instanceof Error ? e.message : "Could not open file picker.");
      return;
    }
    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];

    try {
      let rawRows: string[][];
      if (/\.xlsx?$/i.test(file.name)) {
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" as const });
        const wb = XLSX.read(b64, { type: "base64" });
        rawRows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
          header: 1, defval: "", raw: false,
        });
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, { encoding: "utf8" as const });
        rawRows = Papa.parse<string[]>(text, { header: false }).data;
      }
      if (!rawRows.length) {
        Alert.alert("Import Error", "No data rows found in the file.");
        return;
      }
      const normalized = smartParse(rawRows);
      const validation = validateParsedPlan(normalized);
      if (!validation.valid) {
        Alert.alert("Import Error", validation.error);
        return;
      }
      // Load the plan directly
      const planDisplayName = file.name.replace(/\.(csv|xlsx?)$/i, "");
      setPlan(planDisplayName, normalized);
      setSelectedWeek(0);
      setExpandedDays({});
      showToast({ message: `Loaded "${planDisplayName}" — ${validation.summary.totalExercises} exercises across ${validation.summary.totalDays} days`, type: "success" });
    } catch (e) {
      Alert.alert("Import Error", `Failed to parse the file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [setPlan, showToast]);

  const handleUrlImport = useCallback(async () => {
    const parsed = parseGoogleSheetsUrl(sheetUrl.trim());
    if (!parsed) { Alert.alert("Invalid URL", "Paste a Google Sheets share link."); return; }

    const exportUrl =
      `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv` +
      (parsed.gid ? `&gid=${parsed.gid}` : "");

    setImporting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(exportUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (looksLikeHtml(text)) {
        throw new Error(
          'Google returned a login page.\n\nIn Google Sheets: Share → "Anyone with the link" → Viewer.'
        );
      }
      const rawRows = Papa.parse<string[]>(text, { header: false }).data;
      if (!rawRows.length) throw new Error("No rows found");
      const normalized = smartParse(rawRows);
      const validation = validateParsedPlan(normalized);
      if (!validation.valid) {
        Alert.alert("Import Error", validation.error);
        return;
      }
      // Load the plan directly
      setUrlModalVisible(false);
      setSheetUrl("");
      setPlan("Google Sheet", normalized);
      setSelectedWeek(0);
      setExpandedDays({});
      showToast({ message: `Loaded plan — ${validation.summary.totalExercises} exercises across ${validation.summary.totalDays} days`, type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Import timed out. Check your connection and try again."
        : `Import failed: ${e instanceof Error ? e.message : String(e)}`;
      Alert.alert("Import Error", msg);
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }, [sheetUrl]);

  function handleClear() {
    Alert.alert("Clear plan?", "This will remove the imported workout.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => { clearPlan(); setSelectedWeek(0); } },
    ]);
  }

  async function launchSession(week: string, day: string, exs: Exercise[]) {
    if (exs.length === 0) { showToast({ message: "This day has no exercises.", type: "error" }); return; }
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Session",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Session", onPress: () => router.push(`/session/${active.id}`) },
        ]
      );
      return;
    }
    setStartingDay(`${week}|${day}`);
    try {
      const id = await startSessionFromPlan(planName || "Workout", week, day, exs, profile);
      router.push(`/session/${id}`);
    } catch (e) {
      Alert.alert("Couldn't start session", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setStartingDay(null);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 12 }]}>
        <Skeleton.Group>
          <Skeleton.Rect width="50%" height={24} />
          <View style={{ height: 8 }} />
          <Skeleton.Card />
          <Skeleton.Card />
        </Skeleton.Group>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {planName || "Workout Plan"}
          </Text>
          {currentBlockName && exercises.length > 0 && (
            <Text style={[styles.phaseSubtitle, { color: BLOCK_COLORS[currentBlockName].color }]}>
              {currentBlockName} phase
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {exercises.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={[styles.iconBtn, { backgroundColor: theme.colors.mutedBg }]}
              accessibilityRole="button"
              accessibilityLabel="Clear plan"
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {exercises.length === 0 ? (
        <EmptyPlanState
          onCatalog={() => router.push("/catalog")}
          onImport={showImportPicker}
        />
      ) : (
        <>
          {/* Progress card */}
          {totalDays > 0 && (
            <ProgressCard doneDays={doneDays} totalDays={totalDays} />
          )}

          {/* Block phase tabs — plans > 3 weeks only */}
          {showBlockTabs && (
            <BlockTabs
              weeks={weeks}
              blockSize={blockSize}
              selectedBlock={selectedBlock}
              onSelect={(blockIdx) => {
                const firstWeek = blockIdx * blockSize;
                if (!isWeekUnlocked(firstWeek)) {
                  showToast({ message: "Complete previous weeks to unlock this phase.", type: "info" });
                  return;
                }
                setSelectedWeek(firstWeek);
              }}
            />
          )}

          {/* Week stepper */}
          {showStepper && (
            <WeekStepper
              weeksInBlock={weeksInBlock}
              selectedWeekInBlock={selectedWeekInBlock}
              canGoPrev={selectedWeek > 0}
              canGoNext={selectedWeek < weeks.length - 1}
              onPrev={() => setSelectedWeek((w) => Math.max(0, w - 1))}
              onNext={() => {
                const next = selectedWeek + 1;
                if (next >= weeks.length) return;
                if (!isWeekUnlocked(next)) {
                  showToast({ message: `Complete all days in ${activeWeek?.week} first.`, type: "info" });
                  return;
                }
                setSelectedWeek(next);
              }}
              isDayCompleted={isDayCompleted}
            />
          )}

          {/* Phase context banner */}
          {currentBlockName && <BlockBanner blockName={currentBlockName} />}

          {/* Day cards */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {activeWeek?.days.map((dayGroup, dayIdx) => {
              const dayKey  = `${activeWeek.week}|${dayGroup.day}`;
              const dayDone = isDayCompleted(activeWeek.week, dayGroup.day);
              const isNextUp =
                !activeWeekLocked &&
                nextIncompleteTarget?.weekGroup.week === activeWeek.week &&
                nextIncompleteTarget?.dayGroup.day === dayGroup.day;

              const dayState: DayCardState = activeWeekLocked
                ? "locked"
                : dayDone
                ? "completed"
                : isNextUp
                ? "next-up"
                : "available";

              // Previous day for soft-warning toast (no lock enforced)
              const prevDay     = dayIdx > 0 ? activeWeek.days[dayIdx - 1] : null;
              const prevDayDone = !prevDay || isDayCompleted(activeWeek.week, prevDay.day);

              return (
                <RNAnimated.View
                  key={dayGroup.day}
                  entering={FadeInDown.delay(dayIdx * 60).duration(300)}
                  style={{ marginBottom: 10 }}
                >
                  <DayCard
                    dayGroup={dayGroup}
                    state={dayState}
                    isStarting={startingDay === dayKey}
                    isExpanded={expandedDays[dayKey] ?? false}
                    onToggle={() => toggleDay(dayKey)}
                    onStart={async () => {
                      if (!dayDone && !prevDayDone && prevDay) {
                        showToast({
                          message: `Heads up — usually done after ${prevDay.day}`,
                          type: "info",
                        });
                      }
                      await launchSession(activeWeek.week, dayGroup.day, dayGroup.exercises);
                    }}
                  />
                </RNAnimated.View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Google Sheets URL bottom sheet */}
      <AppBottomSheet
        visible={urlModalVisible}
        onClose={() => { setUrlModalVisible(false); setSheetUrl(""); }}
        snapPoints={["50%"]}
      >
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Google Sheets URL</Text>
        <Text style={[styles.modalHint,  { color: theme.colors.muted }]}>
          Sheet must be shared as "Anyone with the link can view"
        </Text>
        <BottomSheetTextInput
          style={[styles.input, { backgroundColor: theme.colors.bg, color: theme.colors.text }]}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          placeholderTextColor={theme.colors.muted}
          value={sheetUrl}
          onChangeText={setSheetUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.modalActions}>
          <Button
            label="Cancel"
            onPress={() => { setUrlModalVisible(false); setSheetUrl(""); }}
            variant="secondary"
          />
          <View style={{ width: 12 }} />
          <Button label="Import" onPress={handleUrlImport} loading={importing} />
        </View>
      </AppBottomSheet>

    </View>
  );
}

// ── Screen-level styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  headerTitle:   { flex: 1, marginRight: spacing.sm },
  title:         { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  phaseSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // URL modal
  modalTitle:   { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  modalHint:    { fontSize: 13, marginBottom: spacing.md },
  input:        { borderRadius: radius.md, padding: 14, fontSize: 14, marginBottom: spacing.md },
  modalActions: { flexDirection: "row" },
});
