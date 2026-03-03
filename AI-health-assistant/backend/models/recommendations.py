from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from datetime import datetime
from database import Base

class DiabetesRecommendation(Base):
    __tablename__ = "diabetes_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    risk_record_id = Column(Integer, ForeignKey('diabetes_risk_records.record_id'), nullable=True, index=True)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(50), nullable=False)
    recommendations = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)