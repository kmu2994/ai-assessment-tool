"""
FastAPI Application Entry Point
AI-Driven Inclusive Assessment System with MongoDB
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.database import connect_db, close_db
from app.api import auth, exams, analytics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting AI Inclusive Assessment System...")
    
    # Connect to MongoDB
    await connect_db()
    logger.info("MongoDB connected and initialized.")
    
    # Pre-load AI models
    logger.info("Loading AI models (this may take a moment)...")
    try:
        from app.agents.semantic_grader import grading_agent
        logger.info("AI models loaded successfully!")
    except Exception as e:
        logger.warning(f"AI models not loaded (using mock): {e}")
    
    yield
    
    # Cleanup
    await close_db()
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Driven Inclusive Assessment System with Adaptive Testing and Accessibility Features",
    version="1.0.0",
    lifespan=lifespan
)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "AI-Driven Inclusive Assessment System",
        "version": "1.0.0",
        "database": "MongoDB",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "mongodb"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
