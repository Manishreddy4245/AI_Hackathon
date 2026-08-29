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

class DrivePipelineStats(BaseModel):
    eligible: int = 0
    applied: int = 0
    shortlisted: int = 0
    interview: int = 0
    selected: int = 0

class DriveAIInsights(BaseModel):
    topMatchingSkills: List[str] = []
    commonSkillGaps: List[str] = []
    preparationAdvice: str = ""

class PlacementDriveCreate(BaseModel):
    companyId: Optional[str] = "comp-default"
    companyName: str
    companyLogo: Optional[str] = "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&auto=format&fit=crop&q=80"
    roleTitle: str
    packageLpa: float
    location: Optional[str] = None
    employmentType: Optional[str] = "Full Time"
    eligibleBranches: List[str] = Field(default_factory=list)
    minCgpa: Optional[float] = None
    graduationYear: Optional[int] = None
    graduationYears: List[int] = Field(default_factory=list)
    maxBacklogs: Optional[int] = 0
    driveDate: Optional[str] = "2026-10-31"
    deadline: Optional[str] = "2026-10-31"
    description: Optional[str] = "Campus recruitment drive for engineering graduates."
    rawText: Optional[str] = None
    requiredSkills: List[str] = []
    preferredSkills: List[str] = []
    status: Optional[str] = "PENDING_APPROVAL"
    aiExplanation: Optional[str] = None
    aiConfirmed: Optional[bool] = False
    aiInsights: Optional[DriveAIInsights] = None
    recruiter_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None

class PlacementDriveUpdate(BaseModel):
    companyName: Optional[str] = None
    roleTitle: Optional[str] = None
    companyLogo: Optional[str] = None
    packageLpa: Optional[float] = None
    location: Optional[str] = None
    employmentType: Optional[str] = None
    eligibleBranches: Optional[List[str]] = None
    minCgpa: Optional[float] = None
    graduationYear: Optional[int] = None
    graduationYears: Optional[List[int]] = None
    maxBacklogs: Optional[int] = None
    driveDate: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    rawText: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    preferredSkills: Optional[List[str]] = None
    status: Optional[str] = None
    aiExplanation: Optional[str] = None
    aiConfirmed: Optional[bool] = None
    reanalyze_jd: Optional[bool] = False
    changes_feedback: Optional[str] = None

class PlacementDriveSchema(BaseModel):
    id: str
    companyId: Optional[str] = "comp-default"
    companyName: str
    companyLogo: Optional[str] = "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&auto=format&fit=crop&q=80"
    roleTitle: str
    packageLpa: Optional[float] = None
    location: Optional[str] = None
    employmentType: Optional[str] = "Full Time"
    eligibleBranches: Optional[List[str]] = Field(default_factory=list)
    minCgpa: Optional[float] = None
    graduationYear: Optional[int] = None
    graduationYears: Optional[List[int]] = Field(default_factory=list)
    maxBacklogs: Optional[int] = 0
    driveDate: Optional[str] = "2026-10-31"
    status: Optional[str] = "ANNOUNCED"
    registeredCount: Optional[int] = 0
    shortlistedCount: Optional[int] = 0
    selectedCount: Optional[int] = 0
    deadline: Optional[str] = "2026-10-31"
    description: Optional[str] = "Campus recruitment drive for engineering graduates."
    requiredSkills: Optional[List[str]] = []
    preferredSkills: Optional[List[str]] = []

    aiExplanation: Optional[str] = None
    aiConfirmed: Optional[bool] = False
    pipeline: Optional[DrivePipelineStats] = None
    aiInsights: Optional[DriveAIInsights] = None
    recruiter_id: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    created_at: Optional[str] = None
    announced_at: Optional[str] = None
    announced_by: Optional[str] = None
    students_notified: Optional[bool] = False
    students_notified_count: Optional[int] = 0
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[str] = None
    changes_feedback: Optional[str] = None
    changes_requested_by: Optional[str] = None
    changes_requested_at: Optional[str] = None
    submitted_at: Optional[str] = None


class DriveReviewActionRequest(BaseModel):
    reason: Optional[str] = None
    feedback: Optional[str] = None

class RecruitmentRoundCreate(BaseModel):
    name: str
    round_type: Optional[str] = "Technical"  # Aptitude, Technical, Coding, HR, GD, Assessment
    order: int
    is_final: Optional[bool] = False
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    panel_name: Optional[str] = None
    description: Optional[str] = None

class RecruitmentRoundUpdate(BaseModel):
    name: Optional[str] = None
    round_type: Optional[str] = None
    order: Optional[int] = None
    is_final: Optional[bool] = None
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    panel_name: Optional[str] = None
    description: Optional[str] = None

class RecruitmentRoundSchema(BaseModel):
    id: str
    drive_id: str
    name: str
    round_type: str
    order: int
    is_final: bool = False
    date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    panel_name: Optional[str] = None
    description: Optional[str] = None
    candidates_count: Optional[int] = 0
    passed_count: Optional[int] = 0
    rejected_count: Optional[int] = 0
    pending_count: Optional[int] = 0
    created_at: Optional[str] = None

class RoundCandidateActionRequest(BaseModel):
    action: str  # PASS, REJECT, FINAL_SELECT
    round_id: Optional[str] = None
    notes: Optional[str] = None

