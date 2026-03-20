/**
 * import-drive.tsx — Multi-step import wizard.
 *
 * Steps: source → auth → picker → preview
 * Single screen with internal state machine — no nested navigation.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "../components/BackButton";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { useAppTheme } from "../contexts/ThemeContext";
import { usePlanContext as usePlan } from "../contexts/PlanContext";
import { useToast } from "../contexts/ToastContext";
import { spacing, typography } from "../lib/theme";

import {
  signInWithGoogle,
  isSignedIn,
  type GoogleAuthError,
} from "../lib/googleAuth";
import {
  listDriveFiles,
  searchDriveFiles,
  exportSheetAsCsv,
  downloadFile,
  downloadFileAsBase64,
  getFileType,
  DriveError,
  type DriveFile,
} from "../lib/googleDrive";
import {
  smartParse,
  validateParsedPlan,
  looksLikeHtml,
  type ParsedPlanSummary,
} from "../lib/importPlan";
import type { Exercise } from "../lib/types";

import { ImportSourcePicker } from "../components/import/ImportSourcePicker";
import { DriveFilePicker } from "../components/import/DriveFilePicker";
import { ImportPreview } from "../components/import/ImportPreview";

// ── Types ────────────────────────────────────────────────────────────────────

type Step = "source" | "auth" | "picker" | "preview";

// ── Helpers ──────────────────────────────────────────────────────────────────

function csvToRows(csv: string): string[][] {
  const result = Papa.parse<string[]>(csv, { header: false });
  return (result.data ?? []) as string[][];
}

const DEBOUNCE_MS = 300;

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ImportDriveScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { setPlan } = usePlan();
  const { showToast } = useToast();

  // State machine
  const [step, setStep] = useState<Step>("source");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Drive picker state
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Preview state
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewExercises, setPreviewExercises] = useState<Exercise[]>([]);
  const [previewSummary, setPreviewSummary] = useState<ParsedPlanSummary>({
    totalWeeks: 0,
    totalDays: 0,
    totalExercises: 0,
    missingSetsReps: 0,
  });
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // ── Navigation ──────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    switch (step) {
      case "source":
        router.back();
        break;
      case "auth":
        setStep("source");
        setError(undefined);
        break;
      case "picker":
        setStep("source");
        setError(undefined);
        break;
      case "preview":
        setStep("picker");
        break;
    }
  }, [step]);

  const stepLabel = (() => {
    switch (step) {
      case "source":
        return "Import Plan";
      case "auth":
        return "Sign In";
      case "picker":
        return "Select File";
      case "preview":
        return "Preview";
    }
  })();

  // ── Source selection ─────────────────────────────────────────────────────

  const handleSelectDrive = useCallback(async () => {
    setLoading(true);
    try {
      const signedIn = await isSignedIn();
      if (signedIn) {
        setStep("picker");
        loadDriveFiles();
      } else {
        setStep("auth");
      }
    } catch {
      setStep("auth");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "application/json",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setLoading(true);

      let rows: string[][];
      if (
        asset.mimeType?.includes("spreadsheetml") ||
        asset.name?.endsWith(".xlsx")
      ) {
        const b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64" as const,
        });
        const wb = XLSX.read(b64, { type: "base64", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
      } else {
        const text = await FileSystem.readAsStringAsync(asset.uri);
        rows = csvToRows(text);
      }

      const exercises = smartParse(rows);
      const validation = validateParsedPlan(exercises);

      if (!validation.valid) {
        showToast({ message: validation.error, type: "error" });
        setLoading(false);
        return;
      }

      setPreviewFileName(asset.name ?? "Uploaded File");
      setPreviewExercises(exercises);
      setPreviewSummary(validation.summary);
      setPreviewWarnings(validation.warnings);
      setStep("preview");
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Failed to read file",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Auth ────────────────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      await signInWithGoogle();
      setStep("picker");
      loadDriveFiles();
    } catch (e) {
      const authError = e as GoogleAuthError;
      if (authError.code === "cancelled") {
        setStep("source");
      } else {
        setError(authError.message ?? "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Drive file loading ──────────────────────────────────────────────────

  const loadDriveFiles = useCallback(async (query?: string) => {
    setPickerLoading(true);
    setError(undefined);
    try {
      const results = query
        ? await searchDriveFiles(query)
        : await listDriveFiles();
      setFiles(results);
    } catch (e) {
      setError(
        e instanceof DriveError
          ? e.message
          : "Failed to load files. Please try again."
      );
    } finally {
      setPickerLoading(false);
    }
  }, []);

  // Load files when entering picker step
  useEffect(() => {
    if (step === "picker" && files.length === 0 && !pickerLoading) {
      loadDriveFiles();
    }
  }, [step]);

  const handleSearch = useCallback(
    (query: string) => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        loadDriveFiles(query || undefined);
      }, DEBOUNCE_MS);
    },
    [loadDriveFiles]
  );

  // ── File selection & parsing ────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (file: DriveFile) => {
      setPickerLoading(true);
      setError(undefined);
      try {
        const fileType = getFileType(file.mimeType);
        let rows: string[][];

        if (fileType === "google-sheets") {
          const csv = await exportSheetAsCsv(file.id);
          if (looksLikeHtml(csv)) {
            throw new DriveError(
              "Received an HTML page instead of spreadsheet data. The file may not be accessible."
            );
          }
          if (!csv) throw new DriveError("Sheet exported as empty — is the sheet blank?");
          rows = csvToRows(csv);
        } else if (fileType === "csv") {
          const csv = await downloadFile(file.id);
          rows = csvToRows(csv);
        } else if (fileType === "xlsx") {
          const b64 = await downloadFileAsBase64(file.id);
          const wb = XLSX.read(b64, { type: "base64", cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false });
        } else {
          throw new DriveError(
            "Unsupported file type. Select a Google Sheet, CSV, or XLSX."
          );
        }

        const exercises = smartParse(rows);
        const validation = validateParsedPlan(exercises);

        if (!validation.valid) {
          setError(validation.error);
          setPickerLoading(false);
          return;
        }

        setPreviewFileName(file.name);
        setPreviewExercises(exercises);
        setPreviewSummary(validation.summary);
        setPreviewWarnings(validation.warnings);
        setStep("preview");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to import file"
        );
      } finally {
        setPickerLoading(false);
      }
    },
    [showToast]
  );

  // ── Import confirm ──────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    setImporting(true);
    try {
      setPlan(previewFileName, previewExercises);
      showToast({
        message: `Imported "${previewFileName}" — ${previewSummary.totalExercises} exercises across ${previewSummary.totalWeeks} weeks`,
        type: "success",
      });
      router.replace("/(tabs)/plan");
    } catch {
      showToast({ message: "Failed to save plan", type: "error" });
    } finally {
      setImporting(false);
    }
  }, [previewFileName, previewExercises, previewSummary, setPlan, showToast]);

  const handleCancelPreview = useCallback(() => {
    setStep("picker");
  }, []);

  // ── Step indicator ──────────────────────────────────────────────────────

  const stepIndex =
    step === "source" ? 0 : step === "auth" ? 1 : step === "picker" ? 1 : 2;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn}>
          <BackButton onPress={goBack} />
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {stepLabel}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Step dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= stepIndex ? theme.colors.primary : theme.colors.border,
              },
              i === stepIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      {step === "source" && (
        <ImportSourcePicker
          onSelectDrive={handleSelectDrive}
          onSelectFile={handleSelectFile}
        />
      )}

      {step === "auth" && (
        <View style={styles.authContainer}>
          <Ionicons
            name="logo-google"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={[styles.authTitle, { color: theme.colors.text }]}>
            Connect Google Account
          </Text>
          <Text style={[styles.authSubtitle, { color: theme.colors.muted }]}>
            Sign in to access your Google Drive files
          </Text>

          {error && (
            <Text style={[styles.authError, { color: theme.colors.danger }]}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={[
              styles.authBtn,
              { backgroundColor: theme.colors.primary },
              loading && styles.authBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.authBtnText}>Sign in with Google</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === "picker" && (
        <DriveFilePicker
          files={files}
          loading={pickerLoading}
          onSelect={handleFileSelect}
          onSearch={handleSearch}
          error={error}
        />
      )}

      {step === "preview" && (
        <ImportPreview
          fileName={previewFileName}
          summary={previewSummary}
          warnings={previewWarnings}
          exercises={previewExercises}
          onConfirm={handleConfirm}
          onCancel={handleCancelPreview}
          loading={importing}
        />
      )}

      {/* Global loading overlay for source step */}
      {loading && step === "source" && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.subheading,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
  },
  // Auth step
  authContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  authTitle: {
    ...typography.heading,
    marginTop: spacing.md,
  },
  authSubtitle: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  authError: {
    ...typography.small,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  authBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  authBtnDisabled: {
    opacity: 0.6,
  },
  authBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
