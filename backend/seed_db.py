"""
MongoDB Database Seeder
Seeds the database with initial demo data.

Usage:
    cd backend
    python seed_db.py
"""
import asyncio
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# Use proper logging instead of print()
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Import ALL models (including QuestionBank — needed for Beanie index creation)
from app.db.models import User, Exam, Question, Submission, Answer, UserRole, QuestionBank

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_assessment")


async def seed_database():
    """Seed the database with demo data."""
    logger.info(f"Connecting to MongoDB at {MONGODB_URL}...")

    client = AsyncIOMotorClient(MONGODB_URL)

    # Register ALL document models (including QuestionBank)
    await init_beanie(
        database=client[DATABASE_NAME],
        document_models=[User, Exam, Question, Submission, Answer, QuestionBank],
    )

    logger.info("Connected! Checking existing data...")

    # Guard: Don't re-seed if admin already exists
    existing_admin = await User.find_one(User.username == "admin")
    if existing_admin:
        logger.info("[SKIP] Database already seeded. Delete manually to re-seed.")
        logger.info("Existing accounts: admin / teacher / student")
        client.close()
        return

    logger.info("Creating users...")

    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash=pwd_context.hash("Admin@123"),
        full_name="System Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    await admin.insert()

    teacher = User(
        username="teacher",
        email="teacher@example.com",
        password_hash=pwd_context.hash("Teacher@123"),
        full_name="Demo Teacher",
        role=UserRole.TEACHER,
        is_active=True,
    )
    await teacher.insert()

    student = User(
        username="student",
        email="student@example.com",
        password_hash=pwd_context.hash("Student@123"),
        full_name="Demo Student",
        role=UserRole.STUDENT,
        is_active=True,
        accessibility_mode=True,
    )
    await student.insert()

    logger.info("Creating sample exam...")

    exam = Exam(
        title="Introduction to Computer Science",
        subject="Computer Science",
        description="Basic concepts in computer science and programming",
        created_by=teacher.id,
        is_active=True,
        is_adaptive=True,
        duration_minutes=30,
        total_questions=5,
        total_marks=7.0,     # 3 MCQs × 1pt + 2 descriptive × 2pt
        passing_score=40.0,
    )
    await exam.insert()

    logger.info("Creating questions...")

    # ── FIX: correct_answer must be the OPTION VALUE (not the key letter) ──
    # The orchestrator compares student_answer (option value from frontend) to
    # correct_answer stored in the DB. Both must be the full option text.
    questions_data = [
        {
            "question_text": "What does CPU stand for?",
            "question_type": "mcq",
            "difficulty": 0.2,
            "points": 1.0,
            "options": {
                "A": "Central Processing Unit",
                "B": "Computer Personal Unit",
                "C": "Central Program Utility",
                "D": "Computer Processing Unit",
            },
            # FIX: store the full option value, not just the key "A"
            "correct_answer": "Central Processing Unit",
        },
        {
            "question_text": "Which of the following is a high-level programming language?",
            "question_type": "mcq",
            "difficulty": 0.3,
            "points": 1.0,
            "options": {
                "A": "HTML",
                "B": "Python",
                "C": "CSS",
                "D": "Assembly",
            },
            "correct_answer": "Python",
        },
        {
            "question_text": "What is the binary representation of decimal 10?",
            "question_type": "mcq",
            "difficulty": 0.5,
            "points": 1.0,
            "options": {
                "A": "1010",
                "B": "1100",
                "C": "1001",
                "D": "1110",
            },
            "correct_answer": "1010",
        },
        {
            "question_text": "What is an algorithm?",
            "question_type": "descriptive",
            "difficulty": 0.4,
            "points": 2.0,
            "model_answer": (
                "An algorithm is a step-by-step procedure or formula for solving a problem. "
                "It is a finite sequence of well-defined instructions that takes some input "
                "and produces a correct output or achieves a goal."
            ),
        },
        {
            "question_text": "Explain the concept of a variable in programming.",
            "question_type": "descriptive",
            "difficulty": 0.6,
            "points": 2.0,
            "model_answer": (
                "A variable is a named storage location in computer memory that holds a value "
                "which can change during program execution. Variables have a name (identifier), "
                "a data type (integer, string, float, etc.), and a value. They allow programs "
                "to store, retrieve, and manipulate data dynamically."
            ),
        },
    ]

    for q_data in questions_data:
        question = Question(
            exam_id=exam.id,
            question_text=q_data["question_text"],
            question_type=q_data["question_type"],
            difficulty=q_data["difficulty"],
            points=q_data["points"],
            options=q_data.get("options"),
            correct_answer=q_data.get("correct_answer"),
            model_answer=q_data.get("model_answer"),
        )
        await question.insert()

    logger.info("Creating sample graded submission for analytics history...")

    submission = Submission(
        user_id=student.id,
        exam_id=exam.id,
        status="graded",
        current_ability=0.5,
        total_score=5.5,
        max_score=7.0,
        percentage=78.6,
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
        is_finalized=True,
    )
    await submission.insert()

    logger.info("=" * 50)
    logger.info("[OK] Database seeded successfully!")
    logger.info("=" * 50)
    logger.info("Test Accounts Created:")
    logger.info("  admin   / Admin@123    (Admin)")
    logger.info("  teacher / Teacher@123  (Teacher)")
    logger.info("  student / Student@123  (Student — accessibility mode ON)")
    logger.info(f"Sample Exam: '{exam.title}' ({len(questions_data)} questions)")
    logger.info("=" * 50)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
