"""
Exam Session API Routes — Start, Answer, Upload, Finish, Proctor events.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Dict
from beanie import PydanticObjectId
from beanie.operators import In
from datetime import datetime, timezone
import os
import logging
import traceback

from app.db.models import User, Exam, Question, Submission, Answer
from app.agents.orchestrator import orchestrator
from .auth import get_current_user
from .schemas import AnswerSubmit, GradingResult, ProctorEvent

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Exam Session"])


def _question_to_dict(q: Question) -> dict:
    """Serialize a Question document to the minimal dict used by agents."""
    return {
        "id": str(q.id),
        "difficulty": q.difficulty,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "options": q.options,
        "points": q.points,
    }


@router.post("/{exam_id}/start")
async def start_exam(exam_id: str, user: User = Depends(get_current_user)):
    """Start an exam session."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not exam.is_active:
        raise HTTPException(status_code=400, detail="This exam is not currently active.")

    # ── Guard: prevent duplicate in-progress sessions ─────────────────────
    existing_session = await Submission.find_one(
        Submission.user_id == user.id,
        Submission.exam_id == exam.id,
        Submission.status == "in_progress",
    )
    if existing_session:
        logger.info(
            f"Resuming existing session {existing_session.id} "
            f"for user {user.username} on exam {exam_id}."
        )
        # Resume the existing session instead of creating a new one
        questions_docs = await Question.find(Question.exam_id == exam.id).to_list()
        answered_docs = await Answer.find(Answer.submission_id == existing_session.id).to_list()
        answered_ids = {str(a.question_id) for a in answered_docs}

        questions = [_question_to_dict(q) for q in questions_docs]
        remaining = [q for q in questions if q["id"] not in answered_ids]

        first_question = remaining[0] if remaining else None

        return {
            "submission_id": str(existing_session.id),
            "exam": {
                "id": str(exam.id),
                "title": exam.title,
                "description": exam.description,
                "is_adaptive": exam.is_adaptive,
                "duration_minutes": exam.duration_minutes,
                "total_questions": exam.total_questions,
            },
            "first_question": first_question,
            "total_questions": exam.total_questions,
            "duration_minutes": exam.duration_minutes,
            "resumed": True,
        }

    # Create new submission
    questions_docs = await Question.find(Question.exam_id == exam.id).to_list()
    submission = Submission(
        user_id=user.id,
        exam_id=exam.id,
        status="in_progress",
        current_ability=0.5,
    )
    await submission.insert()

    questions = [_question_to_dict(q) for q in questions_docs]

    session_info = await orchestrator.start_exam_session(
        str(user.id), str(exam.id), questions, exam.is_adaptive
    )

    return {
        "submission_id": str(submission.id),
        "exam": {
            "id": str(exam.id),
            "title": exam.title,
            "description": exam.description,
            "is_adaptive": exam.is_adaptive,
            "duration_minutes": exam.duration_minutes,
            "total_questions": exam.total_questions,
        },
        "first_question": session_info.get("first_question"),
        "total_questions": exam.total_questions,
        "duration_minutes": exam.duration_minutes,
        "resumed": False,
    }


@router.post("/{submission_id}/answer", response_model=GradingResult)
async def submit_answer(
    submission_id: str,
    answer_data: AnswerSubmit,
    user: User = Depends(get_current_user),
):
    """Submit an answer for grading."""
    try:
        submission = await Submission.get(PydanticObjectId(submission_id))
        if not submission or submission.user_id != user.id:
            raise HTTPException(status_code=404, detail="Submission not found")

        if submission.status != "in_progress":
            raise HTTPException(status_code=400, detail="This exam session is already finished.")

        question = await Question.get(PydanticObjectId(answer_data.question_id))
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        question_dict = {
            "question_type": question.question_type,
            "correct_answer": question.correct_answer,
            "model_answer": question.model_answer,
            "points": question.points,
        }

        grading = await orchestrator.process_answer(question_dict, answer_data.answer or "")

        answer = Answer(
            submission_id=submission.id,
            question_id=question.id,
            student_answer=answer_data.answer,
            is_correct=grading.get("is_correct", False),
            score=grading.get("score", 0),
            original_ai_score=grading.get("score", 0),
            similarity_score=grading.get("similarity"),
            feedback=grading.get("feedback", ""),
        )
        await answer.insert()

        # ── Determine next question ────────────────────────────────────────
        exam = await Exam.get(submission.exam_id)
        questions_docs = await Question.find(Question.exam_id == exam.id).to_list()

        # Bulk fetch all answered IDs for this submission
        answered_docs = await Answer.find(Answer.submission_id == submission.id).to_list()
        answered_ids = [str(a.question_id) for a in answered_docs]

        next_question = None
        exam_complete = False

        if len(answered_ids) >= exam.total_questions:
            exam_complete = True
        elif exam.is_adaptive:
            questions_list = [_question_to_dict(q) for q in questions_docs]
            adaptive_data = await orchestrator.get_next_question(
                questions=questions_list,
                current_ability=submission.current_ability,
                answered_ids=answered_ids,
                last_answer_correct=grading.get("is_correct", False),
                last_difficulty=question.difficulty,
            )
            submission.current_ability = adaptive_data["current_ability"]
            next_question = adaptive_data["next_question"]
            exam_complete = adaptive_data["exam_complete"]
        else:
            # Sequential flow
            sorted_questions = sorted(questions_docs, key=lambda x: x.id)
            current_q_index = next(
                (i for i, q in enumerate(sorted_questions) if str(q.id) == answer_data.question_id),
                -1,
            )
            if current_q_index != -1 and current_q_index + 1 < len(sorted_questions):
                nq = sorted_questions[current_q_index + 1]
                next_question = _question_to_dict(nq)
            else:
                exam_complete = True

        await submission.save()

        return {
            **grading,
            "next_question": next_question,
            "exam_complete": exam_complete,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in submit_answer: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{submission_id}/finish")
async def finish_exam(submission_id: str, user: User = Depends(get_current_user)):
    """Finish exam and get final results."""
    submission = await Submission.get(PydanticObjectId(submission_id))
    if not submission or submission.user_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.status == "graded":
        raise HTTPException(status_code=400, detail="Exam already finalized.")

    answers_docs = await Answer.find(Answer.submission_id == submission.id).to_list()

    # ── Bulk-fetch questions to avoid N+1 ────────────────────────────────
    question_ids = [a.question_id for a in answers_docs]
    questions_docs = await Question.find(In(Question.id, question_ids)).to_list()
    question_map: Dict[str, Question] = {str(q.id): q for q in questions_docs}

    answers = []
    for a in answers_docs:
        q = question_map.get(str(a.question_id))
        max_pts = q.points if q else 1.0
        answers.append({
            "score": a.score,
            "is_correct": a.is_correct,
            "max_points": max_pts,
        })

    final_result = await orchestrator.finish_exam(str(submission.id), answers)

    submission.status = "graded"
    submission.total_score = final_result["total_score"]
    submission.max_score = final_result["max_score"]
    submission.percentage = final_result["percentage"]
    submission.submitted_at = datetime.now(timezone.utc)
    submission.is_finalized = True
    await submission.save()

    return final_result


@router.post("/{submission_id}/upload-answer", response_model=GradingResult)
async def upload_answer(
    submission_id: str,
    question_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image/PDF answer sheet for AI analysis."""
    try:
        submission = await Submission.get(PydanticObjectId(submission_id))
        if not submission or submission.user_id != user.id:
            raise HTTPException(status_code=404, detail="Submission not found")

        if submission.status != "in_progress":
            raise HTTPException(status_code=400, detail="This exam session is already finished.")

        question = await Question.get(PydanticObjectId(question_id))
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        content = await file.read()

        # Save file to disk
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{submission_id}_{question_id}_{datetime.now(timezone.utc).timestamp()}{file_ext}"
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as f:
            f.write(content)

        question_dict = {
            "question_type": question.question_type,
            "correct_answer": question.correct_answer,
            "model_answer": question.model_answer,
            "points": question.points,
        }

        grading = await orchestrator.process_answer(
            question=question_dict,
            student_answer="",
            image_bytes=content,
        )

        answer = Answer(
            submission_id=submission.id,
            question_id=question.id,
            student_answer=grading.get("extracted_text", ""),
            extracted_text=grading.get("extracted_text", ""),
            image_path=file_path,
            is_correct=grading.get("is_correct", False),
            score=grading.get("score", 0),
            original_ai_score=grading.get("score", 0),
            feedback=grading.get("feedback", ""),
        )
        await answer.insert()

        # Determine next question
        exam = await Exam.get(submission.exam_id)
        questions_docs = await Question.find(Question.exam_id == exam.id).to_list()
        answered_docs = await Answer.find(Answer.submission_id == submission.id).to_list()
        answered_ids = [str(a.question_id) for a in answered_docs]

        exam_complete = len(answered_ids) >= exam.total_questions
        next_question = None

        if not exam_complete:
            if exam.is_adaptive:
                questions_list = [_question_to_dict(q) for q in questions_docs]
                adaptive_data = await orchestrator.get_next_question(
                    questions=questions_list,
                    current_ability=submission.current_ability,
                    answered_ids=answered_ids,
                    last_answer_correct=grading.get("is_correct", False),
                    last_difficulty=question.difficulty,
                )
                submission.current_ability = adaptive_data["current_ability"]
                next_question = adaptive_data["next_question"]
                exam_complete = adaptive_data["exam_complete"]
                await submission.save()
            else:
                sorted_qs = sorted(questions_docs, key=lambda x: x.id)
                current_idx = next(
                    (i for i, q in enumerate(sorted_qs) if str(q.id) == question_id), -1
                )
                if current_idx != -1 and current_idx + 1 < len(sorted_qs):
                    nq = sorted_qs[current_idx + 1]
                    next_question = _question_to_dict(nq)
                else:
                    exam_complete = True

        return {
            **grading,
            "next_question": next_question,
            "exam_complete": exam_complete,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_answer: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{submission_id}/proctor/event")
async def log_proctor_event(
    submission_id: str,
    event: ProctorEvent,
    user: User = Depends(get_current_user),
):
    """Log a proctoring event (tab switch, etc.) for a submission."""
    submission = await Submission.get(PydanticObjectId(submission_id))
    if not submission or str(submission.user_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.status != "in_progress":
        return {"message": "Submission already finished"}

    submission.violations.append(event.dict())
    await submission.save()

    logger.warning(
        f"Proctoring violation: user={user.username}, "
        f"event={event.event_type}, submission={submission_id}"
    )
    return {"message": "Event logged successfully", "total_violations": len(submission.violations)}
