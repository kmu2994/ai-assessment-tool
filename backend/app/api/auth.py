"""
Authentication API Routes - MongoDB Version
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import List
from beanie import PydanticObjectId
from beanie.operators import In

from app.db.models import User, UserRole, Exam, Question, Submission, Answer
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token, oauth2_scheme
from app.core.config import settings
from .schemas import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check existing username
    existing_user = await User.find_one(User.username == user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Check existing email
    existing_email = await User.find_one(User.email == user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole(user_data.role.value),
        accessibility_mode=user_data.accessibility_mode,
    )
    await user.insert()

    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        accessibility_mode=user.accessibility_mode,
    )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token. Accepts username or email."""
    # Try to find user by username first, then by email
    user = await User.find_one(User.username == form_data.username)
    if not user:
        user = await User.find_one(User.email == form_data.username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    user_response = UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        accessibility_mode=user.accessibility_mode,
    )

    return Token(access_token=access_token, user=user_response)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current authenticated user."""
    payload = decode_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        accessibility_mode=current_user.accessibility_mode,
    )


def require_role(allowed_roles: list):
    """Dependency to check user role."""
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role.value not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker


# ============== ADMIN ONLY ROUTES ==============

@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: User = Depends(require_role(["admin", "teacher"]))):
    """List all users (Admin/Teacher only)."""
    users = await User.find_all().to_list()
    return [
        UserResponse(
            id=str(u.id),
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            accessibility_mode=u.accessibility_mode,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    new_role: str,
    admin: User = Depends(require_role(["admin", "teacher"])),
):
    """Update a user's role (Admin/Teacher only)."""
    if new_role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Role permission guard ──────────────────────────────────────────────
    if admin.role.value == "teacher":
        # Teachers may ONLY manage existing students (not other teachers or admins)
        if user.role.value != "student":
            raise HTTPException(
                status_code=403,
                detail="Teachers can only manage users with the 'student' role.",
            )
        # Teachers can only assign the student role
        if new_role != "student":
            raise HTTPException(
                status_code=403,
                detail="Teachers can only assign the 'student' role.",
            )

    # ── Safety: cannot demote the last admin ──────────────────────────────
    if user.role == UserRole.ADMIN and new_role != "admin":
        admin_count = await User.find(User.role == UserRole.ADMIN).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last administrator. Promote another user first.",
            )

    user.role = UserRole(new_role)
    await user.save()

    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        accessibility_mode=user.accessibility_mode,
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_role(["admin"])),
):
    """Delete a user and ALL associated records — cascade delete (Admin only)."""
    user = await User.get(PydanticObjectId(user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deletion
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Admins cannot delete themselves")

    # Safety check: Cannot delete the last administrator
    if user.role.value == "admin":
        admin_count = await User.find(User.role == UserRole.ADMIN).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last administrator. Promote another user first.",
            )

    uid = user.id

    # ── Cascade delete all associated records ──────────────────────────────
    # 1. Delete answers for all submissions by this user
    submissions = await Submission.find(Submission.user_id == uid).to_list()
    submission_ids = [s.id for s in submissions]
    if submission_ids:
        await Answer.find(In(Answer.submission_id, submission_ids)).delete()

    # 2. Delete all submissions by this user
    await Submission.find(Submission.user_id == uid).delete()

    # 3. If user is a teacher/admin, delete exams they created + cascade
    exams_created = await Exam.find(Exam.created_by == uid).to_list()
    for exam in exams_created:
        # Delete answers for submissions on this exam
        exam_subs = await Submission.find(Submission.exam_id == exam.id).to_list()
        exam_sub_ids = [s.id for s in exam_subs]
        if exam_sub_ids:
            await Answer.find(In(Answer.submission_id, exam_sub_ids)).delete()
        await Submission.find(Submission.exam_id == exam.id).delete()
        await Question.find(Question.exam_id == exam.id).delete()
        await exam.delete()

    # 4. Delete the user
    await user.delete()

    return {
        "message": f"User '{user.username}' and all associated records deleted successfully.",
        "deleted_submissions": len(submissions),
        "deleted_exams": len(exams_created),
    }
