"""
Skill extraction API endpoints.
"""
import time
from fastapi import APIRouter, HTTPException
from app.models.api_models import ExtractSkillsRequest, ExtractSkillsResponse
from app.models.schemas import SkillExtractionResult
from app.services.unified_extraction import unified_skill_extractor

router = APIRouter()


@router.post("/extract", response_model=ExtractSkillsResponse)
async def extract_skills(request: ExtractSkillsRequest):
    """
    Extract skills from resume and/or job description text.
    
    Args:
        request: ExtractSkillsRequest with text or file IDs
        
    Returns:
        ExtractSkillsResponse with extracted skills
    """
    start_time = time.time()
    
    resume_result = None
    jd_result = None
    
    # Handle resume extraction
    if request.resume_id:
        # Extract from file ID
        resume_result, error = unified_skill_extractor.extract_from_file_id(request.resume_id)
        if error:
            raise HTTPException(status_code=400, detail=f"Resume extraction error: {error}")
    elif request.resume_text:
        # Extract from text
        resume_result, error = unified_skill_extractor.extract_from_text(
            request.resume_text,
            source_type="resume"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Resume extraction error: {error}")
    else:
        raise HTTPException(
            status_code=400,
            detail="Either resume_text or resume_id must be provided"
        )
    
    # Handle job description extraction
    if request.jd_id:
        # Extract from file ID
        jd_result, error = unified_skill_extractor.extract_from_file_id(request.jd_id)
        if error:
            raise HTTPException(status_code=400, detail=f"Job description extraction error: {error}")
    elif request.job_description_text:
        # Extract from text
        jd_result, error = unified_skill_extractor.extract_from_text(
            request.job_description_text,
            source_type="job_description"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Job description extraction error: {error}")
    
    # At least one must be provided
    if not resume_result and not jd_result:
        raise HTTPException(
            status_code=400,
            detail="At least one of resume_text/resume_id or job_description_text/jd_id must be provided"
        )
    
    # Create default empty result if one is missing
    if not resume_result:
        resume_result = SkillExtractionResult(
            skills=[],
            education=[],
            certifications=[],
            extraction_method="llm",
            raw_text=""
        )
    
    if not jd_result:
        jd_result = SkillExtractionResult(
            skills=[],
            education=[],
            certifications=[],
            extraction_method="llm",
            raw_text=""
        )
    
    extraction_time = time.time() - start_time
    
    return ExtractSkillsResponse(
        resume_skills=resume_result,
        jd_skills=jd_result,
        extraction_time=extraction_time
    )


@router.post("/extract/resume")
async def extract_resume_skills(text: str):
    """
    Extract skills from resume text only.
    
    Args:
        text: Resume text
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_text(text, source_type="resume")
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result


@router.post("/extract/job-description")
async def extract_jd_skills(text: str):
    """
    Extract skills from job description text only.
    
    Args:
        text: Job description text
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_text(text, source_type="job_description")
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result


@router.post("/extract/file/{file_id}")
async def extract_skills_from_file(file_id: str):
    """
    Extract skills from an uploaded file.
    
    Args:
        file_id: File identifier
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_file_id(file_id)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result

