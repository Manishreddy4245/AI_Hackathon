"""Pydantic schemas for Placement Communities, Announcements, and Forms."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CommunityMessageCreate(BaseModel):
    content: str
    message_type: str = "ANNOUNCEMENT"  # ANNOUNCEMENT, FORM, REGISTRATION, ASSESSMENT, DOCUMENT_REQUEST, INTERVIEW_UPDATE, CAMPUS_DRIVE_ANNOUNCEMENT, GENERAL
    action_type: Optional[str] = None  # OPEN_FORM, START_ASSESSMENT, VIEW_INTERVIEW, UPLOAD_DOCUMENT, OPEN_APPLICATION, VIEW_DRIVE
    action_label: Optional[str] = None
    form_schema: Optional[Dict[str, Any]] = None
    form_id: Optional[str] = None  # Reference to forms collection

class CommunityMessageSchema(BaseModel):
    id: str
    community_id: str
    drive_id: str
    author_id: str
    author_name: str
    author_role: str
    message_type: str
    content: str
    action_type: Optional[str] = None
    action_label: Optional[str] = None
    form_schema: Optional[Dict[str, Any]] = None
    form_id: Optional[str] = None  # Reference to forms collection
    created_at: str


class CommunityRegistrationRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    roll_number: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    phone: Optional[str] = None
    preferred_location: Optional[str] = None
    custom_answers: Optional[Dict[str, Any]] = None

class CommunitySchema(BaseModel):
    id: str
    community_id: str
    drive_id: str
    company_id: Optional[str] = None
    company_name: str
    role_title: str
    package_lpa: Optional[float] = None
    salary_text: Optional[str] = None
    location: Optional[str] = None
    status: str  # ACTIVE, CLOSED
    registered_count: int = 0
    is_registered: bool = False
    created_at: str
    drive: Optional[Dict[str, Any]] = None

class CommunityResponseItem(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_email: str
    roll_number: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    skills: List[str] = []
    registered_at: str
    status: str
    custom_answers: Optional[Dict[str, Any]] = None
