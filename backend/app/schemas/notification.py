from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    timestamp: str
    read: bool = False
    important: bool = False
    type: str  # "APPLICATION_RECEIVED", "APPLICATION_SHORTLISTED", "INTERVIEW_SCHEDULED", etc.
    recipientRole: Optional[str] = "student"
    recipientName: Optional[str] = "User"
    recipient_user_id: Optional[str] = None
    application_id: Optional[str] = None
    student_id: Optional[str] = None
    drive_id: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    relatedRoute: Optional[str] = None
    relatedDriveName: Optional[str] = None
    relatedCandidateName: Optional[str] = None
    created_at: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "SYSTEM_ALERT"
    recipientRole: Optional[str] = "student"
    recipientName: Optional[str] = "User"
    recipient_user_id: Optional[str] = None
    application_id: Optional[str] = None
    student_id: Optional[str] = None
    drive_id: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    relatedRoute: Optional[str] = None
    important: Optional[bool] = False
