"""
Analytics and Dashboard API Routes - MongoDB Version
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from beanie import PydanticObjectId
from beanie.operators import In
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import logging
import traceback

from app.db.models import User, Exam, Question, Submission, Answer, UserRole
from app.agents.analytics import analytics_agent
from .auth import get_current_user, require_role

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _get_weekly_activity(
    submissions_query=None,
    user_query=None,
) -> List[Dict]:
    """Helper to get activity counts for the last 7 days."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC for safe comparison
    days = [
        (now - timedelta(days=i)).strftime("%a")
        for i in range(6, -1, -1)
    ]
    activity_map = {
        day: {"day": day, "users": 0, "assessments": 0, "submissions": 0}
        for day in days
    }
    start_date = now - timedelta(days=7)

    if submissions_query is not None:
        async for s in submissions_query:
            submitted = s.submitted_at
            if submitted:
                if submitted.tzinfo is not None:
                    submitted = submitted.replace(tzinfo=None)
                if submitted >= start_date:
                    day_name = submitted.strftime("%a")
                    if day_name in activity_map:
                        activity_map[day_name]["assessments"] += 1
                        activity_map[day_name]["submissions"] += 1

    if user_query is not None:
        async for u in user_query:
            created = u.created_at
            if created:
                if created.tzinfo is not None:
                    created = created.replace(tzinfo=None)
                if created >= start_date:
                    day_name = created.strftime("%a")
                    if day_name in activity_map:
                        activity_map[day_name]["users"] += 1

    return [activity_map[day] for day in days]


# ─────────────────────────────────────────────────────────────────────────────
# Student Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student/me")
async def get_my_analytics(user: User = Depends(get_current_user)):
    """Get current student's performance analytics and history."""
    submissions = await Submission.find(
        Submission.user_id == user.id,
        Submission.status == "graded",
    ).sort(-Submission.submitted_at).to_list()

    submission_data = [{"percentage": s.percentage, "total_score": s.total_score} for s in submissions]
    analytics = analytics_agent.calculate_student_performance(submission_data)

    # ── Bulk-fetch exams (avoid N+1) ──────────────────────────────────────
    exam_ids = [s.exam_id for s in submissions]
    exams_docs = await Exam.find(In(Exam.id, exam_ids)).to_list() if exam_ids else []
    exam_map: Dict[str, Exam] = {str(e.id): e for e in exams_docs}

    history = [
        {
            "id": str(s.id),
            "exam_title": exam_map.get(str(s.exam_id), {}).title
                          if str(s.exam_id) in exam_map else "Unknown Exam",
            "percentage": s.percentage,
            "total_score": s.total_score,
            "max_score": s.max_score,
            "submitted_at": s.submitted_at,
        }
        for s in submissions
    ]

    return {
        "user": user.username,
        "analytics": analytics,
        "history": history,
    }


@router.get("/exam/{exam_id}")
async def get_exam_analytics(
    exam_id: str,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Get exam performance analytics (Teacher/Admin only)."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Teacher ownership check
    if user.role.value == "teacher" and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only view analytics for your own exams.")

    submissions = await Submission.find(
        Submission.exam_id == exam.id,
        Submission.status == "graded",
    ).to_list()

    submission_data = [{"percentage": s.percentage} for s in submissions]
    exam_data = {"passing_score": exam.passing_score}

    analytics = analytics_agent.analyze_exam_performance(exam_data, submission_data)

    # ── Per-question difficulty analysis ─────────────────────────────────
    if submissions:
        sub_ids = [s.id for s in submissions]
        all_answers = await Answer.find(In(Answer.submission_id, sub_ids)).to_list()
        question_ids = list({a.question_id for a in all_answers})
        questions_docs = await Question.find(In(Question.id, question_ids)).to_list()
        q_map = {str(q.id): q for q in questions_docs}

        answer_records = [
            {
                "question_id": str(a.question_id),
                "question_text": q_map[str(a.question_id)].question_text if str(a.question_id) in q_map else "",
                "difficulty": q_map[str(a.question_id)].difficulty if str(a.question_id) in q_map else 0.5,
                "is_correct": a.is_correct,
                "score": a.score,
                "max_points": q_map[str(a.question_id)].points if str(a.question_id) in q_map else 1.0,
            }
            for a in all_answers
        ]

        analytics["question_difficulty"] = analytics_agent.analyze_question_difficulty(answer_records)
    else:
        analytics["question_difficulty"] = []

    return {"exam": exam.title, "analytics": analytics}


# ─────────────────────────────────────────────────────────────────────────────
# Teacher Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/teacher")
async def teacher_dashboard(user: User = Depends(require_role(["teacher", "admin"]))):
    """Get teacher dashboard overview."""
    logger.info(f"Dashboard request: user={user.username} (id={user.id})")
    try:
        # 1. Get teacher's exams
        exams = await Exam.find(Exam.created_by == user.id).to_list()
        exam_ids = [e.id for e in exams]

        if not exam_ids:
            return {
                "total_exams_created": 0,
                "total_submissions": 0,
                "exams": [],
                "student_submissions": [],
                "activity_data": await _get_weekly_activity(),
            }

        # 2. Get all graded submissions — ONE query
        query = {"exam_id": {"$in": exam_ids}, "status": "graded"}
        submissions = await Submission.find(query).sort(-Submission.submitted_at).to_list()

        # 3. Bulk-fetch all users and exams referenced by submissions (avoid N+1)
        user_ids = list({s.user_id for s in submissions})
        users_docs = await User.find(In(User.id, user_ids)).to_list() if user_ids else []
        user_map: Dict[str, User] = {str(u.id): u for u in users_docs}

        exam_map: Dict[str, Exam] = {str(e.id): e for e in exams}

        # 4. Build student_submissions list
        student_submissions = []
        for s in submissions:
            student = user_map.get(str(s.user_id))
            exam = exam_map.get(str(s.exam_id))
            submitted_at_str = s.submitted_at.isoformat() if s.submitted_at else None

            student_submissions.append({
                "id": str(s.id),
                "student_name": student.full_name if student else "Unknown",
                "student_username": student.username if student else "",
                "exam_title": exam.title if exam else "Unknown",
                "percentage": round(float(s.percentage), 1) if s.percentage is not None else 0.0,
                "submitted_at": submitted_at_str,
            })

        # 5. Exam stats — bulk count via aggregation style (one query per exam for counts)
        exam_stats = []
        for e in exams:
            try:
                q_count = await Question.find(Question.exam_id == e.id).count()
                s_count = await Submission.find(
                    {"exam_id": e.id, "status": "graded"}
                ).count()
                exam_stats.append({
                    "id": str(e.id),
                    "title": e.title,
                    "is_active": e.is_active,
                    "is_adaptive": e.is_adaptive,
                    "questions_count": q_count,
                    "total_questions": e.total_questions,
                    "submissions_count": s_count,
                })
            except Exception as ex:
                logger.error(f"Error calculating stats for exam {e.id}: {ex}")

        # 6. Weekly activity
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        activity_query = {"exam_id": {"$in": exam_ids}, "status": "graded", "submitted_at": {"$gte": start_date}}
        activity_data = await _get_weekly_activity(submissions_query=Submission.find(activity_query))

        return {
            "total_exams_created": len(exams),
            "total_submissions": len(submissions),
            "exams": exam_stats,
            "student_submissions": student_submissions,
            "activity_data": activity_data,
        }

    except Exception as e:
        logger.error(f"FATAL error in teacher_dashboard: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Dashboard calculation error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Admin Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/admin")
async def admin_dashboard(user: User = Depends(require_role(["admin"]))):
    """Get admin dashboard overview with enhanced metrics."""
    users = await User.find_all().to_list()
    exams = await Exam.find_all().to_list()
    submissions = await Submission.find_all().to_list()

    # Accessibility metrics
    accessibility_users = [u for u in users if u.accessibility_mode]

    # System status (basic/mock)
    system_status = {
        "database": "Healthy",
        "api_server": "Healthy",
        "latency_ms": 15,
        "uptime": "99.9%",
    }

    # Recent violations — bulk fetch
    subs_with_violations = await Submission.find(
        {"violations": {"$not": {"$size": 0}}}
    ).sort(-Submission.started_at).limit(10).to_list()

    # Bulk-fetch users and exams for violation records
    viol_user_ids = [s.user_id for s in subs_with_violations]
    viol_exam_ids = [s.exam_id for s in subs_with_violations]
    v_users = await User.find(In(User.id, viol_user_ids)).to_list() if viol_user_ids else []
    v_exams = await Exam.find(In(Exam.id, viol_exam_ids)).to_list() if viol_exam_ids else []
    v_user_map = {str(u.id): u for u in v_users}
    v_exam_map = {str(e.id): e for e in v_exams}

    recent_violations = []
    for s in subs_with_violations:
        u = v_user_map.get(str(s.user_id))
        e = v_exam_map.get(str(s.exam_id))
        for v in s.violations:
            recent_violations.append({
                "user": u.username if u else "Unknown",
                "exam": e.title if e else "Deleted Exam",
                "event": v.get("event_type", "Unknown"),
                "timestamp": v.get("timestamp", ""),
            })

    activity_data = await _get_weekly_activity(
        submissions_query=Submission.find(Submission.status == "graded"),
        user_query=User.find_all(),
    )

    return {
        "total_users": len(users),
        "total_exams": len(exams),
        "total_submissions": len(submissions),
        "users_by_role": {
            "students": sum(1 for u in users if u.role == UserRole.STUDENT),
            "teachers": sum(1 for u in users if u.role == UserRole.TEACHER),
            "admins": sum(1 for u in users if u.role == UserRole.ADMIN),
        },
        "accessibility_metrics": {
            "enabled_count": len(accessibility_users),
            "total_users": len(users),
            "usage_percentage": round((len(accessibility_users) / len(users) * 100), 1) if users else 0,
        },
        "system_status": system_status,
        "recent_violations": recent_violations[:10],
        "activity_data": activity_data,
    }
