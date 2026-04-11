/**
 * components/health/HealthConnectionCard.tsx — Apple Health connection status card.
 *
 * Shows connection status, what data is being read, and provides
 * manage/disconnect actions. Used in Profile/Settings.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { PermissionStatus } from '../../hooks/useHealthPermissions';

type Props = {
  permissionStatus: PermissionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  /** Whether each data type is available */
  dataAvailability?: {
    weight?: boolean;
    workouts?: boolean;
    steps?: boolean;
    heartRate?: boolean;
    restingHR?: boolean;
    activeEnergy?: boolean;
    hrv?: boolean;
    sleep?: boolean;
  };
};

type DataItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
};

export function HealthConnectionCard({
  permissionStatus,
  onConnect,
  onDisconnect,
  dataAvailability = {},
}: Props) {
  const { theme } = useAppTheme();

  if (Platform.OS !== 'ios') return null;

  const isConnected = permissionStatus === 'full' || permissionStatus === 'partial';

  const statusColor =
    permissionStatus === 'full'
      ? theme.colors.primary
      : permissionStatus === 'partial'
        ? '#F5A623' // warning orange — no theme.colors.warning available
        : theme.colors.muted;

  const statusText =
    permissionStatus === 'full'
      ? 'Connected'
      : permissionStatus === 'partial'
        ? 'Partially Connected'
        : permissionStatus === 'denied'
          ? 'Access Denied'
          : 'Not Connected';

  const dataItems: DataItem[] = [
    { key: 'weight', label: 'Body Weight', icon: 'scale', available: dataAvailability.weight ?? false },
    { key: 'workouts', label: 'Workouts', icon: 'barbell', available: dataAvailability.workouts ?? false },
    { key: 'steps', label: 'Step Count', icon: 'footsteps', available: dataAvailability.steps ?? false },
    { key: 'heartRate', label: 'Heart Rate', icon: 'heart', available: dataAvailability.heartRate ?? false },
    { key: 'restingHR', label: 'Resting Heart Rate', icon: 'heart-half', available: dataAvailability.restingHR ?? false },
    { key: 'activeEnergy', label: 'Active Energy', icon: 'flame', available: dataAvailability.activeEnergy ?? false },
    { key: 'hrv', label: 'Heart Rate Variability', icon: 'pulse', available: dataAvailability.hrv ?? false },
    { key: 'sleep', label: 'Sleep Analysis', icon: 'moon', available: dataAvailability.sleep ?? false },
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart-circle" size={24} color={statusColor} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Apple Health
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Data list */}
      {isConnected && (
        <View style={styles.dataList}>
          {dataItems.map((item) => (
            <View key={item.key} style={styles.dataRow}>
              <Ionicons
                name={item.available ? 'checkmark-circle' : 'remove-circle-outline'}
                size={16}
                color={item.available ? theme.colors.primary : theme.colors.muted}
              />
              <Text
                style={[
                  styles.dataLabel,
                  { color: item.available ? theme.colors.text : theme.colors.muted },
                ]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!isConnected ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={onConnect}
            activeOpacity={0.7}
            accessibilityLabel="Connect Apple Health"
            accessibilityRole="button"
          >
            <Ionicons name="heart" size={16} color="#fff" />
            <Text style={styles.buttonText}>Connect Apple Health</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => Linking.openURL('x-apple-health://')}
              activeOpacity={0.7}
              accessibilityLabel="Manage in Health app"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                Manage in Health
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={onDisconnect}
              activeOpacity={0.7}
              accessibilityLabel="Disconnect Apple Health"
              accessibilityRole="button"
            >
              <Text style={[styles.disconnectText, { color: theme.colors.danger }]}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dataList: {
    gap: 6,
    marginBottom: 14,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataLabel: {
    fontSize: 13,
  },
  actions: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  disconnectText: {
    fontSize: 13,
  },
});
