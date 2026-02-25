import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "expo-router";
import { usePlanContext } from "../../contexts/PlanContext";
import { useWorkouts } from "../../hooks/useWorkouts";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";
import type { Exercise } from "../../lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayGroup = { day: string; exercises: Exercise[] };
type WeekGroup = { week: string; days: DayGroup[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGoogleSheetsUrl(url: string): { id: string; gid?: string } | null {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  return { id: match[1], gid: gidMatch?.[1] };
}

function looksLikeHtml(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("<!") || t.startsWith("<html") || t.startsWith("<HTML");
}

/**
 * Universal parser for 2D string arrays (CSV or Excel rows).
 *
 * Handles two layouts:
 *  A) Simple — first row is the real header (Week, Day, Exercise, Sets, Reps, Weight, Comments)
 *  B) Complex — metadata rows precede the real header, which may repeat once per week
 *     (e.g. Jeff Nippard-style: rows of setup info, then ",Week 1,Exercise,Warm-up Sets,Working Sets,...")
 *
 * Strategy:
 *  1. Scan rows until we find one where a cell exactly equals "exercise" (case-insensitive).
 *     That row is the header.
 *  2. Map column indices for each field using exact-then-partial matching; prefer
 *     "working sets" over "warm-up sets".
 *  3. Walk remaining rows:
 *     - If a row has "exercise" in the exercise column → it's a repeated week-header; extract week.
 *     - The column just before "exercise" carries day-session labels (e.g. "FULL BODY 1:").
 *     - Forward-fill currentWeek and currentDay.
 */
function smartParse(rawRows: string[][]): Exercise[] {
  const cell = (row: string[], i: number) =>
    i >= 0 && i < row.length ? (row[i] ?? "").trim() : "";

  // 1. Find header row
  let hIdx = -1;
  let exCol = -1;
  for (let i = 0; i < rawRows.length; i++) {
    for (let j = 0; j < rawRows[i].length; j++) {
      if (rawRows[i][j].toLowerCase().trim() === "exercise") {
        hIdx = i; exCol = j; break;
      }
    }
    if (hIdx >= 0) break;
  }
  if (hIdx < 0) return [];

  // 2. Build column index map
  const hRow = rawRows[hIdx].map(c => c.toLowerCase().trim());
  const indexOf = (...terms: string[]): number => {
    for (const t of terms) { const i = hRow.indexOf(t); if (i >= 0) return i; }
    for (const t of terms) { const i = hRow.findIndex(h => h.includes(t)); if (i >= 0) return i; }
    return -1;
  };

  // Prefer "working sets" over "warm-up sets"
  const setCol = indexOf("working sets", "working set", "sets", "set");
  const repCol = indexOf("reps", "rep", "repetition");
  const wtCol  = indexOf("load (lbs)", "load", "weight", "kg", "lbs");
  const ntCol  = indexOf("notes", "note", "comments", "comment", "cue");
  const wuCol  = indexOf("warm-up sets", "warmup sets", "warm up sets", "warmup", "wu sets");
  const rtCol  = indexOf("rest time", "rest (sec)", "rest (seconds)", "rest", "recovery");

  // Explicit week/day columns (simple layouts)
  const wkColIdx = indexOf("week", "wk");
  const dyColIdx = indexOf("day", "session");
  const hasExplicitWeek = wkColIdx >= 0 && (hRow[wkColIdx] === "week" || hRow[wkColIdx] === "wk");
  const hasExplicitDay  = dyColIdx >= 0 && (hRow[dyColIdx] === "day"  || hRow[dyColIdx] === "session");

  // Column immediately left of "exercise" carries day/session info in complex layouts
  const preExCol = exCol > 0 ? exCol - 1 : -1;

  // Seed currentWeek from the very first header row (e.g. "Week 1")
  let currentWeek = preExCol >= 0 ? cell(rawRows[hIdx], preExCol) : "";
  if (!currentWeek.toLowerCase().startsWith("week")) currentWeek = "";
  let currentDay = "";

  const exercises: Exercise[] = [];

  for (let i = hIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const cellEx = cell(row, exCol);

    // Repeated header row → new week block
    if (cellEx.toLowerCase() === "exercise") {
      if (!hasExplicitWeek && preExCol >= 0) {
        const wk = cell(row, preExCol);
        if (wk.toLowerCase().startsWith("week")) currentWeek = wk;
      }
      continue;
    }

    // Explicit week/day columns (simple layouts)
    if (hasExplicitWeek) {
      const wk = cell(row, wkColIdx);
      if (wk) currentWeek = /^\d+$/.test(wk) ? `Week ${wk}` : wk;
    }
    if (hasExplicitDay) {
      const dy = cell(row, dyColIdx);
      if (dy) currentDay = /^\d+$/.test(dy) ? `Day ${dy}` : dy;
    }

    // Day/session label from pre-exercise column (complex layouts)
    if (!hasExplicitDay && preExCol >= 0) {
      const pre = cell(row, preExCol);
      const lp = pre.toLowerCase();
      if (pre && !lp.startsWith("week") && !lp.includes("rest") &&
          !lp.startsWith("if you") && !lp.startsWith("important") && pre.length > 1) {
        currentDay = pre.replace(/:$/, "").trim();
      }
    }

    // Skip non-exercise rows
    if (!cellEx || cellEx.length < 2) continue;
    const lc = cellEx.toLowerCase();
    if (lc.includes("rest day") || lc.startsWith("if you") || lc.startsWith("important")) continue;

    exercises.push({
      exercise:   cellEx,
      sets:       cell(row, setCol),
      reps:       cell(row, repCol),
      weight:     cell(row, wtCol),
      comments:   cell(row, ntCol),
      warmUpSets: cell(row, wuCol),
      restTime:   cell(row, rtCol),
      week:       currentWeek,
      day:        currentDay,
    });
  }

  return exercises.filter(ex => ex.exercise.length >= 2);
}

function groupByWeekDay(exercises: Exercise[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, Exercise[]>>();
  for (const ex of exercises) {
    const w = ex.week || "Week 1";
    const d = ex.day  || "Day 1";
    if (!weekMap.has(w)) weekMap.set(w, new Map());
    const dayMap = weekMap.get(w)!;
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(ex);
  }
  return Array.from(weekMap.entries()).map(([week, dayMap]) => ({
    week,
    days: Array.from(dayMap.entries()).map(([day, exs]) => ({ day, exercises: exs })),
  }));
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise: ex }: { exercise: Exercise }) {
  const { theme } = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{ex.exercise}</Text>
        <View style={styles.badges}>
          {ex.sets  && <Badge label={`${ex.sets} sets`} />}
          {ex.reps  && <Badge label={`${ex.reps} reps`} />}
          {ex.weight && <Badge label={ex.weight} variant="dark" />}
        </View>
      </View>
      {!!ex.comments && (
        <Text style={[styles.comments, { color: theme.colors.muted }]}>{ex.comments}</Text>
      )}
    </Card>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { planName, exercises, loading, setPlan, clearPlan } = usePlanContext();
  const { startSessionFromPlan } = useWorkouts();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [startingDay, setStartingDay] = useState<string | null>(null);

  const hasDayColumn = exercises.some((ex) => ex.day !== "");

  // ── File import ─────────────────────────────────────────────────────────────
  async function handleFileImport() {
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
    } catch {
      Alert.alert("Error", "Could not open file picker.");
      return;
    }
    if (result.canceled) return;
    const file = result.assets[0];

    try {
      let rawRows: string[][];
      if (/\.xlsx?$/i.test(file.name)) {
        const b64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64" as const,
        });
        const wb = XLSX.read(b64, { type: "base64" });
        rawRows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
          header: 1, defval: "", raw: false,
        });
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "utf8" as const,
        });
        rawRows = Papa.parse<string[]>(text, { header: false }).data;
      }
      if (!rawRows.length) { Alert.alert("Empty file", "No data rows found."); return; }
      const normalized = smartParse(rawRows);
      if (!normalized.length) {
        Alert.alert("No exercises found", "Could not find an 'Exercise' column header in the file. Check that your sheet has a column labelled 'Exercise'.");
        return;
      }
      setPlan(file.name.replace(/\.(csv|xlsx?)$/i, ""), normalized);
      setSelectedWeek(0);
    } catch {
      Alert.alert("Error", "Failed to parse the file.");
    }
  }

  // ── Google Sheets import ────────────────────────────────────────────────────
  async function handleUrlImport() {
    const parsed = parseGoogleSheetsUrl(sheetUrl.trim());
    if (!parsed) { Alert.alert("Invalid URL", "Paste a Google Sheets share link."); return; }

    const exportUrl =
      `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv` +
      (parsed.gid ? `&gid=${parsed.gid}` : "");

    setImporting(true);
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (looksLikeHtml(text)) {
        throw new Error(
          'Google returned a login page instead of data.\n\nIn Google Sheets: Share → "Anyone with the link" → Viewer.'
        );
      }
      const rawRows = Papa.parse<string[]>(text, { header: false }).data;
      if (!rawRows.length) throw new Error("No rows found");
      const normalized = smartParse(rawRows);
      if (!normalized.length) {
        Alert.alert("No exercises found", "Could not find an 'Exercise' column header in the sheet. Check that your sheet has a column labelled 'Exercise'.");
        return;
      }
      setPlan("Google Sheet", normalized);
      setSelectedWeek(0);
      setUrlModalVisible(false);
      setSheetUrl("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "Import failed",
        `${msg}\n\nMake sure the sheet is set to "Anyone with the link can view".`
      );
    } finally {
      setImporting(false);
    }
  }

  function promptImportMethod() {
    Alert.alert("Import Workout Plan", "Choose a source", [
      { text: "File (CSV or Excel)",  onPress: handleFileImport },
      { text: "Google Sheets URL",    onPress: () => setUrlModalVisible(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleClear() {
    Alert.alert("Clear plan?", "This will remove the imported workout.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive",
        onPress: () => {
          clearPlan();
          setSelectedWeek(0);
        },
      },
    ]);
  }

  const weeks = groupByWeekDay(exercises);
  const activeWeek = weeks[selectedWeek];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {planName || "Workout Plan"}
        </Text>
        <View style={styles.headerActions}>
          {exercises.length > 0 && (
            <Button label="Clear" onPress={handleClear} variant="secondary" small />
          )}
          <Button label="Import" onPress={promptImportMethod} small />
        </View>
      </View>

      {exercises.length === 0 ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="📊"
            title="No plan loaded"
            subtitle="Import a CSV, Excel file, or Google Sheets link."
            hint={"Expected columns:\nWeek · Day · Exercise · Sets · Reps · Weight · Comments"}
          />
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 12 }}>
            <Button label="Browse Catalog" onPress={() => router.push("/catalog")} />
          </View>
        </View>
      ) : (
        <>
          {/* Week tabs */}
          <FlatList
            data={weeks}
            keyExtractor={(w) => w.week}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekTabs}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            renderItem={({ item, index }) => (
              <Pressable
                style={[
                  styles.weekTab,
                  { backgroundColor: index === selectedWeek ? theme.colors.primary : theme.colors.mutedBg },
                ]}
                onPress={() => setSelectedWeek(index)}
              >
                <Text
                  style={[
                    styles.weekTabText,
                    { color: index === selectedWeek ? theme.colors.primaryText : theme.colors.muted },
                  ]}
                >
                  {item.week}
                </Text>
              </Pressable>
            )}
          />

          {/* Days + exercises */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {activeWeek?.days.map((dayGroup) => (
              <View key={dayGroup.day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  {hasDayColumn && (
                    <Text style={[styles.dayLabel, { color: theme.colors.muted }]}>{dayGroup.day}</Text>
                  )}
                  <Pressable
                    style={[styles.startSessionBtn, { backgroundColor: theme.colors.primary }]}
                    disabled={startingDay === dayGroup.day}
                    onPress={async () => {
                      setStartingDay(dayGroup.day);
                      try {
                        const id = await startSessionFromPlan(
                          planName || "Workout",
                          activeWeek.week,
                          dayGroup.day,
                          dayGroup.exercises
                        );
                        router.push(`/session/${id}`);
                      } finally {
                        setStartingDay(null);
                      }
                    }}
                  >
                    {startingDay === dayGroup.day ? (
                      <ActivityIndicator size="small" color={theme.colors.primaryText} />
                    ) : (
                      <Text style={[styles.startSessionText, { color: theme.colors.primaryText }]}>▶ Start Session</Text>
                    )}
                  </Pressable>
                </View>
                {dayGroup.exercises.map((ex, i) => (
                  <ExerciseCard key={i} exercise={ex} />
                ))}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Google Sheets URL modal */}
      <Modal visible={urlModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Google Sheets URL</Text>
            <Text style={[styles.modalHint, { color: theme.colors.muted }]}>
              Sheet must be shared as "Anyone with the link can view"
            </Text>
            <TextInput
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
              <Button
                label="Import"
                onPress={handleUrlImport}
                loading={importing}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  headerActions: { flexDirection: "row", gap: 8 },

  // Week tabs
  weekTabs: { flexGrow: 0, marginBottom: 20 },
  weekTab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  weekTabText: { fontSize: 13, fontWeight: "600" },

  // Day section
  daySection: { marginBottom: spacing.lg },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  startSessionBtn: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  startSessionText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Exercise card
  card: { marginBottom: 10 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  comments: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: "italic",
  },

  // URL modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  modalHint: { fontSize: 13, marginBottom: spacing.md },
  input: {
    borderRadius: radius.md,
    padding: 14,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: "row" },
});
