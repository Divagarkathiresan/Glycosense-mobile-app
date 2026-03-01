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

type RiskAnalysis = {
  risk_score: number;
  risk_level: string;
  recommendations?: string[];
  explanation?: string;
};

export default function MetricsScreen() {
  const { token, user, loading } = useAuth();
  const { mode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState<Metric[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [riskData, setRiskData] = useState<Record<number, RiskAnalysis>>({});
  const [loadingRisk, setLoadingRisk] = useState<number | null>(null);

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
            items.map((item) => {
              const isExpanded = expandedId === item.metric_id;
              const bmi = item.weight_kg && item.height_cm
                ? (item.weight_kg / Math.pow(item.height_cm / 100, 2)).toFixed(1)
                : null;
              const risk = riskData[item.metric_id];
              const isLoadingRisk = loadingRisk === item.metric_id;

              const handleCardPress = async () => {
                if (isExpanded) {
                  setExpandedId(null);
                } else {
                  setExpandedId(item.metric_id);
                  if (!risk && token && user) {
                    setLoadingRisk(item.metric_id);
                    try {
                      const payload = {
                        user_id: user.id,
                        glucose_value: item.glucose_value,
                        measurement_context: item.measurement_context,
                        trend: item.trend,
                        symptoms: item.symptoms,
                        medication_type: item.medication_type,
                        meal_type: item.meal_type,
                        diabetes_status: item.diabetes_status,
                        age: item.age,
                        weight_kg: item.weight_kg,
                        height_cm: item.height_cm,
                        family_history: item.family_history,
                        physical_activity: item.physical_activity,
                      };
                      const riskRes = await apiFetch<{ risk_score: number; risk_level: string }>('/diabetes-risk', {
                        method: 'POST',
                        token,
                        body: JSON.stringify(payload),
                      });
                      const [explainRes, recRes] = await Promise.all([
                        apiFetch<{ explanation: string }>('/explain-diabetes', {
                          method: 'POST',
                          body: JSON.stringify({ risk_level: riskRes.risk_level, risk_score: riskRes.risk_score }),
                        }),
                        apiFetch<{ recommendations: string[] }>('/diabetes-recommendations', {
                          method: 'POST',
                          token,
                          body: JSON.stringify({ risk_level: riskRes.risk_level, risk_score: riskRes.risk_score }),
                        }),
                      ]);
                      setRiskData(prev => ({
                        ...prev,
                        [item.metric_id]: {
                          risk_score: riskRes.risk_score,
                          risk_level: riskRes.risk_level,
                          explanation: explainRes.explanation,
                          recommendations: recRes.recommendations,
                        },
                      }));
                    } catch (err) {
                      console.error('Failed to fetch risk analysis:', err);
                    } finally {
                      setLoadingRisk(null);
                    }
                  }
                }
              };
              
              return (
                <Pressable
                  key={item.metric_id}
                  style={[styles.card, isExpanded && styles.cardExpanded]}
                  onPress={handleCardPress}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.cardIcon}>🩺</Text>
                      <View>
                        <Text style={styles.cardTitle}>{item.disease_type}</Text>
                        <Text style={styles.cardDate}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Unknown date'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.mainMetric}>
                      <Text style={styles.mainLabel}>Glucose Level</Text>
                      <Text style={styles.mainValue}>{item.glucose_value ?? '—'} mg/dL</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.divider} />

                      {isLoadingRisk ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="large" color="#0EA5A4" />
                          <Text style={styles.loadingText}>Analyzing risk...</Text>
                        </View>
                      ) : risk ? (
                        <>
                          <View style={styles.riskSection}>
                            <View style={styles.riskHeader}>
                              <Text style={styles.riskIcon}>⚕️</Text>
                              <View style={styles.riskHeaderText}>
                                <Text style={styles.riskTitle}>Risk Analysis</Text>
                                <Text style={[styles.riskLevel, { color: risk.risk_score < 30 ? '#16A34A' : risk.risk_score < 60 ? '#F59E0B' : '#DC2626' }]}>
                                  {risk.risk_level}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.riskScoreContainer}>
                              <View style={[styles.riskScoreBadge, { backgroundColor: risk.risk_score < 30 ? '#DCFCE7' : risk.risk_score < 60 ? '#FEF3C7' : '#FEE2E2' }]}>
                                <Text style={[styles.riskScoreText, { color: risk.risk_score < 30 ? '#16A34A' : risk.risk_score < 60 ? '#F59E0B' : '#DC2626' }]}>
                                  {risk.risk_score}
                                </Text>
                                <Text style={[styles.riskScoreLabel, { color: risk.risk_score < 30 ? '#16A34A' : risk.risk_score < 60 ? '#F59E0B' : '#DC2626' }]}>
                                  Risk Score
                                </Text>
                              </View>
                            </View>
                            {risk.explanation && (
                              <View style={styles.explanationBox}>
                                <Text style={styles.explanationTitle}>💡 Explanation</Text>
                                <Text style={styles.explanationText}>{risk.explanation}</Text>
                              </View>
                            )}
                            {risk.recommendations && risk.recommendations.length > 0 && (
                              <View style={styles.recommendationsBox}>
                                <Text style={styles.recommendationsTitle}>✨ Recommendations</Text>
                                {risk.recommendations.map((rec, idx) => (
                                  <View key={idx} style={styles.recommendationItem}>
                                    <Text style={styles.recommendationBullet}>•</Text>
                                    <Text style={styles.recommendationText}>{rec}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                          <View style={styles.divider} />
                        </>
                      ) : null}

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>📊 Glucose Details</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Context:</Text>
                          <Text style={styles.detailValue}>{item.measurement_context ?? '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Trend:</Text>
                          <Text style={styles.detailValue}>{item.trend ?? '—'}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>🍽️ Lifestyle</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Meal Type:</Text>
                          <Text style={styles.detailValue}>{item.meal_type ?? '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Physical Activity:</Text>
                          <Text style={styles.detailValue}>{item.physical_activity ?? '—'}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>💊 Health Status</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Symptoms:</Text>
                          <Text style={styles.detailValue}>{item.symptoms ?? '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Medication:</Text>
                          <Text style={styles.detailValue}>{item.medication_type ?? '—'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Diabetes Status:</Text>
                          <Text style={styles.detailValue}>{item.diabetes_status ?? '—'}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>📏 Body Metrics</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Age:</Text>
                          <Text style={styles.detailValue}>{item.age ?? '—'} years</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Weight:</Text>
                          <Text style={styles.detailValue}>{item.weight_kg ?? '—'} kg</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Height:</Text>
                          <Text style={styles.detailValue}>{item.height_cm ?? '—'} cm</Text>
                        </View>
                        {bmi && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>BMI:</Text>
                            <Text style={styles.detailValue}>{bmi}</Text>
                          </View>
                        )}
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Family History:</Text>
                          <Text style={styles.detailValue}>{item.family_history ? 'Yes' : 'No'}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })
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
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardExpanded: {
    borderColor: '#0EA5A4',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    textTransform: 'capitalize',
  },
  cardDate: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: '#0EA5A4',
    fontWeight: '700',
  },
  cardMain: {
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
    borderRadius: 12,
    padding: 16,
  },
  mainMetric: {
    alignItems: 'center',
  },
  mainLabel: {
    fontSize: 13,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginBottom: 6,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? '#4B5563' : '#E5E7EB',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
    borderRadius: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
    textTransform: 'capitalize',
  },
  errorText: {
    color: '#991B1B',
  },
  emptyText: {
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
    fontWeight: '600',
  },
  riskSection: {
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  riskIcon: {
    fontSize: 36,
  },
  riskHeaderText: {
    flex: 1,
  },
  riskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 4,
  },
  riskLevel: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  riskScoreBadge: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  riskScoreText: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4,
  },
  riskScoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  explanationBox: {
    backgroundColor: isDark ? '#1F2937' : '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5A4',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
    color: isDark ? '#D1D5DB' : '#374151',
  },
  recommendationsBox: {
    backgroundColor: isDark ? '#1F2937' : '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '700',
    marginTop: 1,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: isDark ? '#D1D5DB' : '#374151',
  },
});
