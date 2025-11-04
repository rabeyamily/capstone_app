# API routes package
from fastapi import APIRouter

router = APIRouter()


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working."""
    return {"message": "API is working!", "status": "success"}

