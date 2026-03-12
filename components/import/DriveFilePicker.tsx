import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { impact, ImpactStyle } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '../../contexts/ThemeContext';
import { spacing, radius, typography } from '../../lib/theme';
import type { DriveFile } from '../../lib/googleDrive';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  files: DriveFile[];
  loading: boolean;
  onSelect: (file: DriveFile) => void;
  onSearch: (query: string) => void;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function fileIconName(mimeType: string): IoniconName {
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('sheet') ||
    mimeType.includes('google-apps')
  ) {
    return 'grid-outline';
  }
  if (mimeType.includes('csv') || mimeType.includes('text')) {
    return 'document-text-outline';
  }
  return 'document-outline';
}

// ── Skeleton Rows ─────────────────────────────────────────────────────────────

const SkeletonRows = React.memo(function SkeletonRows() {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animStyle}>
      <View style={[styles.skeletonRow, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.border }]} />
        <View style={styles.skeletonTexts}>
          <View style={[styles.skeletonLineA, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.skeletonLineSub, { backgroundColor: theme.colors.border }]} />
        </View>
      </View>
      <View style={[styles.skeletonRow, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.border }]} />
        <View style={styles.skeletonTexts}>
          <View style={[styles.skeletonLineB, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.skeletonLineSub, { backgroundColor: theme.colors.border }]} />
        </View>
      </View>
      <View style={[styles.skeletonRow, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.border }]} />
        <View style={styles.skeletonTexts}>
          <View style={[styles.skeletonLineC, { backgroundColor: theme.colors.border }]} />
          <View style={[styles.skeletonLineSub, { backgroundColor: theme.colors.border }]} />
        </View>
      </View>
    </Animated.View>
  );
});

// ── Empty State ───────────────────────────────────────────────────────────────

const EmptyState = React.memo(function EmptyState() {
  const { theme } = useAppTheme();
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={48} color={theme.colors.muted} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No files found</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.muted }]}>
        Try a different search term
      </Text>
    </View>
  );
});

// ── File Row ──────────────────────────────────────────────────────────────────

type FileRowProps = {
  file: DriveFile;
  onPress: (file: DriveFile) => void;
};

const FileRow = React.memo(function FileRow({ file, onPress }: FileRowProps) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    impact(ImpactStyle.Light);
    onPress(file);
  }, [file, onPress]);

  const iconName = useMemo(() => fileIconName(file.mimeType), [file.mimeType]);
  const dateLabel = useMemo(() => relativeDate(file.modifiedTime), [file.modifiedTime]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.fileRow, { borderBottomColor: theme.colors.border }]}
      >
        <View style={[styles.fileIconWrap, { backgroundColor: theme.colors.mutedBg }]}>
          <Ionicons name={iconName} size={20} color={theme.colors.primary} />
        </View>

        <View style={styles.fileInfo}>
          <Text
            style={[styles.fileName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {file.name}
          </Text>
          <Text style={[styles.fileDate, { color: theme.colors.muted }]}>
            {dateLabel}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
      </Pressable>
    </Animated.View>
  );
});

// ── DriveFilePicker ───────────────────────────────────────────────────────────

export const DriveFilePicker = React.memo(function DriveFilePicker({
  files,
  loading,
  onSelect,
  onSearch,
  error,
}: Props) {
  const { theme } = useAppTheme();

  const renderItem: ListRenderItem<DriveFile> = useCallback(
    ({ item }) => <FileRow file={item} onPress={onSelect} />,
    [onSelect],
  );

  const keyExtractor = useCallback((item: DriveFile) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.colors.mutedBg,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search files..."
          placeholderTextColor={theme.colors.muted}
          onChangeText={onSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {/* Error banner */}
      {!!error && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: theme.colors.danger + '20',
              borderColor: theme.colors.danger,
            },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
          <Text style={[styles.errorText, { color: theme.colors.danger }]} numberOfLines={2}>
            {error}
          </Text>
        </View>
      )}

      {/* Loading state */}
      {loading && <SkeletonRows />}

      {/* File list */}
      {!loading && (
        <FlatList
          data={files}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={!error ? <EmptyState /> : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={files.length === 0 ? styles.emptyListContent : undefined}
        />
      )}
    </View>
  );
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...typography.subheading,
    marginBottom: 2,
  },
  fileDate: {
    ...typography.caption,
  },
  // Skeleton rows — each line has a distinct named width to avoid inline styles
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
  },
  skeletonTexts: {
    flex: 1,
    gap: 4,
  },
  skeletonLineA: {
    height: 14,
    borderRadius: radius.sm,
    width: '72%',
  },
  skeletonLineB: {
    height: 14,
    borderRadius: radius.sm,
    width: '58%',
  },
  skeletonLineC: {
    height: 14,
    borderRadius: radius.sm,
    width: '64%',
  },
  skeletonLineSub: {
    height: 10,
    borderRadius: radius.sm,
    width: '36%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subheading,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
