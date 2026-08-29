from typing import List, Optional
from pydantic import BaseModel, Field

class PanelSchema(BaseModel):
    id: str
    name: Optional[str] = "Interview Panel"
    members: Optional[List[str]] = Field(default_factory=list)
    companyName: Optional[str] = None
    company_name: Optional[str] = None
    roomNumber: Optional[str] = None
    room_number: Optional[str] = None
    department: Optional[str] = None
    expertise: Optional[List[str]] = Field(default_factory=list)
    availability: Optional[str] = "available"
    status: Optional[str] = "active"
    interviewsScheduled: Optional[int] = 0
    confirmed: Optional[bool] = False

class PanelCreate(BaseModel):
    name: str
    members: Optional[List[str]] = Field(default_factory=list)
    companyName: Optional[str] = None
    company_name: Optional[str] = None
    roomNumber: Optional[str] = None
    room_number: Optional[str] = None
    department: Optional[str] = None
    expertise: Optional[List[str]] = Field(default_factory=list)
