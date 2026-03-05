from fastapi import APIRouter, Depends, HTTPException, Query
from models.diabetes_model import RiskInput
from risk_calculator.diabetes_risk_calculator import calculate_risk_score
from auth.auth_utils import get_current_user
from models.user import User
from database import SessionLocal
from models.diabetes_db_model import DiabetesRiskRecord
from models.user_metrics import UserMetrics

router = APIRouter()

@router.get("/diabetes-risk/history")
def get_risk_history(
    limit: int = Query(30, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        records = (
            db.query(DiabetesRiskRecord)
            .filter(DiabetesRiskRecord.user_id == current_user.id)
            .order_by(DiabetesRiskRecord.created_at.desc())
            .limit(limit)
            .all()
        )
        records = list(reversed(records))
        result = []
        for r in records:
            bmi_value = r.bmi
            if bmi_value is None and r.weight_kg and r.height_cm:
                try:
                    height_m = r.height_cm / 100.0
                    bmi_value = round(r.weight_kg / (height_m * height_m), 1)
                except Exception:
                    bmi_value = None

            risk_score_value = r.risk_score
            if risk_score_value is None:
                try:
                    computed = calculate_risk_score(
                        glucose_value=r.glucose_value,
                        measurement_context=r.measurement_context,
                        trend=r.trend,
                        symptoms=r.symptoms,
                        medication_type=r.medication_type,
                        meal_type=r.meal_type,
                        diabetes_status=r.diabetes_status,
                        age=r.age,
                        weight_kg=r.weight_kg,
                        height_cm=r.height_cm,
                        family_history=r.family_history,
                        physical_activity=r.physical_activity
                    )
                    risk_score_value = computed.get("risk_score")
                    if bmi_value is None:
                        bmi_value = computed.get("derived_metrics", {}).get("bmi")
                except Exception:
                    risk_score_value = None

            result.append(
                {
                    "record_id": r.record_id,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "glucose_value": r.glucose_value,
                    "weight_kg": r.weight_kg,
                    "height_cm": r.height_cm,
                    "bmi": bmi_value,
                    "risk_score": risk_score_value,
                    "risk_level": r.risk_level,
                }
            )
        return result
    finally:
        db.close()

@router.get("/diabetes-risk/records")
def get_risk_records(
    limit: int = Query(30, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    return get_risk_history(limit, current_user)

@router.get("/diabetes-risk/latest")
def get_latest_risk(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        latest = (
            db.query(DiabetesRiskRecord)
            .filter(DiabetesRiskRecord.user_id == current_user.id)
            .order_by(DiabetesRiskRecord.created_at.desc())
            .first()
        )
        if not latest:
            return {"risk_score": 0, "risk_level": "Unknown", "created_at": None}
        return {
            "risk_score": latest.risk_score or 0,
            "risk_level": latest.risk_level or "Unknown",
            "created_at": latest.created_at.isoformat() if latest.created_at else None,
        }
    finally:
        db.close()

@router.post("/diabetes-risk")
def calculate_risk(data: RiskInput, current_user: User = Depends(get_current_user)):
    try:
        result = calculate_risk_score(
            glucose_value=data.glucose_value,
            measurement_context=data.measurement_context,
            trend=data.trend,
            symptoms=data.symptoms,
            medication_type=data.medication_type,
            meal_type=data.meal_type,
            diabetes_status=data.diabetes_status,
            age=data.age,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            family_history=data.family_history,
            physical_activity=data.physical_activity
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    db = SessionLocal()
    try:
        db_record = DiabetesRiskRecord(
            user_id=current_user.id,
            glucose_value=data.glucose_value,
            measurement_context=data.measurement_context,
            trend=data.trend,
            symptoms=data.symptoms,
            medication_type=data.medication_type,
            meal_type=data.meal_type,
            age=data.age,
            weight_kg=data.weight_kg,
            height_cm=data.height_cm,
            bmi=result["derived_metrics"]["bmi"],
            bmi_category=result["derived_metrics"]["bmi_category"],
            diabetes_status=data.diabetes_status,
            family_history=data.family_history,
            physical_activity=data.physical_activity,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"]
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        result["record_id"] = db_record.record_id

        # Comparison with previous record
        prev_record = db.query(DiabetesRiskRecord).filter(
            DiabetesRiskRecord.user_id == current_user.id,
            DiabetesRiskRecord.record_id != db_record.record_id
        ).order_by(DiabetesRiskRecord.created_at.desc()).first()

        if prev_record:
            try:
                prev_result = calculate_risk_score(
                    glucose_value=prev_record.glucose_value,
                    measurement_context=prev_record.measurement_context,
                    trend=prev_record.trend,
                    symptoms=prev_record.symptoms,
                    medication_type=prev_record.medication_type,
                    meal_type=prev_record.meal_type,
                    diabetes_status=prev_record.diabetes_status,
                    age=prev_record.age,
                    weight_kg=prev_record.weight_kg,
                    height_cm=prev_record.height_cm,
                    family_history=prev_record.family_history,
                    physical_activity=prev_record.physical_activity
                )
            except ValueError:
                prev_result = None

            if prev_result is not None:
                prev_score = prev_result.get("risk_score", 0)
                curr_score = result.get("risk_score", 0)
                delta = curr_score - prev_score
                direction = "increased" if delta > 0 else "decreased" if delta < 0 else "no_change"

                curr_pct = result.get("percentage_breakdown", {})
                prev_pct = prev_result.get("percentage_breakdown", {})
                pct_diffs = {}
                for k in ["immediate_glycemic_percentage", "treatment_symptom_percentage", "baseline_vulnerability_percentage"]:
                    pct_diffs[k] = (curr_pct.get(k, 0) - prev_pct.get(k, 0))

                top_component = max(pct_diffs.keys(), key=lambda x: abs(pct_diffs[x])) if pct_diffs else None

                reasons = []
                comp_map = {
                    "immediate_glycemic_percentage": "blood glucose factors",
                    "treatment_symptom_percentage": "treatment & symptoms",
                    "baseline_vulnerability_percentage": "baseline vulnerability"
                }
                if top_component:
                    diff_val = round(pct_diffs[top_component], 1)
                    if diff_val > 0:
                        reasons.append(f"Primary driver: {comp_map.get(top_component, top_component)} increased by {diff_val} percentage points compared to the previous assessment.")
                    elif diff_val < 0:
                        reasons.append(f"Primary driver: {comp_map.get(top_component, top_component)} decreased by {abs(diff_val)} percentage points compared to the previous assessment.")

                try:
                    prev_gl = prev_record.glucose_value
                    curr_gl = db_record.glucose_value
                    if prev_gl is not None and curr_gl is not None and curr_gl != prev_gl:
                        if curr_gl > prev_gl:
                            reasons.append(f"Your blood glucose rose from {prev_gl} to {curr_gl} mg/dL which increases immediate glycemic risk.")
                        else:
                            reasons.append(f"Your blood glucose fell from {prev_gl} to {curr_gl} mg/dL which reduces immediate glycemic risk.")
                except Exception:
                    pass

                for attr in ["trend", "symptoms", "medication_type", "meal_type", "physical_activity"]:
                    try:
                        prev_val = getattr(prev_record, attr)
                        curr_val = getattr(db_record, attr)
                        if prev_val != curr_val:
                            reasons.append(f"{attr.replace('_', ' ').capitalize()} changed from '{prev_val}' to '{curr_val}', affecting risk.")
                    except Exception:
                        continue

                try:
                    prev_bmi = prev_result.get("derived_metrics", {}).get("bmi")
                    curr_bmi = result.get("derived_metrics", {}).get("bmi")
                    if prev_bmi and curr_bmi and round(prev_bmi,1) != round(curr_bmi,1):
                        if curr_bmi > prev_bmi:
                            reasons.append(f"BMI increased from {prev_bmi} to {curr_bmi}, which raises baseline vulnerability.")
                        else:
                            reasons.append(f"BMI decreased from {prev_bmi} to {curr_bmi}, which reduces baseline vulnerability.")
                except Exception:
                    pass

                result["comparison"] = {
                    "previous_record_id": prev_record.record_id,
                    "previous_created_at": prev_record.created_at.isoformat() if prev_record.created_at else None,
                    "previous_risk_score": prev_score,
                    "current_risk_score": curr_score,
                    "delta": delta,
                    "direction": direction,
                    "reasons": reasons
                }
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

    return result
