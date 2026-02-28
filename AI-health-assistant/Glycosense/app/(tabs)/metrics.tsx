import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { DrawerMenu } from '@/components/drawer-menu';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { Link } from 'expo-router';

type Metric = {
  metric_id: number;
  disease_type: string;
  created_at?: string;
  timestamp?: number;
  glucose_value?: number;
  measurement_context?: string;
  trend?: string;
  symptoms?: string;
  medication_type?: string;
  meal_type?: string;
  diabetes_status?: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  physical_activity?: string;
  family_history?: boolean;
};

export default function MetricsScreen() {
  const { token, user, loading } = useAuth();
  const { mode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<Metric[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = mode === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<Metric[]>('/user-metrics', { token });
      const sorted = [...data].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      setItems(sorted);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load metrics');
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader onMenuPress={() => setMenuOpen(true)} />
        <Text style={styles.title}>My Metrics</Text>
      {loading ? (
        <ActivityIndicator />
      ) : !user ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Sign in to view metrics.</Text>
          <Link href="/(tabs)/profile" asChild>
            <Pressable style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Go to Profile</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <Pressable style={styles.primaryButton} onPress={load} disabled={busy}>
            <Text style={styles.primaryButtonText}>{busy ? 'Refreshing...' : 'Refresh'}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No metrics yet.</Text>
          ) : (
            items.map((item) => (
              <View key={item.metric_id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.disease_type} • {item.created_at?.split('T')[0] ?? 'Unknown date'}
                </Text>
                <Text style={styles.cardValue}>
                  Glucose: {item.glucose_value ?? '—'} mg/dL
                </Text>
                <Text style={styles.cardHint}>
                  Context: {item.measurement_context ?? '—'} • Trend: {item.trend ?? '—'}
                </Text>
                <Text style={styles.cardHint}>
                  Meal: {item.meal_type ?? '—'} • Activity: {item.physical_activity ?? '—'}
                </Text>
                <Text style={styles.cardHint}>
                  Weight: {item.weight_kg ?? '—'} kg • Height: {item.height_cm ?? '—'} cm
                </Text>
              </View>
            ))
          )}
        </>
      )}
      </ScrollView>
      <DrawerMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? '#1F2937' : '#E9F7EF',
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  primaryButton: {
    backgroundColor: '#0EA5A4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  banner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F5C2C2',
  },
  bannerText: {
    color: '#991B1B',
  },
  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991B1B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: isDark ? '#9CA3AF' : '#3B7C5B',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  cardHint: {
    color: isDark ? '#9CA3AF' : '#4F856A',
    fontSize: 12,
  },
  errorText: {
    color: '#991B1B',
  },
  emptyText: {
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
});
