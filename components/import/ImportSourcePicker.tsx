import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { impact, ImpactStyle } from '../../lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '../../contexts/ThemeContext';
import { spacing, radius, typography } from '../../lib/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  onSelectDrive: () => void;
  onSelectFile: () => void;
};

type SourceCardProps = {
  icon: IoniconName;
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void;
};

// ── SourceCard ─────────────────────────────────────────────────────────────────

const SourceCard = React.memo(function SourceCard({
  icon,
  title,
  subtitle,
  primary,
  onPress,
}: SourceCardProps) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    impact(ImpactStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          primary ? styles.cardPrimary : styles.cardSecondary,
          {
            backgroundColor: primary
              ? theme.colors.primary + '15'
              : theme.colors.surface,
            borderColor: primary ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            primary ? styles.iconWrapPrimary : styles.iconWrapSecondary,
            {
              backgroundColor: primary
                ? theme.colors.primary + '25'
                : theme.colors.muted + '20',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={primary ? 26 : 22}
            color={primary ? theme.colors.primary : theme.colors.muted}
          />
        </View>

        <View style={styles.cardText}>
          <Text
            style={[
              styles.cardTitle,
              { color: theme.colors.text },
              primary && styles.cardTitlePrimary,
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.muted }]}>
            {subtitle}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
      </Pressable>
    </Animated.View>
  );
});

// ── ImportSourcePicker ─────────────────────────────────────────────────────────

export const ImportSourcePicker = React.memo(function ImportSourcePicker({
  onSelectDrive,
  onSelectFile,
}: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Import Plan</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Choose where to import your workout plan from
        </Text>
      </View>

      <View style={styles.cards}>
        <SourceCard
          icon="logo-google"
          title="Google Drive"
          subtitle="Import from your spreadsheets"
          primary
          onPress={onSelectDrive}
        />
        <SourceCard
          icon="document-attach-outline"
          title="Upload File"
          subtitle="CSV, XLSX, or JSON"
          onPress={onSelectFile}
        />
      </View>
    </View>
  );
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  cards: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  cardPrimary: {
    paddingVertical: spacing.lg,
  },
  cardSecondary: {
    paddingVertical: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  iconWrapPrimary: {
    width: 48,
    height: 48,
  },
  iconWrapSecondary: {
    width: 40,
    height: 40,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.subheading,
    marginBottom: 2,
  },
  cardTitlePrimary: {
    fontWeight: '700',
  },
  cardSubtitle: {
    ...typography.small,
  },
});
