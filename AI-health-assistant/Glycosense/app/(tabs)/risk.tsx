import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Field } from '@/components/form/field';
import { OptionGroup } from '@/components/form/option-group';
import { Section } from '@/components/form/section';
import { AppHeader } from '@/components/app-header';
import { DrawerMenu } from '@/components/drawer-menu';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { Link } from 'expo-router';

type RiskResult = {
  risk_score: number;
  risk_level: string;
  record_id: number;
  derived_metrics?: {
    bmi?: number;
    bmi_category?: string;
  };
  percentage_breakdown?: Record<string, number>;
  comparison?: {
    previous_record_id: number;
    previous_risk_score: number;
    current_risk_score: number;
    delta: number;
    direction: string;
    reasons: string[];
  };
};

export default function RiskScreen() {
  const { token, user } = useAuth();
  const { mode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [glucose, setGlucose] = useState('120');
  const [age, setAge] = useState('32');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');
  const [familyHistory, setFamilyHistory] = useState('no');

  const [measurementContext, setMeasurementContext] = useState('fasting');
  const [trend, setTrend] = useState('stable');
  const [symptoms, setSymptoms] = useState('none');
  const [medicationType, setMedicationType] = useState('none');
  const [mealType, setMealType] = useState('moderate');
  const [physicalActivity, setPhysicalActivity] = useState('moderate');
  const [diabetesStatus, setDiabetesStatus] = useState('none');

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [saveMetrics, setSaveMetrics] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'risk' | 'explanation' | 'recommendations'>('risk');

  const isDark = mode === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const canSubmit = useMemo(() => Boolean(token && user), [token, user]);

  const submit = async () => {
    if (!token || !user) {
      Alert.alert('Sign in required', 'Please sign in before running a risk check.');
      return;
    }
    setBusy(true);
    setResult(null);
    setExplanation(null);
    setSummary(null);
    setRecommendations(null);
    try {
      const payload = {
        user_id: user.id,
        glucose_value: Number(glucose),
        measurement_context: measurementContext,
        trend,
        symptoms,
        medication_type: medicationType,
        meal_type: mealType,
        diabetes_status: diabetesStatus,
        age: Number(age),
        weight_kg: Number(weight),
        height_cm: Number(height),
        family_history: familyHistory === 'yes',
        physical_activity: physicalActivity,
      };

      const risk = await apiFetch<RiskResult>('/diabetes-risk', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
      setResult(risk);

      // Auto-fetch explanation and recommendations
      const [explainRes, recRes] = await Promise.all([
        apiFetch<{ summary: string; explanation: string }>('/explain-diabetes', {
          method: 'POST',
          body: JSON.stringify({ risk_level: risk.risk_level, risk_score: risk.risk_score }),
        }),
        apiFetch<{ recommendations: string[] }>('/diabetes-recommendations', {
          method: 'POST',
          token,
          body: JSON.stringify({ risk_level: risk.risk_level, risk_score: risk.risk_score }),
        }),
      ]);
      setExplanation(explainRes.explanation);
      setSummary(explainRes.summary);
      setRecommendations(recRes.recommendations ?? []);
      setShowModal(true);

      if (saveMetrics) {
        await apiFetch('/user-metrics', {
          method: 'POST',
          token,
          body: JSON.stringify({
            disease_type: 'diabetes',
            glucose_value: payload.glucose_value,
            measurement_context: payload.measurement_context,
            trend: payload.trend,
            symptoms: payload.symptoms,
            medication_type: payload.medication_type,
            meal_type: payload.meal_type,
            diabetes_status: payload.diabetes_status,
            age: payload.age,
            weight_kg: payload.weight_kg,
            height_cm: payload.height_cm,
            physical_activity: payload.physical_activity,
            family_history: payload.family_history,
          }),
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to calculate risk');
    } finally {
      setBusy(false);
    }
  };

  const fetchExplanation = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const explain = await apiFetch<{ summary: string; explanation: string }>(
        '/explain-diabetes',
        {
          method: 'POST',
          body: JSON.stringify({
            risk_level: result.risk_level,
            risk_score: result.risk_score,
          }),
        }
      );
      setExplanation(explain.explanation);
      setSummary(explain.summary);
    } catch (err: any) {
      setExplanation('Unable to fetch explanation at this time.');
    } finally {
      setBusy(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!result || !token) return;
    setBusy(true);
    try {
      const rec = await apiFetch<{ recommendations: string[] }>(
        '/diabetes-recommendations',
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            risk_level: result.risk_level,
            risk_score: result.risk_score,
          }),
        }
      );
      setRecommendations(rec.recommendations ?? []);
    } catch (err: any) {
      setRecommendations(['Unable to fetch recommendations at this time.']);
    } finally {
      setBusy(false);
    }
  };

  const PieChart = ({ score }: { score: number }) => {
    const size = 160;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const remaining = circumference - progress;

    const getColor = () => {
      if (score < 30) return '#16A34A';
      if (score < 60) return '#F59E0B';
      return '#DC2626';
    };

    return (
      <View style={styles.pieContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? '#374151' : '#E5E7EB'}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getColor()}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress} ${remaining}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.pieCenter}>
          <Text style={styles.pieScore}>{score}</Text>
          <Text style={styles.pieLabel}>Risk Score</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader onMenuPress={() => setMenuOpen(true)} />
        
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>Glycosense</Text>
          <Text style={styles.title}>Diabetes Risk Check</Text>
          <Text style={styles.subtitle}>Assess your current risk profile.</Text>
        </View>

        {!canSubmit && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Sign in to run risk checks.</Text>
            <Link href="/(tabs)/profile" asChild>
              <Pressable style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Go to Profile</Text>
              </Pressable>
            </Link>
          </View>
        )}

      <Section title="Glucose">
        <Field
          label="Glucose (mg/dL)"
          value={glucose}
          onChangeText={setGlucose}
          keyboardType="numeric"
        />
        <OptionGroup
          label="Measurement Context"
          value={measurementContext}
          onChange={setMeasurementContext}
          options={[
            { label: 'Fasting', value: 'fasting' },
            { label: 'Before Meal', value: 'before_meal' },
            { label: 'After Meal', value: 'after_meal' },
          ]}
        />
        <OptionGroup
          label="Trend"
          value={trend}
          onChange={setTrend}
          options={[
            { label: 'Rising', value: 'rising' },
            { label: 'Stable', value: 'stable' },
            { label: 'Falling', value: 'falling' },
          ]}
        />
      </Section>

      <Section title="Symptoms & Treatment">
        <OptionGroup
          label="Symptoms"
          value={symptoms}
          onChange={setSymptoms}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Mild', value: 'mild' },
            { label: 'Severe', value: 'severe' },
          ]}
        />
        <OptionGroup
          label="Medication"
          value={medicationType}
          onChange={setMedicationType}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Oral', value: 'oral' },
            { label: 'Insulin', value: 'insulin' },
          ]}
        />
        <OptionGroup
          label="Meal Type"
          value={mealType}
          onChange={setMealType}
          options={[
            { label: 'Healthy', value: 'healthy' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Unhealthy', value: 'unhealthy' },
          ]}
        />
      </Section>

      <Section title="Baseline Health">
        <OptionGroup
          label="Diabetes Status"
          value={diabetesStatus}
          onChange={setDiabetesStatus}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Prediabetes', value: 'prediabetes' },
            { label: 'Type 2', value: 'type_2' },
            { label: 'Type 1', value: 'type_1' },
          ]}
        />
        <OptionGroup
          label="Physical Activity"
          value={physicalActivity}
          onChange={setPhysicalActivity}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Light', value: 'light' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Intense', value: 'intense' },
          ]}
        />
      </Section>

      <Section title="Body Metrics">
        <Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
        <Field
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
        <Field
          label="Height (cm)"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />
        <OptionGroup
          label="Family History"
          value={familyHistory}
          onChange={setFamilyHistory}
          options={[
            { label: 'No', value: 'no' },
            { label: 'Yes', value: 'yes' },
          ]}
        />
      </Section>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Save as metrics</Text>
        <Pressable
          onPress={() => setSaveMetrics((prev) => !prev)}
          style={[styles.toggle, saveMetrics && styles.toggleActive]}>
          <Text style={[styles.toggleText, saveMetrics && styles.toggleTextActive]}>
            {saveMetrics ? 'On' : 'Off'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || busy) && styles.buttonDisabled]}
        onPress={submit}
        disabled={!canSubmit || busy}>
        <Text style={styles.primaryButtonText}>{busy ? 'Calculating...' : 'Calculate Risk'}</Text>
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Risk Assessment Results</Text>
                <Pressable onPress={() => setShowModal(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              {result && (
                <>
                  <View style={styles.tabContainer}>
                    <Pressable
                      style={[styles.tab, activeSection === 'risk' && styles.tabActive]}
                      onPress={() => setActiveSection('risk')}
                    >
                      <Text style={[styles.tabText, activeSection === 'risk' && styles.tabTextActive]}>
                        Risk Score
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, activeSection === 'explanation' && styles.tabActive]}
                      onPress={() => setActiveSection('explanation')}
                    >
                      <Text style={[styles.tabText, activeSection === 'explanation' && styles.tabTextActive]}>
                        Explanation
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tab, activeSection === 'recommendations' && styles.tabActive]}
                      onPress={() => setActiveSection('recommendations')}
                    >
                      <Text style={[styles.tabText, activeSection === 'recommendations' && styles.tabTextActive]}>
                        Recommendations
                      </Text>
                    </Pressable>
                  </View>

                  {activeSection === 'risk' && (
                    <View style={styles.modalSection}>
                      <PieChart score={result.risk_score} />
                      <View style={styles.riskInfo}>
                        <Text style={styles.riskLevel}>Risk Level: {result.risk_level}</Text>
                        {result.derived_metrics?.bmi && (
                          <Text style={styles.riskDetail}>
                            BMI: {result.derived_metrics.bmi} ({result.derived_metrics.bmi_category})
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {activeSection === 'explanation' && (
                    <View style={styles.modalSection}>
                      {summary && <Text style={styles.summaryText}>{summary}</Text>}
                      {explanation && <Text style={styles.explanationText}>{explanation}</Text>}
                      <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerText}>
                          ⚠️ Disclaimer: This assessment is for informational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for proper diagnosis and treatment.
                        </Text>
                      </View>
                    </View>
                  )}

                  {activeSection === 'recommendations' && (
                    <View style={styles.modalSection}>
                      {recommendations && recommendations.length > 0 ? (
                        recommendations.map((rec, idx) => (
                          <View key={idx} style={styles.recommendationItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.recommendationText}>{rec}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.explanationText}>No specific recommendations available.</Text>
                      )}
                      <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerText}>
                          ⚠️ Disclaimer: These recommendations are general guidelines. Always consult with your healthcare provider before making any changes to your diet, exercise, or medication regimen.
                        </Text>
                      </View>
                    </View>
                  )}

                  <Pressable
                    style={styles.modalButton}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
    gap: 18,
  },
  headerRow: {
    gap: 6,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  subtitle: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  banner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5C2C2',
    gap: 8,
  },
  bannerText: {
    color: '#991B1B',
    fontWeight: '600',
  },
  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991B1B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0EA5A4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
  },
  toggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
  },
  toggleActive: {
    backgroundColor: '#0EA5A4',
    borderColor: '#0EA5A4',
  },
  toggleText: {
    fontSize: 12,
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  toggleTextActive: {
    color: '#fff',
  },
  resultCard: {
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#3B7C5B',
    textTransform: 'uppercase',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  resultHint: {
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  compBlock: {
    gap: 6,
  },
  compReason: {
    color: isDark ? '#9CA3AF' : '#2D6A4F',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: isDark ? '#1F2937' : '#F8FFFB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#CDEFD8',
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#374151' : '#F8FFFB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#0EA5A4',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  modalSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 16,
  },
  pieContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  pieCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieScore: {
    fontSize: 36,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  pieLabel: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#4F856A',
    marginTop: 4,
  },
  riskInfo: {
    alignItems: 'center',
    gap: 8,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
  },
  riskDetail: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#E5E7EB' : '#1B4332',
    marginBottom: 12,
    lineHeight: 22,
  },
  explanationText: {
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#0EA5A4',
    marginRight: 12,
    fontWeight: '700',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#9CA3AF' : '#4F856A',
    lineHeight: 22,
  },
  disclaimer: {
    backgroundColor: isDark ? '#374151' : '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: isDark ? '#4B5563' : '#FDE68A',
  },
  disclaimerText: {
    fontSize: 12,
    color: isDark ? '#9CA3AF' : '#92400E',
    lineHeight: 18,
  },
  modalButton: {
    backgroundColor: '#0EA5A4',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
