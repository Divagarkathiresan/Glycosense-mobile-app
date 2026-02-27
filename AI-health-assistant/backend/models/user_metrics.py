from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from datetime import datetime
from database import Base


class UserMetrics(Base):
    __tablename__ = "user_metrics"

    metric_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    disease_type = Column(String(20), nullable=False)  # "diabetes"
    
    # ---- Diabetes Metrics ----
    glucose_value = Column(Float, nullable=True)
    measurement_context = Column(String(20), nullable=True)  # "fasting", "post-meal"
    trend = Column(String(20), nullable=True)  # "improving", "stable", "worsening"
    symptoms = Column(String(20), nullable=True)  # "none", "mild", "severe"
    medication_type = Column(String(20), nullable=True)  # "none", "oral", "insulin"
    meal_type = Column(String(20), nullable=True)  # "low-carb", "balanced", "high-carb"
    diabetes_status = Column(String(20), nullable=True)  # "non-diabetic", "prediabetic", "type1", "type2"
    
    # ---- Common Metrics ----
    age = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    physical_activity = Column(String(20), nullable=True)  # "active", "sometimes", "never"
    family_history = Column(Boolean, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
