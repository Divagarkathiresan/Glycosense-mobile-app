from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserMetricsInput(BaseModel):
    user_id: int
    disease_type: str  # "diabetes"
    latest_risk_score: int
    previous_risk_score: Optional[int] = None
    average_risk_score: Optional[float] = None
    risk_change: Optional[int] = None
    trend_direction: str  # "improving", "stable", "worsening"
    total_assessments: int = 0
    last_assessed_at: Optional[datetime] = None