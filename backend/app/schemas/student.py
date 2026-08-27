from typing import List, Optional
from pydantic import BaseModel

class ProjectItem(BaseModel):
    name: str
    description: Optional[str] = None
    techStack: List[str] = []

class CertificationItem(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None

class StudentSchema(BaseModel):
    id: str
    rollNumber: str
    name: str
    email: str
    avatar: Optional[str] = "https://api.dicebear.com/7.x/initials/svg?seed=Student"
    branch: str
    batch: str
    cgpa: float
    skills: List[str]
    projects: List[ProjectItem] = []
    certifications: List[CertificationItem] = []
    readinessScore: int
    resumeUrl: Optional[str] = None
    placementStatus: str
    placedCompany: Optional[str] = None
    placedPackage: Optional[float] = None
    applicationsCount: int
    shortlistsCount: int
    interviewsCount: int

class ShortlistRequest(BaseModel):
    studentId: str
    driveId: str

class ApplyDriveRequest(BaseModel):
    studentId: Optional[str] = None
    driveId: str
    name: Optional[str] = None
    mobile: Optional[str] = None
    college_name: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    company_id: Optional[str] = None
    source: Optional[str] = None
    application_url: Optional[str] = None

