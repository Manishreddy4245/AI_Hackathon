from typing import List, Optional
from pydantic import BaseModel, Field

class CompanySchema(BaseModel):
    id: str
    name: str
    logo: str
    industry: str
    website: str
    location: str
    tier: str
    contactPerson: str
    contactEmail: str

class PlacementDriveCreate(BaseModel):
    companyId: str
    companyName: str
    companyLogo: str
    roleTitle: str
    packageLpa: float
    location: str
    employmentType: str
    eligibleBranches: List[str]
    minCgpa: float
    graduationYear: int
    driveDate: str
    deadline: str
    description: str
    requiredSkills: List[str]
    preferredSkills: List[str]

class DrivePipelineStats(BaseModel):
    eligible: int
    applied: int
    shortlisted: int
    interview: int
    selected: int

class DriveAIInsights(BaseModel):
    topMatchingSkills: List[str]
    commonSkillGaps: List[str]
    preparationAdvice: str

class PlacementDriveSchema(BaseModel):
    id: str
    companyId: str
    companyName: str
    companyLogo: str
    roleTitle: str
    packageLpa: float
    location: str
    employmentType: str
    eligibleBranches: List[str]
    minCgpa: float
    graduationYear: int
    driveDate: str
    status: str
    registeredCount: int
    shortlistedCount: int
    selectedCount: int
    deadline: str
    description: str
    requiredSkills: List[str]
    preferredSkills: List[str]
    aiExplanation: Optional[str] = None
    aiConfirmed: Optional[bool] = False
    pipeline: Optional[DrivePipelineStats] = None
    aiInsights: Optional[DriveAIInsights] = None
