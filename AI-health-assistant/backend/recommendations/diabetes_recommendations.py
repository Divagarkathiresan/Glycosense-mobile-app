from typing import Dict, List


def generate_diabetes_recommendations(risk_data: Dict) -> List[str]:

    recommendations = []
    risk_level = risk_data.get("risk_level", "Unknown")
    attribution = risk_data.get("attribution", {})

    # ============================================================
    # IMMEDIATE GLYCEMIC CONTRIBUTORS
    # ============================================================

    glycemic = attribution.get("immediate_glycemic", {})
    glucose_value = glycemic.get("glucose_value")
    glucose_context = glycemic.get("glucose_context")
    trend = glycemic.get("trend")

    if glucose_value is not None:
        if glucose_context == "fasting" and glucose_value >= 126:
            recommendations.append(
                f"Your fasting glucose is {glucose_value} mg/dL, which is high. Please follow a strict low-glycemic meal pattern and regular glucose checks."
            )
        elif glucose_context == "post-meal" and glucose_value >= 180:
            recommendations.append(
                f"Your post-meal glucose is {glucose_value} mg/dL, which indicates a post-food spike. Reduce refined carbohydrates and keep portions controlled."
            )
        elif glucose_value >= 100:
            recommendations.append(
                f"Your glucose is {glucose_value} mg/dL, slightly above ideal. Early lifestyle correction can prevent progression."
            )

    if trend == "worsening":
        recommendations.append(
            "Your glucose trend is worsening. Please repeat readings consistently and review treatment with your doctor."
        )
    elif trend == "stable":
        recommendations.append(
            "Your glucose trend is stable. Continue the same routine and improve meal quality to bring readings closer to target."
        )
    elif trend == "improving":
        recommendations.append(
            "Your glucose trend is improving. Continue the current plan and keep monitoring."
        )

    # ============================================================
    # BASELINE CONTRIBUTORS
    # ============================================================

    baseline = attribution.get("baseline", {})

    if baseline.get("bmi_category") in ["overweight", "obese"]:
        recommendations.append(
            "Weight reduction can improve sugar control. A practical target is 5-10% weight loss over time under medical guidance."
        )

    if baseline.get("physical_activity") == "never":
        recommendations.append(
            "Begin regular activity: at least 30 minutes of brisk walking on most days (about 150 minutes/week), if medically safe for you."
        )
    elif baseline.get("physical_activity") == "sometimes":
        recommendations.append(
            "Make activity consistent: 30 minutes/day for 5 days/week, plus a short 10-15 minute walk after meals."
        )

    if baseline.get("family_history"):
        recommendations.append(
            "Family history increases your risk. Regular follow-up blood sugar testing is very important even when symptoms are mild."
        )

    # ============================================================
    # DIETARY ADVICE (DOCTOR-STYLE, PRACTICAL)
    # ============================================================
    recommendations.append(
        "Diet advice: Use the plate method in each meal (1/2 non-starchy vegetables, 1/4 lean protein, 1/4 whole grains). Prefer oats, dal/beans, whole wheat, brown rice, nuts, and seeds."
    )
    recommendations.append(
        "Fruits suitable for diabetes (portion-controlled): apple, pear, guava, orange, sweet lime, berries, kiwi, papaya, and pomegranate seeds. Take whole fruit, not juice."
    )
    recommendations.append(
        "Portion advice: one small fruit at a time (or about 1 cup cut fruit). Avoid fruit juices, sweetened drinks, and frequent sweets."
    )

    # ============================================================
    # RISK LEVEL GUIDANCE
    # ============================================================

    if risk_level in ["High Risk", "Critical Risk"]:
        recommendations.append(
            "Your diabetes risk is high. Please schedule a doctor review soon for personalized treatment, medication adjustment, and complication screening."
        )
    elif risk_level == "Moderate Risk":
        recommendations.append(
            "You are at moderate risk. With consistent food, activity, and follow-up, risk progression can often be reduced."
        )
    else:
        recommendations.append(
            "Your current risk is low. Continue healthy routines and periodic monitoring."
        )

    recommendations.append(
        "Ask your doctor about periodic HbA1c, kidney function, lipid profile, eye check, and foot check as part of long-term diabetes safety."
    )


    return recommendations
