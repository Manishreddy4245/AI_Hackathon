from typing import List, Optional
from pydantic import BaseModel

class ProjectItem(BaseModel):
    name: str
    description: str
    techStack: List[str]

class CertificationItem(BaseModel):
    name: str
    issuer: str
    date: str

class StudentSchema(BaseModel):
    id: str
    rollNumber: str
    name: str
    email: str
    avatar: str
    branch: str
    batch: str
    cgpa: float
    skills: List[str]
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    readinessScore: int
    resumeUrl: str
    placementStatus: str
    placedCompany: Optional[str] = None
    placedPackage: Optional[float] = None
    applicationsCount: int
    shortlistsCount: int
    interviewsCount: int

class ShortlistRequest(BaseModel):
    studentId: str
    driveId: str = "technova-backend"

class ApplyDriveRequest(BaseModel):
    studentId: str = "rahul-verma"
    driveId: str
