#!/usr/bin/env python3

# Test script to verify diabetes risk calculation
import sys
sys.path.append('/Users/sanjana/Desktop/Health Assistance/ai-health-assistant/backend')

from risk_calculator.diabetes_risk_calculator import calculate_risk_score

# Test case 1: High risk scenario
print("=== TEST CASE 1: High Risk Scenario ===")
result1 = calculate_risk_score(
    glucose_value=210,  # High post-meal glucose (25 pts)
    measurement_context="post-meal",
    trend="worsening",  # 15 pts
    symptoms="mild",    # 8 pts
    medication_type="oral",  # 5 pts
    meal_type="high-carb",   # 5 pts
    diabetes_status="type2", # 7 pts
    age=52,             # 5 pts (>45)
    weight_kg=82,       # BMI = 29.05 (overweight = 2 pts)
    height_cm=168,
    family_history=True,     # 5 pts
    physical_activity="never" # 5 pts
)

print(f"Risk Score: {result1['risk_score']}")
print(f"Risk Level: {result1['risk_level']}")
print(f"BMI: {result1['derived_metrics']['bmi']} ({result1['derived_metrics']['bmi_category']})")
print("\nDetailed Breakdown:")
for key, value in result1['detailed_breakdown'].items():
    print(f"  {key}: {value}")

print(f"\nCategory Totals:")
print(f"  Immediate Glycemic: {result1['breakdown']['immediate_glycemic_risk']}")
print(f"  Treatment/Symptoms: {result1['breakdown']['treatment_symptom_risk']}")
print(f"  Baseline: {result1['breakdown']['baseline_vulnerability_risk']}")
print(f"  TOTAL: {result1['risk_score']}")

# Test case 2: Low risk scenario
print("\n=== TEST CASE 2: Low Risk Scenario ===")
result2 = calculate_risk_score(
    glucose_value=90,   # Normal fasting glucose (0 pts)
    measurement_context="fasting",
    trend="improving",  # 0 pts
    symptoms="none",    # 0 pts
    medication_type="none",  # 0 pts
    meal_type="low-carb",    # 0 pts
    diabetes_status="non-diabetic", # 0 pts
    age=25,             # 0 pts (<30)
    weight_kg=65,       # BMI = 22.5 (normal = 0 pts)
    height_cm=170,
    family_history=False,    # 0 pts
    physical_activity="active" # 0 pts
)

print(f"Risk Score: {result2['risk_score']}")
print(f"Risk Level: {result2['risk_level']}")
print(f"BMI: {result2['derived_metrics']['bmi']} ({result2['derived_metrics']['bmi_category']})")