from pydantic import BaseModel, Field

class RiskInput(BaseModel):
    # -------- USER REFERENCE --------
    user_id: int = Field(..., gt=0)
    
    # -------- GLUCOSE INPUT --------
    glucose_value: float = Field(..., gt=0)
    measurement_context: str      #before_meal, after_meal, fasting
    trend: str    #rising, falling, stable
    symptoms: str  #none, mild, severe

    # -------- TREATMENT & LIFESTYLE --------
    medication_type: str    #none, oral, insulin
    meal_type: str       #healthy, moderate, unhealthy
    physical_activity: str  #none, light, moderate, intense

    # -------- BASELINE HEALTH --------
    diabetes_status: str  #none, prediabetes, type_2, type_1
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
