"""
MongoDB Database Connection using Motor and Beanie ODM
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_assessment")

# Global client instance
client: AsyncIOMotorClient = None


async def connect_db():
    """Initialize MongoDB connection and Beanie ODM."""
    global client
    
    # Import models here to avoid circular imports
    from app.db.models import User, Exam, Question, Submission, Answer, QuestionBank
    
    client = AsyncIOMotorClient(MONGODB_URL)
    
    await init_beanie(
        database=client[DATABASE_NAME],
        document_models=[User, Exam, Question, Submission, Answer, QuestionBank]
    )
    
    print(f"Connected to MongoDB: {DATABASE_NAME}")


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


async def get_database():
    """Get database instance."""
    return client[DATABASE_NAME]
