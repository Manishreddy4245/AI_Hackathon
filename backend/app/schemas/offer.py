import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


def _normalize_date_str(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    val_str = str(val).strip()
    if not val_str:
        return None
    # Strip time component if present
    if "T" in val_str:
        val_str = val_str.split("T")[0]
    elif " " in val_str:
        val_str = val_str.split(" ")[0]

    # Check DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    match_dmy = re.match(r"^(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})$", val_str)
    if match_dmy:
        d, m, y = match_dmy.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"

    # Check YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    match_ymd = re.match(r"^(\d{4})[\./-](\d{1,2})[\./-](\d{1,2})$", val_str)
    if match_ymd:
        y, m, d = match_ymd.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"

    return val_str


class OfferCreateRequest(BaseModel):
    application_id: str
    student_id: Optional[str] = None
    drive_id: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    package_lpa: float = Field(..., ge=0.1, description="Total CTC in LPA")
    base_salary_lpa: Optional[float] = Field(None, ge=0)
    joining_bonus_lpa: Optional[float] = Field(0.0, ge=0)
    designation: Optional[str] = None
    job_location: Optional[str] = "Bengaluru, India"
    employment_type: Optional[str] = "Full-time"
    joining_date: str = Field(..., description="Tentative or confirmed joining date (YYYY-MM-DD or DD.MM.YYYY)")
    response_deadline: Optional[str] = Field(None, description="Offer acceptance deadline (YYYY-MM-DD or DD.MM.YYYY)")
    offer_letter_text: Optional[str] = None
    terms_and_conditions: Optional[List[str]] = Field(default_factory=list)
    benefits: Optional[List[str]] = Field(default_factory=list)

    @field_validator("joining_date", mode="before")
    @classmethod
    def validate_joining_date(cls, v: Any) -> str:
        norm = _normalize_date_str(v)
        if not norm:
            raise ValueError("joining_date is required and cannot be empty")
        return norm

    @field_validator("response_deadline", mode="before")
    @classmethod
    def validate_response_deadline(cls, v: Any) -> Optional[str]:
        return _normalize_date_str(v) if v is not None else None

class OfferStudentActionRequest(BaseModel):
    action: str = Field(..., description="ACCEPT or DECLINE")
    joining_date: Optional[str] = None
    preferred_location: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    decline_reason: Optional[str] = None
    notes: Optional[str] = None

class JoiningConfirmationRequest(BaseModel):
    reporting_venue_or_link: Optional[str] = "Company HQ / Virtual Onboarding Portal"
    reporting_time: Optional[str] = "09:30 AM"
    onboarding_notes: Optional[str] = None

class OfferResponse(BaseModel):
    id: str
    offer_id: str
    application_id: str
    student_id: str
    student_name: str
    student_email: str
    drive_id: str
    company_name: str
    job_title: str
    designation: str
    package_lpa: float
    base_salary_lpa: Optional[float] = None
    joining_bonus_lpa: Optional[float] = 0.0
    job_location: str
    employment_type: str
    joining_date: str
    response_deadline: Optional[str] = None
    status: str  # "OFFERED" | "ACCEPTED" | "DECLINED" | "JOINING_CONFIRMED"
    offer_letter_text: Optional[str] = None
    terms_and_conditions: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    issued_by: Optional[str] = None
    issued_by_role: Optional[str] = None
    issued_at: str
    responded_at: Optional[str] = None
    decline_reason: Optional[str] = None
    joining_details: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
