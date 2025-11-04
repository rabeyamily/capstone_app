"""
API request/response models.
"""
from typing import Optional
from pydantic import BaseModel, Field
from app.models.schemas import SkillExtractionResult, SkillGapReport


class UploadResumeResponse(BaseModel):
    """Response model for resume upload."""
    file_id: str = Field(..., description="Unique identifier for uploaded file")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="File type (pdf, docx, txt)")
    status: str = Field(default="success", description="Upload status")


class TextInputRequest(BaseModel):
    """Request model for text input (resume or JD)."""
    text: str = Field(..., min_length=10, description="Text content")
    source_type: str = Field(..., description="Type: 'resume' or 'job_description'")


class TextInputResponse(BaseModel):
    """Response model for text input."""
    text_id: str = Field(..., description="Unique identifier for text input")
    text_length: int = Field(..., description="Length of text")
    status: str = Field(default="success", description="Input status")


class ExtractSkillsRequest(BaseModel):
    """Request model for skill extraction."""
    resume_text: Optional[str] = Field(None, description="Resume text to analyze")
    job_description_text: Optional[str] = Field(None, description="Job description text to analyze")
    resume_id: Optional[str] = Field(None, description="Resume ID if already uploaded")
    jd_id: Optional[str] = Field(None, description="Job description ID if already uploaded")


class ExtractSkillsResponse(BaseModel):
    """Response model for skill extraction."""
    resume_skills: SkillExtractionResult = Field(..., description="Extracted skills from resume")
    jd_skills: SkillExtractionResult = Field(..., description="Extracted skills from job description")
    extraction_time: float = Field(..., description="Time taken for extraction in seconds")


class AnalyzeGapRequest(BaseModel):
    """Request model for gap analysis."""
    resume_skills: SkillExtractionResult = Field(..., description="Resume skills")
    jd_skills: SkillExtractionResult = Field(..., description="Job description skills")
    weights: Optional[dict] = Field(None, description="Optional custom weights for scoring")


class AnalyzeGapResponse(BaseModel):
    """Response model for gap analysis."""
    report: SkillGapReport = Field(..., description="Complete gap analysis report")
    analysis_time: float = Field(..., description="Time taken for analysis in seconds")

