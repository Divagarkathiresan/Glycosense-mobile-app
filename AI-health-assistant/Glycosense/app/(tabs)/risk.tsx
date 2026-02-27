import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/form/field';
import { OptionGroup } from '@/components/form/option-group';
import { Section } from '@/components/form/section';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth';
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
      Alert.alert('Error', err.message ?? 'Failed to get explanation');
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
      Alert.alert('Error', err.message ?? 'Failed to get recommendations');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Diabetes Risk Check</Text>
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
        <Text style={styles.primaryButtonText}>{busy ? 'Working...' : 'Calculate Risk'}</Text>
      </Pressable>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Result</Text>
          <Text style={styles.resultValue}>
            Risk Score: {result.risk_score} ({result.risk_level})
          </Text>
          {result.derived_metrics?.bmi ? (
            <Text style={styles.resultHint}>
              BMI: {result.derived_metrics.bmi} ({result.derived_metrics.bmi_category})
            </Text>
          ) : null}
          {result.comparison ? (
            <View style={styles.compBlock}>
              <Text style={styles.resultHint}>
                Change: {result.comparison.direction} ({result.comparison.delta})
              </Text>
              {result.comparison.reasons?.slice(0, 3).map((r, idx) => (
                <Text key={idx} style={styles.compReason}>
                  • {r}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={fetchExplanation} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Explain</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={fetchRecommendations} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Recommendations</Text>
            </Pressable>
          </View>
        </View>
      )}

      {summary ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Summary</Text>
          <Text style={styles.resultHint}>{summary}</Text>
        </View>
      ) : null}

      {explanation ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Explanation</Text>
          <Text style={styles.resultHint}>{explanation}</Text>
        </View>
      ) : null}

      {recommendations ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Recommendations</Text>
          {recommendations.length === 0 ? (
            <Text style={styles.resultHint}>No recommendations returned.</Text>
          ) : (
            recommendations.map((rec, idx) => (
              <Text key={idx} style={styles.compReason}>
                • {rec}
              </Text>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
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
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
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
    color: '#374151',
  },
  toggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toggleActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  toggleText: {
    fontSize: 12,
    color: '#111827',
  },
  toggleTextActive: {
    color: '#fff',
  },
  resultCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultHint: {
    color: '#4b5563',
  },
  compBlock: {
    gap: 6,
  },
  compReason: {
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: '#0f172a',
  },
});
