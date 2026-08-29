from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class InterviewAvailabilityCreate(BaseModel):
    panel_name: str
    panel_members: List[str] = Field(default_factory=list)
    date: str
    start_time: str
    end_time: str
    block: str
    room_number: str
    status: str = "AVAILABLE"

class InterviewAvailabilityUpdate(BaseModel):
    panel_name: Optional[str] = None
    panel_members: Optional[List[str]] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    block: Optional[str] = None
    room_number: Optional[str] = None
    status: Optional[str] = None

class InterviewAvailabilitySchema(BaseModel):
    id: str
    panel_name: str
    panel_members: List[str] = Field(default_factory=list)
    date: str
    start_time: str
    end_time: str
    block: str
    room_number: str
    status: str = "AVAILABLE"  # "AVAILABLE" | "ASSIGNED" | "UNAVAILABLE"
    assigned_application_id: Optional[str] = None
    assigned_student_id: Optional[str] = None
    assigned_student_name: Optional[str] = None
    assigned_company_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class InterviewAvailabilityCheckRequest(BaseModel):
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    panel_id: Optional[str] = None
    panel_name: Optional[str] = None
    room_id: Optional[str] = None
    room_name: Optional[str] = None
    date: str
    time_slot: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration: Optional[str] = "45 mins"

class InterviewAvailabilityCheckResponse(BaseModel):
    available: bool
    candidate_available: bool
    panel_available: bool
    room_available: bool
    conflict: Optional[str] = None

class InterviewSchema(BaseModel):
    id: str
    driveId: Optional[str] = None
    applicationId: Optional[str] = None
    candidateId: Optional[str] = None
    candidateName: str
    candidateRoll: str
    companyName: str
    roleTitle: str

    round: str
    timeSlot: str
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    date: str
    panelId: Optional[str] = None
    panelName: Optional[str] = "Interview Panel"
    roomId: Optional[str] = None
    roomName: Optional[str] = "Interview Room"
    status: str
    panelConfirmed: bool
    conflictNote: Optional[str] = None
    score: Optional[int] = None
    feedback: Optional[str] = None

class InterviewCreate(BaseModel):
    candidateId: Optional[str] = None
    candidateName: str
    candidateRoll: Optional[str] = "N/A"
    companyName: str
    roleTitle: str
    round: Optional[str] = "Technical Round 1"
    timeSlot: str
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    date: str
    panelId: Optional[str] = None
    panel_id: Optional[str] = None
    panelName: Optional[str] = None
    panel_name: Optional[str] = None
    panelMembers: Optional[List[str]] = Field(default_factory=list)
    roomId: Optional[str] = None
    room_id: Optional[str] = None
    roomName: Optional[str] = None
    room_name: Optional[str] = None
    block: Optional[str] = None
    roomNumber: Optional[str] = None
    driveId: Optional[str] = None
    applicationId: Optional[str] = None

class InterviewRescheduleRequest(BaseModel):
    date: Optional[str] = None
    timeSlot: Optional[str] = None
    panelName: Optional[str] = None
    roomName: Optional[str] = None
    panelId: Optional[str] = None
    roomId: Optional[str] = None
    new_slot_id: Optional[str] = None

class InterviewStatusUpdateRequest(BaseModel):
    status: Optional[str] = None
    status_val: Optional[str] = None
