"""
Text input handler service for plain text resume and job description input.
"""
from typing import Tuple, Optional
from app.utils.file_storage import file_storage
from app.utils.file_validation import generate_file_id
from app.utils.text_cleaning import clean_text, normalize_whitespace


class TextInputService:
    """Service for handling plain text input."""
    
    MIN_TEXT_LENGTH = 10  # Minimum text length
    MAX_TEXT_LENGTH = 100000  # Maximum text length (100KB)
    
    @staticmethod
    def validate_text(text: str) -> Tuple[bool, Optional[str]]:
        """
        Validate text input.
        
        Args:
            text: Text to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not text or not isinstance(text, str):
            return False, "Text is required and must be a string"
        
        text_length = len(text.strip())
        
        if text_length < TextInputService.MIN_TEXT_LENGTH:
            return False, f"Text must be at least {TextInputService.MIN_TEXT_LENGTH} characters long"
        
        if text_length > TextInputService.MAX_TEXT_LENGTH:
            return False, f"Text exceeds maximum length of {TextInputService.MAX_TEXT_LENGTH} characters"
        
        return True, None
    
    @staticmethod
    def store_text(
        text: str,
        source_type: str = "resume",
        filename: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Store plain text input in file storage.
        
        Args:
            text: Text content
            source_type: Type of input ('resume' or 'job_description')
            filename: Optional filename for reference
            
        Returns:
            Tuple of (text_id, error_message)
        """
        # Validate source_type
        if source_type not in ["resume", "job_description"]:
            return None, f"Invalid source_type: {source_type}. Must be 'resume' or 'job_description'"
        
        # Validate text
        is_valid, error_message = TextInputService.validate_text(text)
        if not is_valid:
            return None, error_message
        
        # Clean and normalize text
        cleaned_text = normalize_whitespace(text)
        cleaned_text = clean_text(cleaned_text)
        
        # Generate text ID
        text_id = generate_file_id()
        
        # Create filename if not provided
        if not filename:
            filename = f"{source_type}_{text_id[:8]}.txt"
        
        # Convert text to bytes for storage
        text_bytes = cleaned_text.encode('utf-8')
        file_size = len(text_bytes)
        
        # Store in file storage (treating as a text file)
        file_data = file_storage.store_file(
            file_id=text_id,
            filename=filename,
            file_type="txt",
            content=text_bytes,
            file_size=file_size,
            source_type=source_type
        )
        
        # Store cleaned text directly (so it's already "parsed")
        file_storage.update_file_text(text_id, cleaned_text)
        
        return text_id, None
    
    @staticmethod
    def get_text(text_id: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get stored text by ID.
        
        Args:
            text_id: Text identifier
            
        Returns:
            Tuple of (text, error_message)
        """
        file_data = file_storage.get_file(text_id)
        
        if not file_data:
            return None, "Text not found or session expired"
        
        text = file_data.get("parsed_text")
        
        if not text:
            return None, "Text not available"
        
        return text, None


# Global text input service instance
text_input_service = TextInputService()

