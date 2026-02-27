from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from datetime import datetime
from database import Base

class DiabetesRecommendation(Base):
    __tablename__ = "diabetes_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    # Optional link to user (nullable for backward compatibility)
    user_id = Column(Integer, nullable=True, index=True)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(50), nullable=False)
    recommendations = Column(JSON, nullable=False)  # Array of strings
    created_at = Column(DateTime, default=datetime.utcnow)