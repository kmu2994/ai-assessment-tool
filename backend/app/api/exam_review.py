"""
Exam Review API Routes — Submission details and teacher review.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from beanie import PydanticObjectId
from beanie.operators import In
import logging

from app.db.models import User, Exam, Question, Submission, Answer
from .auth import get_current_user, require_role
from .schemas import SubmissionReview

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Exam Review"])


@router.get("/submission/{submission_id}")
async def get_submission(
    submission_id: str,
    user: User = Depends(get_current_user),
):
    """Get full details of a submission including answers for review."""
    submission = await Submission.get(PydanticObjectId(submission_id))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Permission: own submission or Teacher/Admin
    if user.role.value == "student" and submission.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions.")

    exam = await Exam.get(submission.exam_id)
    answers_docs = await Answer.find(Answer.submission_id == submission.id).to_list()

    # ── Bulk-fetch associated questions (avoids N+1) ──────────────────────
    question_ids = [a.question_id for a in answers_docs]
    if question_ids:
        questions_docs = await Question.find(In(Question.id, question_ids)).to_list()
        question_map: Dict[str, Question] = {str(q.id): q for q in questions_docs}
    else:
        question_map = {}

    results = []
    for ans in answers_docs:
        q = question_map.get(str(ans.question_id))
        results.append({
            "answer_id": str(ans.id),
            "question_text": q.question_text if q else "Question deleted",
            "question_type": q.question_type if q else "mcq",
            "student_answer": ans.student_answer,
            "extracted_text": ans.extracted_text,
            "model_answer": q.model_answer if q else None,
            "correct_answer": q.correct_answer if q else None,
            "ai_score": ans.original_ai_score,
            "current_score": ans.score,
            "max_points": q.points if q else 1.0,
            "feedback": ans.feedback,
            "teacher_remarks": ans.teacher_remarks,
            "plagiarism_detected": ans.plagiarism_detected,
            "image_url": (
                f"/api/{ans.image_path.replace(chr(92), '/')}" if ans.image_path else None
            ),
        })

    return {
        "submission_id": str(submission.id),
        "exam_title": exam.title if exam else "Exam deleted",
        "student_id": str(submission.user_id),
        "status": submission.status,
        "total_score": submission.total_score,
        "max_score": submission.max_score,
        "percentage": submission.percentage,
        "is_finalized": submission.is_finalized,
        "teacher_remarks": submission.teacher_remarks,
        "answers": results,
    }


@router.post("/review")
async def review_submission(
    review_data: SubmissionReview,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Teacher review endpoint: Modify scores, add remarks, and finalize results."""
    submission = await Submission.get(PydanticObjectId(review_data.submission_id))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # ── Ownership guard: teacher may only review their own exams ──────────
    if user.role.value == "teacher":
        exam = await Exam.get(submission.exam_id)
        if not exam or exam.created_by != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only review submissions for your own exams.",
            )

    total_score = 0.0
    max_score = 0.0

    # Bulk-fetch questions for max-score recalculation
    answer_ids = [PydanticObjectId(ar.answer_id) for ar in review_data.answer_reviews]
    answers_docs = await Answer.find(In(Answer.id, answer_ids)).to_list()
    answer_map = {str(a.id): a for a in answers_docs}

    question_ids = [a.question_id for a in answers_docs]
    if question_ids:
        questions_docs = await Question.find(In(Question.id, question_ids)).to_list()
        question_map: Dict[str, Question] = {str(q.id): q for q in questions_docs}
    else:
        question_map = {}

    for ar in review_data.answer_reviews:
        answer = answer_map.get(ar.answer_id)
        if answer:
            answer.score = ar.modified_score
            answer.teacher_remarks = ar.teacher_remarks
            await answer.save()
            total_score += answer.score

            q = question_map.get(str(answer.question_id))
            if q:
                max_score += q.points

    submission.total_score = total_score
    if max_score > 0:
        submission.max_score = max_score
        submission.percentage = (submission.total_score / submission.max_score) * 100

    submission.teacher_remarks = review_data.teacher_remarks
    submission.is_finalized = review_data.is_finalized
    submission.status = "graded" if review_data.is_finalized else "reviewing"

    await submission.save()
    return {"message": "Submission reviewed successfully", "final_score": submission.total_score}
