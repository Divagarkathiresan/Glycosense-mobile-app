import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';
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
  const [items, setItems] = useState<Metric[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <ScrollView contentContainerStyle={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  banner: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  bannerText: {
    color: '#991b1b',
  },
  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991b1b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHint: {
    color: '#4b5563',
    fontSize: 12,
  },
  errorText: {
    color: '#b91c1c',
  },
  emptyText: {
    color: '#6b7280',
  },
});
