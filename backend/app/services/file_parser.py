"""
File parsing service that routes to appropriate parsers.
"""
from typing import Tuple, Optional
from app.utils.file_storage import file_storage
from app.services.pdf_parser import pdf_parser
from app.services.docx_parser import docx_parser


class FileParserService:
    """Service for parsing uploaded files."""
    
    @staticmethod
    def parse_file(file_id: str) -> Tuple[bool, Optional[str]]:
        """
        Parse a file and store the extracted text.
        
        Args:
            file_id: Unique file identifier
            
        Returns:
            Tuple of (success, error_message)
        """
        # Get file from storage
        file_data = file_storage.get_file(file_id)
        
        if not file_data:
            return False, "File not found or session expired"
        
        # Check if already parsed
        if file_data.get("parsed_text"):
            return True, None
        
        file_type = file_data["file_type"].lower()
        content = file_data["content"]
        
        # Route to appropriate parser
        if file_type == "pdf":
            extracted_text, error = pdf_parser.extract_text(content)
            
            if error:
                return False, error
            
            # Store parsed text
            file_storage.update_file_text(file_id, extracted_text)
            return True, None
            
        elif file_type == "docx":
            # Use DOCX parser
            extracted_text, error = docx_parser.extract_text(content)
            
            if error:
                return False, error
            
            # Store parsed text
            file_storage.update_file_text(file_id, extracted_text)
            return True, None
            
        elif file_type == "txt":
            # Plain text - just decode and clean
            try:
                text = content.decode('utf-8')
                from app.utils.text_cleaning import clean_text, normalize_whitespace
                cleaned_text = normalize_whitespace(text)
                cleaned_text = clean_text(cleaned_text)
                
                file_storage.update_file_text(file_id, cleaned_text)
                return True, None
                
            except Exception as e:
                return False, f"Error parsing text file: {str(e)}"
        
        else:
            return False, f"Unsupported file type: {file_type}"


# Global file parser service instance
file_parser_service = FileParserService()

