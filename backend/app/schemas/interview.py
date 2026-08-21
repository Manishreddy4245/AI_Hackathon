from typing import List, Optional
from pydantic import BaseModel

class InterviewSchema(BaseModel):
    id: str
    candidateId: Optional[str] = None
    candidateName: str
    candidateRoll: str
    companyName: str
    roleTitle: str
    round: str
    timeSlot: str
    startTime: str
    endTime: str
    date: str
    panelId: Optional[str] = None
    panelName: str
    roomId: Optional[str] = None
    roomName: str
    status: str
    panelConfirmed: bool
    conflictNote: Optional[str] = None
    score: Optional[int] = None
    feedback: Optional[str] = None

class InterviewCreate(BaseModel):
    candidateName: str
    candidateRoll: str
    companyName: str
    roleTitle: str
    round: str
    timeSlot: str
    startTime: str
    endTime: str
    date: str
    panelName: str
    roomName: str

class InterviewRescheduleRequest(BaseModel):
    date: str
    timeSlot: str
    panelName: str
    roomName: str
