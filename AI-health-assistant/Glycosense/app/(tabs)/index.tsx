import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';

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

type ChartSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  key: string;
};

type ChartDatum = {
  value: number;
  date: string;
  glucose?: number;
  bmi?: number;
  weight?: number;
  riskScore?: number;
  riskLevel?: string | null;
};

function LineChart({
  data,
  styles,
  chartType = 'glucose',
}: {
  data: ChartDatum[];
  styles: any;
  chartType?: 'glucose' | 'risk';
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [drawProgress, setDrawProgress] = useState(1);
  const drawAnimation = React.useRef(new Animated.Value(0)).current;
  const glucoseLineColor = '#0EA5A4';
  const riskLineColor = '#F59E0B';
  const lineColor = chartType === 'risk' ? riskLineColor : glucoseLineColor;
  const getGlucoseStatus = useCallback((value?: number) => {
    if (typeof value !== 'number') {
      return { label: 'Unknown', color: '#64748B', iconName: 'help-circle-outline' as const };
    }
    if (value < 90) {
      return { label: 'Low', color: '#16A34A', iconName: 'arrow-down-circle-outline' as const };
    }
    if (value <= 140) {
      return { label: 'Normal', color: '#16A34A', iconName: 'check-circle-outline' as const };
    }
    if (value <= 180) {
      return { label: 'Elevated', color: '#F59E0B', iconName: 'alert-circle-outline' as const };
    }
    return { label: 'High', color: '#DC2626', iconName: 'close-circle-outline' as const };
  }, []);

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

  const visibleSegments = useMemo(() => {
    const segments: ChartSegment[] = points.slice(0, -1).map((point, index) => ({
      x1: point.x,
      y1: point.y,
      x2: points[index + 1].x,
      y2: points[index + 1].y,
      key: `line-${index}`,
    }));
    const visibleLength = drawProgress * segments.length;
    const fullCount = Math.floor(visibleLength);
    const partial = visibleLength - fullCount;
    const drawn = segments.slice(0, fullCount);
    if (partial > 0 && fullCount < segments.length) {
      const next = segments[fullCount];
      drawn.push({
        ...next,
        x2: next.x1 + (next.x2 - next.x1) * partial,
        y2: next.y1 + (next.y2 - next.y1) * partial,
        key: `${next.key}-partial`,
      });
    }
    return drawn;
  }, [points, drawProgress]);

  useEffect(() => {
    if (size.width === 0 || size.height === 0 || points.length <= 1) {
      setDrawProgress(1);
      return;
    }
    drawAnimation.setValue(0);
    const listener = drawAnimation.addListener(({ value }) => setDrawProgress(value));
    Animated.timing(drawAnimation, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      drawAnimation.removeListener(listener);
    };
  }, [points.length, chartType, size.width, size.height, drawAnimation]);

  return (
    <Pressable
      style={styles.chartPlot}
      onPress={() => setActiveIndex(null)}
    >
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
      
      {points.length > 1 && size.width > 0 && size.height > 0 && (
        <Svg
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {visibleSegments.map((segment) => {
            return (
              <Line
                key={segment.key}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={lineColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      )}

      {points.length > 0 && (
        <>
          {points.map((point, index) => {
            const pointProgress = points.length > 1 ? index / (points.length - 1) : 1;
            if (pointProgress > drawProgress) return null;
            return (
              <Pressable
                key={`dot-${index}`}
                style={[
                  styles.chartDot,
                  {
                    left: point.x - 5,
                    top: point.y - 5,
                    borderColor: lineColor,
                    shadowColor: lineColor,
                  },
                ]}
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation?.();
                  setActiveIndex(activeIndex === index ? null : index);
                }}
              >
                <View style={[styles.chartDotInner, { backgroundColor: lineColor }]} />
              </Pressable>
            );
          })}
        </>
      )}

      {activeIndex !== null && points[activeIndex] ? (
        (() => {
          const point = points[activeIndex];
          const datum = data[activeIndex];
          const glucoseStatus = getGlucoseStatus(datum.glucose);
          const tooltipWidth = 170;
          const left = Math.min(
            Math.max(point.x - tooltipWidth / 2, 8),
            Math.max(size.width - tooltipWidth - 8, 8)
          );
          const top = point.y < 60 ? point.y + 18 : point.y - 70;
          return (
            <View style={[styles.tooltip, { left, top }]}>
              <Text style={styles.tooltipTitle}>{datum.date}</Text>
              {chartType === 'glucose' ? (
                <>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name={glucoseStatus.iconName} size={12} color={glucoseStatus.color} style={styles.tooltipIcon} />
                    <Text style={[styles.tooltipText, { color: glucoseStatus.color }]}>
                      Glucose: {datum.glucose ?? '—'} mg/dL
                    </Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="chart-line" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>Risk score: {datum.riskScore ?? '—'}</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="compass-outline" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>Risk level: {datum.riskLevel ?? '—'}</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="calculator-variant-outline" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>BMI: {datum.bmi ?? '—'}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="chart-line" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>Risk score: {datum.riskScore ?? '—'}</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="compass-outline" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>Risk level: {datum.riskLevel ?? '—'}</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="water-outline" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>Glucose: {datum.glucose ?? '—'} mg/dL</Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <MaterialCommunityIcons name="calculator-variant-outline" size={12} color="#64748B" style={styles.tooltipIcon} />
                    <Text style={styles.tooltipText}>BMI: {datum.bmi ?? '—'}</Text>
                  </View>
                </>
              )}
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
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user, token, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [riskHistory, setRiskHistory] = useState<RiskHistoryItem[]>([]);
  const [riskHistoryError, setRiskHistoryError] = useState<string | null>(null);
  const [latestRisk, setLatestRisk] = useState<LatestRisk | null>(null);
  const [useRiskHistoryEndpoint, setUseRiskHistoryEndpoint] = useState(true);
  const menuAnimation = React.useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

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
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
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

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: optionsOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [optionsOpen, menuAnimation]);

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
      riskLevel: item.risk_level ?? null,
      date: item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : ''
    }));
  }, [riskHistory]);

  const riskScoreData = useMemo(() => {
    const filtered = riskHistory
      .filter((item) => typeof item.risk_score === 'number')
      .slice(-10);
    return filtered.map((item) => ({
      value: item.risk_score as number,
      glucose: item.glucose_value ?? undefined,
      bmi: item.bmi ?? undefined,
      weight: item.weight_kg ?? undefined,
      riskScore: item.risk_score ?? undefined,
      riskLevel: item.risk_level ?? null,
      date: item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '',
    }));
  }, [riskHistory]);

  const healthStats = useMemo(() => {
    const latest = riskHistory[riskHistory.length - 1];
    const avgGlucose = riskHistory.length > 0
      ? Math.round(riskHistory.reduce((sum, item) => sum + (item.glucose_value ?? 0), 0) / riskHistory.length)
      : 0;
    const avgBMI = riskHistory.filter(i => i.bmi).length > 0
      ? (riskHistory.reduce((sum, item) => sum + (item.bmi ?? 0), 0) / riskHistory.filter(i => i.bmi).length).toFixed(1)
      : null;
    return { latest, avgGlucose, avgBMI, totalRecords: riskHistory.length };
  }, [riskHistory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable style={styles.menuButton} onPress={() => setOptionsOpen((prev) => !prev)}>
              <View style={styles.menuIcon}>
                <Animated.View
                  style={[
                    styles.menuLine,
                    styles.menuLineTop,
                    {
                      transform: [
                        {
                          translateY: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-6, 0],
                          }),
                        },
                        {
                          rotate: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '45deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.menuLine,
                    {
                      opacity: menuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      transform: [
                        {
                          scaleX: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.4],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.menuLine,
                    styles.menuLineBottom,
                    {
                      transform: [
                        {
                          translateY: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [6, 0],
                          }),
                        },
                        {
                          rotate: menuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '-45deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </Pressable>
            <View style={styles.topBarRight}>
              <Pressable style={styles.themeToggle} onPress={toggleTheme}>
                <MaterialCommunityIcons
                  name={mode === 'light' ? 'moon-waning-crescent' : 'white-balance-sunny'}
                  size={20}
                  color={isDark ? '#E5E7EB' : '#1B4332'}
                  style={styles.themeIcon}
                />
              </Pressable>
              <View style={styles.userBadge}>
                <View style={styles.avatarCircle} />
                <Text style={styles.userName}>{user?.name ?? 'Guest'}</Text>
              </View>
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
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#0EA5A4' }]} />
                <Text style={styles.legendText}>Glucose (mg/dL)</Text>
              </View>
            </View>
            {glucoseData.length > 1 ? (
              <LineChart data={glucoseData} styles={styles} chartType="glucose" />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  {riskHistoryError ? riskHistoryError : 'Add glucose metrics to see trends.'}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.chartCard, styles.riskChartCard]}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartAxisLabel}>Risk Score Trend</Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Risk Score (0-100)</Text>
              </View>
            </View>
            {riskScoreData.length > 1 ? (
              <LineChart data={riskScoreData} styles={styles} chartType="risk" />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>
                  {riskHistoryError ? riskHistoryError : 'Complete risk assessments to see trends.'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Health Insights</Text>
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="chart-line" size={32} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.insightIcon} />
              <Text style={styles.insightLabel}>Avg Glucose</Text>
              <Text style={styles.insightValue}>{healthStats.avgGlucose} mg/dL</Text>
            </View>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="scale-bathroom" size={32} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.insightIcon} />
              <Text style={styles.insightLabel}>BMI</Text>
              <Text style={styles.insightValue}>{healthStats.avgBMI ?? '—'}</Text>
            </View>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons name="file-chart-outline" size={32} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.insightIcon} />
              <Text style={styles.insightLabel}>Records</Text>
              <Text style={styles.insightValue}>{healthStats.totalRecords}</Text>
            </View>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Quick Actions</Text>
            <Link href="/(tabs)/risk" asChild>
              <Pressable style={styles.actionButton}>
                <MaterialCommunityIcons name="stethoscope" size={28} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.actionIcon} />
                <View style={styles.actionContent}>
                  <Text style={styles.actionLabel}>New Risk Assessment</Text>
                  <Text style={styles.actionHint}>Check your diabetes risk</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </Pressable>
            </Link>
            <Link href="/(tabs)/metrics" asChild>
              <Pressable style={styles.actionButton}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.actionIcon} />
                <View style={styles.actionContent}>
                  <Text style={styles.actionLabel}>View All Metrics</Text>
                  <Text style={styles.actionHint}>See your health history</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </Pressable>
            </Link>
          </View>

          {healthStats.latest && (
            <View style={styles.recentCard}>
              <Text style={styles.recentTitle}>Latest Reading</Text>
              <View style={styles.recentRow}>
                <View style={styles.recentItem}>
                  <Text style={styles.recentLabel}>Glucose</Text>
                  <Text style={styles.recentValue}>{healthStats.latest.glucose_value ?? '—'} mg/dL</Text>
                </View>
                <View style={styles.recentItem}>
                  <Text style={styles.recentLabel}>Weight</Text>
                  <Text style={styles.recentValue}>{healthStats.latest.weight_kg ?? '—'} kg</Text>
                </View>
                <View style={styles.recentItem}>
                  <Text style={styles.recentLabel}>BMI</Text>
                  <Text style={styles.recentValue}>{healthStats.latest.bmi ?? '—'}</Text>
                </View>
              </View>
              <Text style={styles.recentDate}>
                {healthStats.latest.created_at
                  ? new Date(healthStats.latest.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No date'}
              </Text>
            </View>
          )}
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
                  <MaterialCommunityIcons name="home-outline" size={22} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.optionIcon} />
                  <Text style={styles.optionText}>Dashboard</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/risk" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <MaterialCommunityIcons name="stethoscope" size={22} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.optionIcon} />
                  <Text style={styles.optionText}>Risk Assessment</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/metrics" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <MaterialCommunityIcons name="chart-line" size={22} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.optionIcon} />
                  <Text style={styles.optionText}>My Metrics</Text>
                </Pressable>
              </Link>

              <Link href="/(tabs)/profile" asChild>
                <Pressable style={styles.optionButton} onPress={() => setOptionsOpen(false)}>
                  <MaterialCommunityIcons name="account-outline" size={22} color={isDark ? '#E5E7EB' : '#1B4332'} style={styles.optionIcon} />
                  <Text style={styles.optionText}>Profile</Text>
                </Pressable>
              </Link>

              <View style={styles.divider} />

              <Pressable style={styles.logoutButton} onPress={() => { logout(); setOptionsOpen(false); }}>
                <MaterialCommunityIcons name="logout" size={22} color="#FFFFFF" style={styles.logoutIcon} />
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

const createStyles = (isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isDark ? '#1F2937' : '#E9F7EF',
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? '#000' : '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  themeIcon: {
    fontSize: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? '#000' : '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  menuIcon: {
    width: 20,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: isDark ? '#E5E7EB' : '#1B4332',
    borderRadius: 1,
    position: 'absolute',
    top: 7,
  },
  menuLineTop: {},
  menuLineBottom: {},
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? '#4B5563' : '#CDEFD8',
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    color: isDark ? '#E5E7EB' : '#1B4332',
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
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  brand: {
    fontSize: 34,
    color: isDark ? '#E5E7EB' : '#1B4332',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderRadius: 20,
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  statLabel: {
    fontSize: 16,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    color: isDark ? '#E5E7EB' : '#1B4332',
    fontWeight: '700',
  },
  statHint: {
    marginTop: 4,
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    textTransform: 'uppercase',
  },
  chartCard: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  riskChartCard: {
    marginTop: 16,
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
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: isDark ? '#9CA3AF' : '#4F856A',
    fontWeight: '600',
  },
  chartPlot: {
    height: 180,
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
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
    backgroundColor: isDark ? '#4B5563' : '#E0E0E0',
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
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
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
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    shadowColor: isDark ? '#000' : '#1B4332',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 20,
  },
  tooltipTitle: {
    fontSize: 11,
    color: isDark ? '#E5E7EB' : '#1B4332',
    fontWeight: '700',
    marginBottom: 4,
  },
  tooltipText: {
    fontSize: 11,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  tooltipIcon: {
    marginRight: 6,
  },
  chartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chartEmptyText: {
    color: isDark ? '#9CA3AF' : '#4F856A',
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  insightIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  actionCard: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 2,
  },
  actionHint: {
    fontSize: 13,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  actionArrow: {
    fontSize: 24,
    color: isDark ? '#9CA3AF' : '#0EA5A4',
    fontWeight: '600',
  },
  recentCard: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 16,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentItem: {
    flex: 1,
    alignItems: 'center',
  },
  recentLabel: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginBottom: 6,
  },
  recentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  recentDate: {
    fontSize: 13,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
    textAlign: 'center',
    marginTop: 8,
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
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
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
    backgroundColor: isDark ? '#374151' : '#F4F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: isDark ? '#E5E7EB' : '#0F172A',
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
    backgroundColor: isDark ? '#374151' : '#E2E8F0',
    marginVertical: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: isDark ? '#374151' : '#F4F9F9',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: isDark ? '#E5E7EB' : '#0F172A',
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
