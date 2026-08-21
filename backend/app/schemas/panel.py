from typing import List
from pydantic import BaseModel

class PanelSchema(BaseModel):
    id: str
    name: str
    members: List[str]
    companyName: str
    roomNumber: str
    expertise: List[str]
    availability: str
    interviewsScheduled: int
    confirmed: bool

class PanelCreate(BaseModel):
    name: str
    members: List[str]
    companyName: str
    roomNumber: str
    expertise: List[str]
