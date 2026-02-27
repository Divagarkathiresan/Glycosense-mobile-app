# ============================================================
# Clinical Grade Explainable AI Engine
# Doctor-Style Explanations
# ============================================================

from typing import Dict


def generate_summary(data: Dict) -> str:
    """Generate a clinically structured risk summary."""
    risk_score = data.get("risk_score", 0)

    if risk_score <= 25:
        return f"Diabetes Risk Score: {risk_score}/100. Clinical assessment indicates Low Risk."
    elif risk_score <= 50:
        return f"Diabetes Risk Score: {risk_score}/100. Clinical assessment indicates Moderate Risk."
    elif risk_score <= 75:
        return f"Diabetes Risk Score: {risk_score}/100. Clinical assessment indicates High Risk. Preventive intervention is recommended."
    else:
        return f"Diabetes Risk Score: {risk_score}/100. Clinical assessment indicates Critical Risk. Immediate medical evaluation is advised."


def generate_explanation(data: Dict) -> Dict:
    risk_score = data.get("risk_score", 0)
    risk_level = data.get("risk_level", "Unknown")
    attribution = data.get("attribution", {})
    derived = data.get("derived_metrics", {})

    explanations = []

    # ---------------------------
    # Extract Clinical Inputs
    # ---------------------------

    gly = attribution.get("immediate_glycemic", {})
    glucose = gly.get("glucose_value", 0)
    context = gly.get("glucose_context", "")
    trend = gly.get("trend", "")

    treat = attribution.get("treatment_symptoms", {})
    meal = treat.get("meal_type", "")
    symptoms = treat.get("symptoms", "")
    medication = treat.get("medication", "")

    baseline = attribution.get("baseline", {})
    bmi = derived.get("bmi", 0)
    bmi_cat = baseline.get("bmi_category", "")
    activity = baseline.get("physical_activity", "")
    status = baseline.get("diabetes_status", "")
    family_history = baseline.get("family_history", False)

    # ============================================================
    # 1. BLOOD SUGAR EXPLANATION (SIMPLE LANGUAGE)
    # ============================================================

    if context == "fasting":
        if glucose < 100:
            explanations.append(
                f"Your fasting sugar is {glucose} mg/dL. This is in a healthy range for fasting sugar."
            )
        elif 100 <= glucose <= 125:
            explanations.append(
                f"Your fasting sugar is {glucose} mg/dL. This is higher than normal and falls in the prediabetes range (100-125 mg/dL), which means the body is starting to have difficulty handling sugar."
            )
        else:
            explanations.append(
                f"Your fasting sugar is {glucose} mg/dL. This is in the diabetes range (126 mg/dL or above), meaning blood sugar is staying high instead of moving into cells normally."
            )
    else:
        meal_context = {
            "high-carb": "after a high-carbohydrate meal",
            "balanced": "after a balanced meal",
            "low-carb": "after a low-carbohydrate meal"
        }.get(meal, "after meals")

        if glucose < 140:
            explanations.append(
                f"Your sugar after food is {glucose} mg/dL {meal_context}. This is in a good post-meal range (below 140 mg/dL)."
            )
        elif 140 <= glucose <= 180:
            explanations.append(
                f"Your sugar after food is {glucose} mg/dL {meal_context}. This is above the ideal range, showing a moderate sugar rise after meals."
            )
        else:
            explanations.append(
                f"Your sugar after food is {glucose} mg/dL {meal_context}. This is quite high, which means your body is under sugar stress after meals."
            )

    # ============================================================
    # 2. TREND EXPLANATION
    # ============================================================

    if trend == "improving":
        explanations.append(
            "Your recent readings are improving. This usually means your current routine is helping your sugar control."
        )
    elif trend == "worsening":
        explanations.append(
            "Your recent readings are getting worse. Over time, this can affect the eyes, kidneys, nerves, heart, and blood vessels."
        )
    elif trend == "stable" and glucose >= 140:
        explanations.append(
            "Your readings are stable, but still higher than healthy. This means sugar is staying high in a steady way."
        )

    # ============================================================
    # 3. WEIGHT / ACTIVITY EXPLANATION
    # ============================================================

    if bmi_cat == "obese":
        explanations.append(
            f"Your body weight measure (BMI) is {bmi}, which is in the obese range. Extra body weight often makes sugar control harder."
        )
    elif bmi_cat == "overweight":
        explanations.append(
            f"Your BMI is {bmi}, which is in the overweight range. This can raise the chance of higher sugar over time."
        )
    elif bmi_cat == "normal":
        explanations.append(
            f"Your BMI is {bmi}, which is in the normal range. This is a positive factor for sugar health."
        )
    elif bmi_cat == "underweight":
        explanations.append(
            f"Your BMI is {bmi}, which is below the usual range. Low body reserve can also make sugar patterns less stable."
        )

    if activity == "never":
        explanations.append(
            "You reported very low physical activity. When the body moves less, sugar tends to stay in the blood longer."
        )
    elif activity == "sometimes":
        explanations.append(
            "You reported occasional activity. Irregular movement gives less steady sugar control than regular movement."
        )
    elif activity == "active":
        explanations.append(
            "You reported regular activity. This helps muscles use sugar better and supports better blood sugar control."
        )

    # ============================================================
    # 4. FOOD PATTERN EXPLANATION
    # ============================================================

    if glucose >= 140 or trend == "worsening":
        explanations.append(
            "Based on your readings, foods that release sugar slowly are usually safer. Common examples are oats, whole grains, lentils/beans, nuts, seeds, and non-starchy vegetables."
        )
        explanations.append(
            "For fruits, diabetes-friendly choices are apple, pear, guava, orange, sweet lime, berries, kiwi, papaya, and pomegranate seeds. Whole fruit is better than juice because juice raises sugar faster."
        )
    else:
        explanations.append(
            "Your current pattern looks relatively better. Balanced meals with controlled portions help keep sugar steady throughout the day."
        )

    # ============================================================
    # 5. MEDICINE / SYMPTOM EXPLANATION
    # ============================================================

    if medication == "insulin":
        explanations.append(
            "You are using insulin. This usually means your body needs direct support to control sugar, so timing of food and insulin is very important."
        )
    elif medication == "oral":
        explanations.append(
            "You are on diabetes tablets. This means sugar control is being supported by medicine in addition to food and activity."
        )

    if symptoms == "severe":
        explanations.append(
            "You reported severe symptoms. With high sugar, this can be a warning sign and may need urgent medical attention."
        )
    elif symptoms == "mild":
        explanations.append(
            "You reported mild symptoms. This suggests sugar may be affecting your day-to-day comfort and needs close follow-up."
        )

    # ============================================================
    # 6. BACKGROUND RISK EXPLANATION
    # ============================================================

    if status == "type2":
        explanations.append(
            "You already have Type 2 diabetes. This means long-term sugar protection is important to prevent damage to organs."
        )
    elif status == "type1":
        explanations.append(
            "You already have Type 1 diabetes. In Type 1, the body depends on insulin treatment for safe sugar control."
        )
    elif status == "prediabetic":
        explanations.append(
            "You are in the prediabetes stage. This stage is an early warning and many people can delay or prevent full diabetes with timely care."
        )

    if family_history:
        explanations.append(
            "You have family history of diabetes. This means your natural risk is higher, even if symptoms are not strong."
        )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "priority_explanations": explanations[:3],
        "remaining_explanations": explanations[3:]
    }
