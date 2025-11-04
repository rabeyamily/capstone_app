"""
PDF parsing service using pdfplumber.
"""
import io
from typing import Optional, Tuple
import pdfplumber
from app.utils.text_cleaning import clean_text, normalize_whitespace, remove_encoding_issues


class PDFParser:
    """PDF parsing service using pdfplumber."""
    
    @staticmethod
    def extract_text(pdf_content: bytes) -> Tuple[str, Optional[str]]:
        """
        Extract text from PDF content.
        
        Args:
            pdf_content: PDF file content as bytes
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        try:
            # Create file-like object from bytes
            pdf_file = io.BytesIO(pdf_content)
            
            # Extract text from all pages
            full_text = []
            
            with pdfplumber.open(pdf_file) as pdf:
                # Iterate through all pages
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        # Extract text from page
                        page_text = page.extract_text()
                        
                        if page_text:
                            full_text.append(page_text)
                        
                    except Exception as e:
                        # Log error but continue with other pages
                        error_msg = f"Error extracting text from page {page_num}: {str(e)}"
                        # Continue with other pages
                        continue
            
            # Combine all pages
            combined_text = "\n\n".join(full_text)
            
            if not combined_text or combined_text.strip() == "":
                return "", "No text could be extracted from the PDF"
            
            # Clean and normalize text
            cleaned_text = remove_encoding_issues(combined_text)
            cleaned_text = normalize_whitespace(cleaned_text)
            cleaned_text = clean_text(cleaned_text)
            
            return cleaned_text, None
            
        except Exception as e:
            error_message = f"Error parsing PDF: {str(e)}"
            return "", error_message
    
    @staticmethod
    def extract_text_with_layout(pdf_content: bytes) -> Tuple[str, Optional[str], dict]:
        """
        Extract text from PDF with layout information.
        
        Args:
            pdf_content: PDF file content as bytes
            
        Returns:
            Tuple of (extracted_text, error_message, metadata)
        """
        try:
            pdf_file = io.BytesIO(pdf_content)
            
            full_text = []
            metadata = {
                "total_pages": 0,
                "pages_with_text": 0,
                "pages_without_text": 0,
            }
            
            with pdfplumber.open(pdf_file) as pdf:
                metadata["total_pages"] = len(pdf.pages)
                
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        # Try to extract text preserving layout
                        # This handles multi-column layouts better
                        page_text = page.extract_text(layout=True)
                        
                        if page_text and page_text.strip():
                            full_text.append(page_text)
                            metadata["pages_with_text"] += 1
                        else:
                            # Fallback to regular extraction
                            page_text = page.extract_text()
                            if page_text and page_text.strip():
                                full_text.append(page_text)
                                metadata["pages_with_text"] += 1
                            else:
                                metadata["pages_without_text"] += 1
                                
                    except Exception as e:
                        metadata["pages_without_text"] += 1
                        continue
            
            combined_text = "\n\n".join(full_text)
            
            if not combined_text or combined_text.strip() == "":
                return "", "No text could be extracted from the PDF", metadata
            
            # Clean text
            cleaned_text = remove_encoding_issues(combined_text)
            cleaned_text = normalize_whitespace(cleaned_text)
            cleaned_text = clean_text(cleaned_text)
            
            return cleaned_text, None, metadata
            
        except Exception as e:
            error_message = f"Error parsing PDF: {str(e)}"
            return "", error_message, {}
    
    @staticmethod
    def get_pdf_metadata(pdf_content: bytes) -> dict:
        """
        Extract metadata from PDF.
        
        Args:
            pdf_content: PDF file content as bytes
            
        Returns:
            Dictionary with PDF metadata
        """
        try:
            pdf_file = io.BytesIO(pdf_content)
            
            with pdfplumber.open(pdf_file) as pdf:
                metadata = {
                    "total_pages": len(pdf.pages),
                    "metadata": pdf.metadata or {},
                }
                
                return metadata
                
        except Exception as e:
            return {
                "error": str(e),
                "total_pages": 0,
                "metadata": {}
            }


# Global PDF parser instance
pdf_parser = PDFParser()

