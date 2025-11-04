"""
File parsing API endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.services.file_parser import file_parser_service
from app.utils.file_storage import file_storage

router = APIRouter()


@router.post("/parse/{file_id}")
async def parse_file(file_id: str):
    """
    Parse an uploaded file and extract text.
    
    Args:
        file_id: Unique file identifier
        
    Returns:
        Parsing result with extracted text length
    """
    # Check if file exists
    file_data = file_storage.get_file(file_id)
    
    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="File not found or session expired"
        )
    
    # Parse file
    success, error_message = file_parser_service.parse_file(file_id)
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail=error_message or "Failed to parse file"
        )
    
    # Get updated file data
    updated_file_data = file_storage.get_file(file_id)
    
    if not updated_file_data or not updated_file_data.get("parsed_text"):
        raise HTTPException(
            status_code=500,
            detail="File parsed but text not available"
        )
    
    parsed_text = updated_file_data["parsed_text"]
    
    return {
        "file_id": file_id,
        "status": "success",
        "text_length": len(parsed_text),
        "filename": file_data["filename"],
        "file_type": file_data["file_type"],
        "preview": parsed_text[:500] if len(parsed_text) > 500 else parsed_text,  # First 500 chars
    }


@router.get("/parse/{file_id}/text")
async def get_parsed_text(file_id: str):
    """
    Get parsed text from a file.
    
    Args:
        file_id: Unique file identifier
        
    Returns:
        Extracted text
    """
    file_data = file_storage.get_file(file_id)
    
    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="File not found or session expired"
        )
    
    parsed_text = file_data.get("parsed_text")
    
    if not parsed_text:
        raise HTTPException(
            status_code=404,
            detail="File has not been parsed yet. Call POST /api/parse/{file_id} first."
        )
    
    return {
        "file_id": file_id,
        "text": parsed_text,
        "text_length": len(parsed_text),
        "filename": file_data["filename"],
    }

