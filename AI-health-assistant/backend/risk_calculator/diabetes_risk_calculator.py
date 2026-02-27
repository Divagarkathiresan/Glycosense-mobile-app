from typing import Dict, Any


# ============================================================
# RISK SCORE CALCULATOR
# ============================================================

def calculate_risk_score(
    glucose_value: float,
    measurement_context: str,
    trend: str,
    symptoms: str,
    medication_type: str,
    meal_type: str,
    diabetes_status: str,
    age: int,
    weight_kg: float,
    height_cm: float,
    family_history: bool,
    physical_activity: str
) -> Dict[str, Any]:

    total_score = 0

    # ============================================================
    # 1️⃣ IMMEDIATE GLYCEMIC RISK
    # ============================================================

    if measurement_context == "fasting":
        if glucose_value < 100:
            glucose_points = 0
        elif glucose_value <= 125:
            glucose_points = 8
        elif glucose_value <= 160:
            glucose_points = 15
        else:
            glucose_points = 25
    else:  # before_meal, after_meal
        if glucose_value < 140:
            glucose_points = 0
        elif glucose_value <= 180:
            glucose_points = 8
        elif glucose_value <= 250:
            glucose_points = 15
        else:
            glucose_points = 25

    trend_points = {
        "rising": 15,
        "stable": 5,
        "falling": 0
    }.get(trend, 5)

    immediate_glycemic_risk = glucose_points + trend_points
    total_score += immediate_glycemic_risk


    # ============================================================
    # 2️⃣ TREATMENT & SYMPTOMS
    # ============================================================

    symptom_points = {
        "none": 0,
        "mild": 8,
        "severe": 15
    }.get(symptoms, 0)

    medication_points = {
        "none": 0,
        "oral": 5,
        "insulin": 10
    }.get(medication_type, 0)

    meal_points = {
        "healthy": 0,
        "moderate": 2,
        "unhealthy": 5
    }.get(meal_type, 2)

    treatment_symptom_risk = symptom_points + medication_points + meal_points
    total_score += treatment_symptom_risk


    # ============================================================
    # 3️⃣ BASELINE VULNERABILITY
    # ============================================================

    diabetes_points = {
        "none": 0,
        "prediabetes": 4,
        "type_2": 7,
        "type_1": 10
    }.get(diabetes_status, 0)

    age_points = 0 if age < 30 else (2 if age <= 45 else 5)

    # ---- BMI Calculation (Safe) ----
    height_m = max(height_cm / 100, 0.1)
    bmi = weight_kg / (height_m ** 2)

    if bmi < 18.5:
        bmi_points = 0
        bmi_category = "underweight"
    elif bmi < 25:
        bmi_points = 0
        bmi_category = "normal"
    elif bmi < 30:
        bmi_points = 2
        bmi_category = "overweight"
    else:
        bmi_points = 5
        bmi_category = "obese"

    family_points = 5 if family_history else 0

    activity_points = {
        "none": 5,
        "light": 2,
        "moderate": 0,
        "intense": 0
    }.get(physical_activity, 2)

    baseline_risk = (
        diabetes_points +
        age_points +
        bmi_points +
        family_points +
        activity_points
    )

    total_score += baseline_risk

    # Cap at 100
    total_score = min(total_score, 100)


    # ============================================================
    # RISK LEVEL CLASSIFICATION
    # ============================================================

    if total_score <= 25:
        risk_level = "Low Risk"
    elif total_score <= 50:
        risk_level = "Moderate Risk"
    elif total_score <= 75:
        risk_level = "High Risk"
    else:
        risk_level = "Critical Risk"


    # ============================================================
    # SAFE PERCENTAGE BREAKDOWN
    # ============================================================

    def safe_percent(value):
        return round((value / total_score) * 100, 1) if total_score > 0 else 0


    return {
        "risk_score": total_score,
        "risk_level": risk_level,
        "derived_metrics": {
            "bmi": round(bmi, 2),
            "bmi_category": bmi_category
        },
        "breakdown": {
            "immediate_glycemic_risk": immediate_glycemic_risk,
            "treatment_symptom_risk": treatment_symptom_risk,
            "baseline_vulnerability_risk": baseline_risk
        },
        "percentage_breakdown": {
            "immediate_glycemic_percentage": safe_percent(immediate_glycemic_risk),
            "treatment_symptom_percentage": safe_percent(treatment_symptom_risk),
            "baseline_vulnerability_percentage": safe_percent(baseline_risk)
        },
        "attribution": {
            "immediate_glycemic": {
                "glucose_context": measurement_context,
                "glucose_value": glucose_value,
                "trend": trend
            },
            "treatment_symptoms": {
                "symptoms": symptoms,
                "medication": medication_type,
                "meal_type": meal_type
            },
            "baseline": {
                "diabetes_status": diabetes_status,
                "age": age,
                "bmi_category": bmi_category,
                "family_history": family_history,
                "physical_activity": physical_activity
            }
        }
    }
