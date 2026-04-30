"""
Pydantic Schemas for API Request/Response - MongoDB Version
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
import re
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    accessibility_mode: bool = False

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    accessibility_mode: bool = False
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str = "mcq"
    difficulty: float = Field(0.5, ge=0.0, le=1.0)
    points: float = 1.0
    options: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    model_answer: Optional[str] = None
    source: str = "MANUAL"

class QuestionResponse(BaseModel):
    id: Optional[str] = None
    question_text: str
    question_type: str
    difficulty: float
    points: float
    options: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    model_answer: Optional[str] = None
    source: str = "MANUAL"
    
    class Config:
        from_attributes = True

class ExamCreate(BaseModel):
    title: str
    subject: str = ""
    description: Optional[str] = None
    type: str = "MCQ"
    is_active: bool = True
    is_adaptive: bool = True
    duration_minutes: int = 60
    total_questions: Optional[int] = None
    total_marks: float = 100.0
    passing_score: float = 40.0
    scheduled_at: Optional[datetime] = None
    questions: List[QuestionCreate] = []

class ExamResponse(BaseModel):
    id: str
    title: str
    subject: str = "General"
    description: Optional[str] = None
    type: str = "MCQ"
    is_adaptive: bool = True
    duration_minutes: int = 60
    total_questions: int = 0
    total_marks: float = 100.0
    passing_score: float = 40.0
    is_active: bool = True
    has_submitted: bool = False
    created_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ExtractTextResponse(BaseModel):
    text: str
    filename: str

class AIQuestionRequest(BaseModel):
    text: str
    type: str = "MCQ"  # "MCQ" or "DESCRIPTIVE"
    count: int = 5
    difficulty: str = "Medium"  # "Easy", "Medium", "Hard", "Mixed"
    total_marks: Optional[float] = None

class AnswerSubmit(BaseModel):
    question_id: str
    answer: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    status: str
    total_score: float = 0.0
    percentage: float = 0.0
    
    class Config:
        from_attributes = True

class GradingResult(BaseModel):
    success: bool = True
    is_correct: bool = False
    score: float = 0.0
    feedback: str = ""
    similarity: Optional[float] = None
    plagiarism_detected: bool = False
    next_question: Optional[Dict[str, Any]] = None
    exam_complete: bool = False

class AnswerReview(BaseModel):
    answer_id: str
    modified_score: float
    teacher_remarks: Optional[str] = None

class SubmissionReview(BaseModel):
    submission_id: str
    teacher_remarks: Optional[str] = None
    answer_reviews: List[AnswerReview] = []
    is_finalized: bool = True

class ProctorEvent(BaseModel):
    event_type: str  # "tab_switch", "copy_paste", "full_screen_exit"
    details: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
