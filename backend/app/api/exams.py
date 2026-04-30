"""
Exam Management API Routes — Aggregator
Includes all exam-related sub-routers under the /exams prefix.
"""
from fastapi import APIRouter

from .exam_crud import router as crud_router
from .exam_session import router as session_router
from .exam_review import router as review_router
from .question_bank import router as qbank_router

router = APIRouter(prefix="/exams", tags=["Exams"])

# Include all sub-routers (they share the /exams prefix)
router.include_router(crud_router)
router.include_router(session_router)
router.include_router(review_router)
router.include_router(qbank_router)
