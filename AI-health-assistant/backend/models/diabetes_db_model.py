from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from datetime import datetime
from database import Base


class DiabetesRiskRecord(Base):
    __tablename__ = "diabetes_risk_records"

    # Primary key
    record_id = Column(Integer, primary_key=True, index=True)

    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # -------- Glucose data --------
    glucose_value = Column(Float, nullable=False)
    measurement_context = Column(String(20))   # fasting / post-meal
    trend = Column(String(20))                  # improving / stable / worsening

    # -------- Symptoms & treatment --------
    symptoms = Column(String(20))               # none / mild / severe
    medication_type = Column(String(20))        # none / oral / insulin
    meal_type = Column(String(20))              # low-carb / balanced / high-carb

    # -------- Baseline snapshot --------
    age = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    bmi = Column(Float)
    bmi_category = Column(String(20))            # underweight / normal / overweight / obese
    diabetes_status = Column(String(20))         # non-diabetic / prediabetic / type1 / type2
    family_history = Column(Boolean)
    physical_activity = Column(String(20))       # active / sometimes / never

    # -------- Risk output --------
    risk_score = Column(Integer)
    risk_level = Column(String(20))              # Low / Moderate / High / Critical

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
