from pydantic import BaseModel, Field
from typing import Literal, Optional

class RiskInput(BaseModel):
    # -------- USER REFERENCE --------
    user_id: Optional[int] = Field(default=None, gt=0)
    
    # -------- GLUCOSE INPUT --------
    glucose_value: float = Field(..., gt=0)
    measurement_context: Literal["before_meal", "after_meal", "fasting", "post-meal"]
    trend: Literal["rising", "falling", "stable", "worsening", "improving"]
    symptoms: Literal["none", "mild", "severe"]

    # -------- TREATMENT & LIFESTYLE --------
    medication_type: Literal["none", "oral", "insulin"]
    meal_type: Literal["healthy", "moderate", "unhealthy", "low-carb", "balanced", "high-carb"]
    physical_activity: Literal["none", "light", "moderate", "intense", "active", "sometimes", "never"]

    # -------- BASELINE HEALTH --------
    diabetes_status: Literal["none", "prediabetes", "type_2", "type_1", "non-diabetic", "prediabetic", "type2", "type1"]
    age: int = Field(..., gt=0)  

    # -------- ANTHROPOMETRIC DATA --------
    weight_kg: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)

    # -------- GENETIC RISK --------
    family_history: bool
    
    def get_bmi_category(self) -> str:
        bmi = self.weight_kg / ((self.height_cm / 100) ** 2)
        if bmi < 25:
            return "normal"
        elif bmi < 30:
            return "overweight"
        else:
            return "obese"
