"""Pydantic schemas for AI Placement Assessment, PrepBot, Coding Sandbox and Analytics."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class TestCase(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = True  # If True, visible to student. If False, hidden for backend evaluation.

class QuestionSchema(BaseModel):
    id: str
    type: str  # "coding" or "aptitude"
    topic: str
    difficulty: str  # "Easy", "Medium", "Hard"
    question: str
    # Coding specific
    description: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    code_template: Optional[Dict[str, str]] = None  # e.g. {"python": "def solve():\n    pass", "javascript": "..."}
    sample_test_cases: Optional[List[TestCase]] = None
    # Aptitude specific
    options: Optional[List[str]] = None
    explanation: Optional[str] = None
    points: int = 10

class QuestionStudentView(BaseModel):
    """Secure question payload sent to frontend — strips correct answers and hidden test cases."""
    id: str
    type: str
    topic: str
    difficulty: str
    question: str
    description: Optional[str] = None
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None
    code_template: Optional[Dict[str, str]] = None
    sample_test_cases: Optional[List[Dict[str, Any]]] = None
    options: Optional[List[str]] = None
    points: int = 10

class AssessmentCreateRequest(BaseModel):
    type: str = "COMBINED"  # "CODING", "APTITUDE", "COMBINED"
    difficulty: str = "Medium"  # "Easy", "Medium", "Hard", "Adaptive"
    topics: Optional[List[str]] = None
    question_count: int = 10
    duration_minutes: int = 30
    prompt: Optional[str] = None
    drive_id: Optional[str] = None

class AptitudeAllocationRequest(BaseModel):
    application_id: str
    drive_id: Optional[str] = None
    student_id: Optional[str] = None
    round_type: Optional[str] = "APTITUDE"
    title: Optional[str] = "Aptitude Assessment"
    scheduled_at: Optional[str] = None
    deadline: Optional[str] = None
    duration_minutes: Optional[int] = 30

class AptitudeAllocationResponse(BaseModel):
    id: str
    assessment_id: str
    drive_id: str
    application_id: str
    student_id: str
    company: str
    job_title: str
    round_type: str = "APTITUDE"
    title: str = "Aptitude Assessment"
    status: str = "ALLOCATED"
    scheduled_at: Optional[str] = None
    deadline: Optional[str] = None
    duration_minutes: int = 30
    allocated_at: str
    allocated_by: Optional[str] = None


class AssessmentSessionResponse(BaseModel):
    id: str
    student_id: str
    type: str
    difficulty: str
    topics: List[str]
    question_count: int
    duration_minutes: int
    status: str  # "ALLOCATED", "IN_PROGRESS", "COMPLETED", "EXPIRED"
    questions: List[QuestionStudentView]
    created_at: str
    started_at: Optional[str] = None
    expires_at: Optional[str] = None
    drive_id: Optional[str] = None
    application_id: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    saved_answers: Optional[Dict[str, Any]] = None

class SaveAnswerRequest(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = "python"


class RunCodeRequest(BaseModel):
    question_id: str
    code: str
    language: str = "python"
    custom_input: Optional[str] = None

class RunCodeResult(BaseModel):
    status: str  # "PASSED", "FAILED", "RUNTIME_ERROR", "TIMEOUT"
    stdout: str
    stderr: Optional[str] = None
    execution_time_ms: int = 0
    passed_sample_cases: int = 0
    total_sample_cases: int = 0
    test_results: List[Dict[str, Any]] = []

class AnswerSubmissionItem(BaseModel):
    question_id: str
    type: str  # "coding" or "aptitude"
    selected_option: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = "python"

class AssessmentSubmitRequest(BaseModel):
    answers: List[AnswerSubmissionItem]
    time_taken_seconds: int = 0

class TopicPerformanceItem(BaseModel):
    topic: str
    score: int
    total: int
    percentage: float
    status: str  # "Strong", "Moderate", "Needs Improvement"

class AssessmentResultResponse(BaseModel):
    id: str
    assessment_id: str
    student_id: str
    type: str
    difficulty: str
    coding_score: float
    aptitude_score: float
    total_score: float
    percentage: float
    passed: bool
    topic_performance: List[TopicPerformanceItem]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    time_taken_seconds: int
    completed_at: str
    ai_feedback: Optional[str] = None
    questions_review: Optional[List[Dict[str, Any]]] = None

class PrepBotChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class PrepBotChatResponse(BaseModel):
    id: str
    reply: str
    suggested_actions: Optional[List[Dict[str, Any]]] = None
    assessment_config_preset: Optional[AssessmentCreateRequest] = None
    timestamp: str

class AssessmentHistoryItem(BaseModel):
    id: str
    assessment_id: str
    type: str
    difficulty: str
    topics: List[str]
    total_score: float
    percentage: float
    status: str
    completed_at: str
    duration_minutes: int

class ComplexityAnalysisRequest(BaseModel):
    question_id: str
    code: str
    language: str = "python"

class ComplexityAnalysisResponse(BaseModel):
    complexity_time: str
    complexity_space: str
    optimization_tip: str
    summary: str

class HintRequest(BaseModel):
    question_id: str
    code: Optional[str] = None
    language: str = "python"
    hint_level: int = 1

class HintResponse(BaseModel):
    hint_level: int
    hint_text: str
    title: str

class AdaptiveEvaluationRequest(BaseModel):
    question_id: str
    topic: str
    difficulty: str = "Medium"
    passed_test_cases: int = 0
    total_test_cases: int = 1
    hints_used: int = 0
    time_taken_seconds: int = 60

class TopicMasteryItem(BaseModel):
    topic: str
    mastery_percentage: float
    status: str
    total_attempts: int = 0
    clean_submissions: int = 0

class SpacedRepetitionItem(BaseModel):
    question_id: str
    topic_tag: str
    repetition_count: int = 0
    interval_days: int = 1
    ease_factor: float = 2.5
    next_review_date: str
    last_score: float = 0.0

class AdaptiveEvaluationResponse(BaseModel):
    attempt_score: float
    accuracy: float
    hint_penalty: float
    current_difficulty: str
    difficulty_transition: str
    transition_message: str
    topic_mastery: TopicMasteryItem
    spaced_repetition_queued: bool
    next_review_date: Optional[str] = None
    recommended_next_topic: str

class SpacedRevisionResponse(BaseModel):
    due_reviews: List[SpacedRepetitionItem]
    topic_mastery_index: List[TopicMasteryItem]
    active_difficulty: str
    recommended_next_topic: str

class MockInterviewChatMessage(BaseModel):
    role: Optional[str] = "user"
    content: Optional[str] = None
    text: Optional[str] = None
    sender: Optional[str] = None

class MockInterviewChatRequest(BaseModel):
    history: List[MockInterviewChatMessage] = []
    userMessage: Optional[str] = None
    user_message: Optional[str] = None
    company: Optional[str] = None
    companyName: Optional[str] = None
    topics: Optional[List[str]] = None
    selectedTopics: Optional[List[str]] = None
    experienceLevel: Optional[str] = None
    experience_level: Optional[str] = None
    format: Optional[str] = "HYBRID"

class MockInterviewChatResponse(BaseModel):
    response: str
    reply: str
    company: str
    experienceLevel: str
    experience_level: str
    status: str = "success"



