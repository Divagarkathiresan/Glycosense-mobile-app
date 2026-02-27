import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';

type Metric = {
  metric_id: number;
  disease_type: string;
  created_at?: string;
  timestamp?: number;
  glucose_value?: number;
};

type LatestRisk = {
  risk_score: number;
  risk_level?: string;
  created_at?: string | null;
};

type ChartPoint = {
  x: number;
  y: number;
};

function getMetricTime(metric: Metric) {
  if (typeof metric.timestamp === 'number') return metric.timestamp;
  if (metric.created_at) return new Date(metric.created_at).getTime();
  return 0;
}

function LineChart({ values }: { values: number[] }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const points = useMemo<ChartPoint[]>(() => {
    if (values.length === 0 || size.width === 0 || size.height === 0) return [];
    const padding = 16;
    const width = Math.max(size.width - padding * 2, 1);
    const height = Math.max(size.height - padding * 2, 1);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values.map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * width;
      const y = padding + (1 - (value - min) / range) * height;
      return { x, y };
    });
  }, [values, size]);

  const segments = useMemo(() => {
    if (points.length < 2) return [];
    return points.slice(1).map((point, index) => {
      const prev = points[index];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return { left: prev.x, top: prev.y, length, angle };
    });
  }, [points]);

  return (
    <View
      style={styles.chartPlot}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      <View style={styles.chartAxis} />
      {segments.map((segment, index) => (
        <View
          key={`seg-${index}`}
          style={[
            styles.chartLine,
            {
              left: segment.left,
              top: segment.top,
              width: segment.length,
              transform: [{ rotate: `${segment.angle}deg` }],
            },
          ]}
        />
      ))}
      {points.map((point, index) => (
        <View
          key={`pt-${index}`}
          style={[
            styles.chartDot,
            {
              left: point.x - 3,
              top: point.y - 3,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { user, token, logout } = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [latestRisk, setLatestRisk] = useState<LatestRisk | null>(null);

  const loadMetrics = useCallback(async () => {
    if (!token) return;
    setMetricsError(null);
    try {
      const data = await apiFetch<Metric[]>('/user-metrics', { token });
      const sorted = [...data].sort((a, b) => getMetricTime(a) - getMetricTime(b));
      setMetrics(sorted);
    } catch (err: any) {
      setMetricsError(err.message ?? 'Failed to load metrics');
    }
  }, [token]);

  useEffect(() => {
    if (token) loadMetrics();
  }, [token, loadMetrics]);

  const loadLatestRisk = useCallback(async () => {
    if (!token) return;
    try {
      const risk = await apiFetch<LatestRisk>('/diabetes-risk/latest', { token });
      setLatestRisk(risk);
    } catch {
      setLatestRisk({ risk_score: 0 });
    }
  }, [token]);

  useEffect(() => {
    if (token) loadLatestRisk();
  }, [token, loadLatestRisk]);

  const latestGlucose = useMemo(() => {
    const last = [...metrics].reverse().find((item) => typeof item.glucose_value === 'number');
    return typeof last?.glucose_value === 'number' ? last.glucose_value : null;
  }, [metrics]);

  const glucoseData = useMemo(() => {
    const filtered = metrics
      .filter((item) => typeof item.glucose_value === 'number')
      .slice(-10);
    return filtered.map((item) => ({
      value: item.glucose_value as number,
      date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    }));
  }, [metrics]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.menuButton} onPress={() => setOptionsOpen(true)}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </Pressable>
            <View style={styles.userBadge}>
              <View style={styles.avatarCircle} />
              <Text style={styles.userName}>{user?.name ?? 'Guest'}</Text>
            </View>
          </View>

          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/glycosense-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.brand}>Glycosense</Text>
              <Text style={styles.brandSubtitle}>Personal glucose insights</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Glucose level</Text>
              <Text style={styles.statValue}>
                {latestGlucose !== null ? `${latestGlucose} mg/dL` : '—'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Risk score</Text>
              <Text style={styles.statValue}>
                {latestRisk?.risk_score ?? 0}
              </Text>
              <Text style={styles.statHint}>{latestRisk?.risk_level ?? 'Unknown'}</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartAxisLabel}>Glucose Trend</Text>
            </View>
            {glucoseData.length > 1 ? (
              <LineChart values={glucoseData.map(d => d.value)} />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  {metricsError ? metricsError : 'Add glucose metrics to see trends.'}
                </Text>
              </View>
            )}
            {glucoseData.length > 0 && (
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>{glucoseData[0]?.date}</Text>
                {glucoseData.length > 1 && (
                  <Text style={styles.chartLabel}>{glucoseData[glucoseData.length - 1]?.date}</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {optionsOpen ? (
          <View style={styles.optionsOverlay}>
            <View style={styles.optionsPanel}>
              <Pressable style={styles.closeButton} onPress={() => setOptionsOpen(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>

              <View style={styles.drawerHeader}>
                <Image
                  source={require('@/assets/images/glycosense-logo.png')}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.drawerTitle}>Glycosense</Text>
                <Text style={styles.drawerSubtitle}>Health Monitoring</Text>
              </View>

              <View style={styles.divider} />

              <Link href="/" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <Text style={styles.optionIcon}>🏠</Text>
                  <Text style={styles.optionText}>Dashboard</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/risk" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <Text style={styles.optionIcon}>🩺</Text>
                  <Text style={styles.optionText}>Risk Assessment</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/metrics" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <Text style={styles.optionIcon}>📊</Text>
                  <Text style={styles.optionText}>My Metrics</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/profile" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <Text style={styles.optionIcon}>👤</Text>
                  <Text style={styles.optionText}>Profile</Text>
                </Pressable>
              </Link>

              <View style={styles.divider} />

              <Pressable style={styles.logoutButton} onPress={() => { logout(); setOptionsOpen(false); }}>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
            <Pressable style={styles.optionsBackdrop} onPress={() => setOptionsOpen(false)} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E9F7EF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FFFB',
    borderWidth: 1,
    borderColor: '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#1B4332',
    marginVertical: 2,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFFB',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CDEFD8',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CDEFD8',
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    color: '#1B4332',
    fontWeight: '600',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FFFB',
    borderWidth: 1,
    borderColor: '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  brand: {
    fontSize: 34,
    color: '#1B4332',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#3B7C5B',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FFFB',
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CDEFD8',
  },
  statLabel: {
    fontSize: 16,
    color: '#3B7C5B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    color: '#1B4332',
    fontWeight: '700',
  },
  statHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#4F856A',
    textTransform: 'uppercase',
  },
  chartCard: {
    backgroundColor: '#F8FFFB',
    borderRadius: 22,
    padding: 16,
    minHeight: 240,
    borderWidth: 1,
    borderColor: '#CDEFD8',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  chartAxisLabel: {
    fontSize: 14,
    color: '#3B7C5B',
  },
  chartPlot: {
    flex: 1,
    minHeight: 160,
    backgroundColor: '#F8FFFB',
    borderRadius: 16,
  },
  chartAxis: {
    position: 'absolute',
    left: 16,
    top: 16,
    bottom: 24,
    width: 1,
    backgroundColor: '#3B7C5B',
    opacity: 0.6,
  },
  chartLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#2D6A4F',
  },
  chartDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6A4F',
  },
  chartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chartEmptyText: {
    color: '#4F856A',
    textAlign: 'center',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#3B7C5B',
    fontWeight: '500',
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  optionsPanel: {
    width: 280,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  optionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  drawerHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  drawerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F4F9F9',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginTop: 'auto',
  },
  logoutIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  logoutText: {
    fontSize: 16,
    color: '#991B1B',
    fontWeight: '600',
  },
});
