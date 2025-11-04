"""
Unified skill extraction service that combines all extraction modules.
"""
import time
from typing import Tuple, Optional
from app.models.schemas import SkillExtractionResult
from app.services.skill_extraction import technical_skills_extractor
from app.services.soft_skills_extraction import soft_skills_extractor
from app.utils.file_storage import file_storage
from app.services.file_parser import file_parser_service


class UnifiedSkillExtractor:
    """Unified service for extracting all skills, education, and certifications."""
    
    @staticmethod
    def extract_from_text(text: str, source_type: str = "resume") -> Tuple[SkillExtractionResult, Optional[str]]:
        """
        Extract all skills, education, and certifications from text.
        
        Args:
            text: Text to extract from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            Tuple of (SkillExtractionResult, error_message)
        """
        if not text or len(text.strip()) < 10:
            return None, "Text is too short or empty"
        
        start_time = time.time()
        
        try:
            # Extract technical skills
            technical_skills, tech_error = technical_skills_extractor.extract_skills(text, source_type)
            if tech_error and "not configured" in tech_error:
                return None, tech_error
            
            # Extract soft skills
            soft_skills, soft_error = soft_skills_extractor.extract_soft_skills(text, source_type)
            if soft_error and "not configured" in soft_error:
                return None, soft_error
            
            # Extract methodologies
            methodologies = soft_skills_extractor.extract_methodologies(text)
            
            # Combine all skills
            all_skills = technical_skills + soft_skills + methodologies
            
            # Extract education
            education, edu_error = soft_skills_extractor.extract_education(text, source_type)
            if edu_error and "not configured" in edu_error:
                return None, edu_error
            
            # Extract certifications
            certifications, cert_error = soft_skills_extractor.extract_certifications(text, source_type)
            if cert_error and "not configured" in cert_error:
                return None, cert_error
            
            # Calculate confidence score (simple average)
            confidence_score = None
            if all_skills:
                confidences = [s.confidence for s in all_skills if s.confidence is not None]
                if confidences:
                    confidence_score = sum(confidences) / len(confidences)
            
            extraction_time = time.time() - start_time
            
            # Create SkillExtractionResult
            result = SkillExtractionResult(
                skills=all_skills,
                education=education,
                certifications=certifications,
                extraction_method="llm",
                confidence_score=confidence_score,
                raw_text=text
            )
            
            return result, None
            
        except Exception as e:
            error_message = f"Error in unified extraction: {str(e)}"
            return None, error_message
    
    @staticmethod
    def extract_from_file_id(file_id: str) -> Tuple[SkillExtractionResult, Optional[str]]:
        """
        Extract skills from a stored file.
        
        Args:
            file_id: File identifier
            
        Returns:
            Tuple of (SkillExtractionResult, error_message)
        """
        # Get file from storage
        file_data = file_storage.get_file(file_id)
        
        if not file_data:
            return None, "File not found or session expired"
        
        # Get parsed text
        parsed_text = file_data.get("parsed_text")
        
        if not parsed_text:
            # Try to parse the file first
            success, parse_error = file_parser_service.parse_file(file_id)
            
            if not success:
                return None, parse_error or "Failed to parse file"
            
            # Get updated file data
            file_data = file_storage.get_file(file_id)
            parsed_text = file_data.get("parsed_text")
            
            if not parsed_text:
                return None, "Could not extract text from file"
        
        # Extract source type
        source_type = file_data.get("source_type", "resume")
        
        # Extract skills from text
        return UnifiedSkillExtractor.extract_from_text(parsed_text, source_type)


# Global unified extractor instance
unified_skill_extractor = UnifiedSkillExtractor()

