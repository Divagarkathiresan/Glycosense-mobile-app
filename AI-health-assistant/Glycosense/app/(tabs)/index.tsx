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
import { useFocusEffect } from '@react-navigation/native';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';

type RiskHistoryItem = {
  record_id: number;
  created_at?: string | null;
  glucose_value?: number | null;
  weight_kg?: number | null;
  bmi?: number | null;
  risk_score?: number | null;
  risk_level?: string | null;
};

type UserMetricItem = {
  metric_id: number;
  created_at?: string;
  glucose_value?: number;
  weight_kg?: number;
  height_cm?: number;
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

type ChartDatum = {
  value: number;
  date: string;
  glucose?: number;
  bmi?: number;
  weight?: number;
  riskScore?: number;
};

function LineChart({ data }: { data: ChartDatum[] }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { points, minValue, maxValue } = useMemo(() => {
    if (data.length === 0 || size.width === 0 || size.height === 0) 
      return { points: [], minValue: 0, maxValue: 0 };
    
    const padding = 40;
    const width = Math.max(size.width - padding * 2, 1);
    const height = Math.max(size.height - padding * 2, 1);
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = values.map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * width;
      const y = padding + (1 - (value - min) / range) * height;
      return { x, y };
    });

    return { points: pts, minValue: min, maxValue: max };
  }, [data, size]);

  return (
    <View
      style={styles.chartPlot}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      <View style={styles.chartGrid}>
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
        <View style={styles.gridLine} />
      </View>
      
      {points.length > 1 && (
        <>
          {points.slice(0, -1).map((point, index) => {
            const next = points[index + 1];
            const dx = next.x - point.x;
            const dy = next.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            return (
              <View
                key={`line-${index}`}
                style={{
                  position: 'absolute',
                  left: point.x,
                  top: point.y,
                  width: length,
                  height: 3,
                  backgroundColor: '#0EA5A4',
                  transform: [{ rotate: `${angle}rad` }],
                }}
              />
            );
          })}
          {points.map((point, index) => (
            <Pressable
              key={`dot-${index}`}
              style={[styles.chartDot, { left: point.x - 5, top: point.y - 5 }]}
              onPress={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              <View style={styles.chartDotInner} />
            </Pressable>
          ))}
        </>
      )}

      {activeIndex !== null && points[activeIndex] ? (
        (() => {
          const point = points[activeIndex];
          const datum = data[activeIndex];
          const tooltipWidth = 170;
          const left = Math.min(
            Math.max(point.x - tooltipWidth / 2, 8),
            Math.max(size.width - tooltipWidth - 8, 8)
          );
          const top = point.y < 60 ? point.y + 18 : point.y - 70;
          return (
            <View style={[styles.tooltip, { left, top }]}>
              <Text style={styles.tooltipTitle}>{datum.date}</Text>
              <Text style={styles.tooltipText}>Glucose: {datum.glucose ?? '—'} mg/dL</Text>
              <Text style={styles.tooltipText}>BMI: {datum.bmi ?? '—'}</Text>
              <Text style={styles.tooltipText}>Weight: {datum.weight ?? '—'} kg</Text>
              <Text style={styles.tooltipText}>Risk: {datum.riskScore ?? '—'}</Text>
            </View>
          );
        })()
      ) : null}
      
      {minValue > 0 && maxValue > 0 && (
        <>
          <Text style={[styles.yAxisLabel, { top: 20 }]}>{Math.round(maxValue)}</Text>
          <Text style={[styles.yAxisLabel, { bottom: 20 }]}>{Math.round(minValue)}</Text>
        </>
      )}

      {points.length > 0 && (
        <View style={styles.xAxisLabels}>
          {points.map((point, index) => {
            const showLabel = data.length <= 6 || index % 2 === 0 || index === data.length - 1;
            if (!showLabel) return null;
            return (
              <Text
                key={`x-${index}`}
                style={[
                  styles.xAxisLabel,
                  { left: point.x - 18 }
                ]}
                numberOfLines={1}
              >
                {data[index]?.date}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { user, token, logout } = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [riskHistory, setRiskHistory] = useState<RiskHistoryItem[]>([]);
  const [riskHistoryError, setRiskHistoryError] = useState<string | null>(null);
  const [latestRisk, setLatestRisk] = useState<LatestRisk | null>(null);
  const [useRiskHistoryEndpoint, setUseRiskHistoryEndpoint] = useState(true);

  const loadRiskHistory = useCallback(async () => {
    if (!token) return;
    setRiskHistoryError(null);
    try {
      if (useRiskHistoryEndpoint) {
        const data = await apiFetch<RiskHistoryItem[]>('/diabetes-risk/history', { token });
        const sorted = [...data].filter((item) => item.created_at).sort((a, b) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return at - bt;
        });
        setRiskHistory(sorted);
        return;
      }
      throw new Error('History endpoint disabled');
    } catch (err: any) {
      setUseRiskHistoryEndpoint(false);
      const message = err?.message ?? 'Failed to load history';
      try {
        const metrics = await apiFetch<UserMetricItem[]>('/user-metrics', { token });
        const sorted = [...metrics].filter((item) => item.created_at).sort((a, b) => {
          const at = item.created_at ? new Date(item.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return at - bt;
        });
        const mapped: RiskHistoryItem[] = sorted.map((item) => {
          let bmi: number | null = null;
          if (item.weight_kg && item.height_cm) {
            const h = item.height_cm / 100;
            bmi = Number.isFinite(h) && h > 0 ? Math.round((item.weight_kg / (h * h)) * 10) / 10 : null;
          }
          return {
            record_id: item.metric_id,
            created_at: item.created_at ?? null,
            glucose_value: item.glucose_value ?? null,
            weight_kg: item.weight_kg ?? null,
            bmi,
            risk_score: null,
            risk_level: null,
          };
        });
        setRiskHistory(mapped);
        setRiskHistoryError(null);
        return;
      } catch (fallbackErr: any) {
        setRiskHistoryError(fallbackErr?.message ?? message);
        setRiskHistory([]);
        return;
      }
    }
  }, [token, useRiskHistoryEndpoint]);

  useEffect(() => {
    if (!token) {
      setRiskHistory([]);
      setRiskHistoryError(null);
      setLatestRisk(null);
      return;
    }
    loadRiskHistory();
  }, [token, loadRiskHistory]);

  const loadLatestRisk = useCallback(async () => {
    if (!token) return;
    try {
      const risk = await apiFetch<LatestRisk>('/diabetes-risk/latest', { token });
      setLatestRisk(risk);
    } catch {
      setLatestRisk({ risk_score: 0 });
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadRiskHistory();
      loadLatestRisk();
    }, [token, loadRiskHistory, loadLatestRisk])
  );

  useEffect(() => {
    if (token) loadLatestRisk();
  }, [token, loadLatestRisk]);

  const latestGlucose = useMemo(() => {
    const last = [...riskHistory].reverse().find((item) => typeof item.glucose_value === 'number');
    return typeof last?.glucose_value === 'number' ? last.glucose_value : null;
  }, [riskHistory]);

  const glucoseData = useMemo(() => {
    const filtered = riskHistory
      .filter((item) => typeof item.glucose_value === 'number')
      .slice(-10);
    return filtered.map((item) => ({
      value: item.glucose_value as number,
      glucose: item.glucose_value ?? undefined,
      bmi: item.bmi ?? undefined,
      weight: item.weight_kg ?? undefined,
      riskScore: item.risk_score ?? undefined,
      date: item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : ''
    }));
  }, [riskHistory]);

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
              <LineChart data={glucoseData} />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  {riskHistoryError ? riskHistoryError : 'Add glucose metrics to see trends.'}
                </Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartAxisLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B4332',
  },
  chartPlot: {
    height: 180,
    backgroundColor: '#F8FFFB',
    borderRadius: 16,
    position: 'relative',
    marginBottom: 12,
  },
  chartGrid: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 40,
    bottom: 40,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#E0E0E0',
    opacity: 0.5,
  },
  chartLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#0EA5A4',
    borderRadius: 2,
  },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#0EA5A4',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chartDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0EA5A4',
  },
  yAxisLabel: {
    position: 'absolute',
    left: 8,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  xAxisLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    height: 16,
  },
  xAxisLabel: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CDEFD8',
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  tooltipTitle: {
    fontSize: 11,
    color: '#1B4332',
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 11,
    color: '#3B7C5B',
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
