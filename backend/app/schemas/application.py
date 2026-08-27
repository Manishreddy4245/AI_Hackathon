from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class InterviewScheduleInfo(BaseModel):
    slot_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    panel_id: Optional[str] = None
    panel_name: Optional[str] = None
    panel_members: List[str] = Field(default_factory=list)
    block: Optional[str] = None
    room_number: Optional[str] = None
    room_id: Optional[str] = None
    room_name: Optional[str] = None

class ApplicationSchema(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    rollNumber: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    batch: Optional[str] = None
    graduation_year: Optional[int] = None
    skills: List[str] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    readiness_score: Optional[int] = 85
    resume_url: Optional[str] = None
    resume_id: Optional[str] = None
    drive_id: str
    company_id: Optional[str] = None
    company_name: str
    job_title: str
    status: str = "APPLIED"  # "APPLIED" | "SHORTLISTED" | "NOT_SHORTLISTED" | "INTERVIEW_SCHEDULED"
    applied_at: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    match_score: Optional[int] = 85
    matched_skills: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    interview: Optional[InterviewScheduleInfo] = None

class ApplicationCreate(BaseModel):
    drive_id: str

class ApplicationShortlistRequest(BaseModel):
    application_id: Optional[str] = None
    student_id: Optional[str] = None
    drive_id: Optional[str] = None
    slot_id: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    panel_id: Optional[str] = None
    panel_name: Optional[str] = None
    panel_members: Optional[List[str]] = None
    block: Optional[str] = None
    room_number: Optional[str] = None
    room_id: Optional[str] = None
    room_name: Optional[str] = None

class ApplicationRejectRequest(BaseModel):
    reason: Optional[str] = None
