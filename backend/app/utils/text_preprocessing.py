"""
Enhanced text preprocessing pipeline for resume and job description processing.
"""
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class PreprocessedText:
    """Container for preprocessed text data."""
    cleaned_text: str
    sections: Dict[str, str]
    segments: List[str]
    metadata: Dict[str, any]
    original_length: int
    cleaned_length: int


class TextPreprocessor:
    """Comprehensive text preprocessing pipeline."""
    
    # Section patterns for resume/JD parsing
    SECTION_PATTERNS = {
        "summary": [
            r'(?:summary|objective|profile|about|overview|executive\s+summary)',
            r'(?:professional\s+summary|career\s+objective)',
        ],
        "experience": [
            r'(?:experience|work\s+experience|employment|professional\s+experience)',
            r'(?:work\s+history|employment\s+history|career\s+history)',
            r'(?:relevant\s+experience|professional\s+background)',
        ],
        "education": [
            r'(?:education|academic|qualifications|educational\s+background)',
            r'(?:degrees?|university|college|school)',
            r'(?:academic\s+qualifications|educational\s+qualifications)',
        ],
        "skills": [
            r'(?:skills?|technical\s+skills?|competencies?|expertise)',
            r'(?:technical\s+expertise|core\s+skills?|key\s+skills?)',
            r'(?:programming\s+languages?|technologies?)',
        ],
        "certifications": [
            r'(?:certifications?|certificates?|credentials?|licenses?)',
            r'(?:professional\s+certifications?|certifications?\s+and\s+licenses?)',
        ],
        "projects": [
            r'(?:projects?|portfolio|key\s+projects?|notable\s+projects?)',
        ],
        "achievements": [
            r'(?:achievements?|awards?|honors?|recognition)',
            r'(?:accomplishments?|notable\s+achievements?)',
        ],
    }
    
    @staticmethod
    def remove_special_characters(text: str, keep_punctuation: bool = True) -> str:
        """
        Remove special characters while preserving important punctuation.
        
        Args:
            text: Text to clean
            keep_punctuation: Whether to keep punctuation marks
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        if keep_punctuation:
            # Keep alphanumeric, spaces, and common punctuation
            text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\'\"\/\\\@\#\$\%\&\*\=\+\<\>]', '', text)
        else:
            # Keep only alphanumeric and spaces
            text = re.sub(r'[^\w\s]', '', text)
        
        return text
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """
        Normalize whitespace in text.
        
        Args:
            text: Text to normalize
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
        
        # Replace multiple spaces with single space
        text = re.sub(r' +', ' ', text)
        
        # Normalize line breaks
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\r', '\n', text)
        
        # Remove excessive line breaks (keep max 2 consecutive)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove spaces at start/end of lines
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        return text.strip()
    
    @staticmethod
    def fix_encoding(text: str) -> str:
        """
        Fix common encoding issues.
        
        Args:
            text: Text with potential encoding issues
            
        Returns:
            Text with encoding issues fixed
        """
        if not text:
            return ""
        
        # Common Unicode replacements
        replacements = {
            '\u2018': "'",  # Left single quotation mark
            '\u2019': "'",  # Right single quotation mark
            '\u201C': '"',  # Left double quotation mark
            '\u201D': '"',  # Right double quotation mark
            '\u2013': '-',  # En dash
            '\u2014': '--',  # Em dash
            '\u2026': '...',  # Horizontal ellipsis
            '\u00A0': ' ',  # Non-breaking space
            '\u200B': '',   # Zero-width space
            '\u200C': '',   # Zero-width non-joiner
            '\u200D': '',   # Zero-width joiner
            '\uFEFF': '',   # Zero-width no-break space
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        return text
    
    @staticmethod
    def extract_sections(text: str) -> Dict[str, str]:
        """
        Extract structured sections from text.
        
        Args:
            text: Text to extract sections from
            
        Returns:
            Dictionary with section names as keys and content as values
        """
        sections = {
            "summary": "",
            "experience": "",
            "education": "",
            "skills": "",
            "certifications": "",
            "projects": "",
            "achievements": "",
            "other": ""
        }
        
        if not text:
            return sections
        
        text_lower = text.lower()
        
        # Find section boundaries
        section_positions = {}
        
        for section_name, patterns in TextPreprocessor.SECTION_PATTERNS.items():
            for pattern in patterns:
                # Look for section headers (case-insensitive)
                regex_pattern = rf'(?:^|\n)\s*{pattern}\s*:?\s*\n'
                matches = list(re.finditer(regex_pattern, text_lower, re.IGNORECASE | re.MULTILINE))
                
                if matches:
                    # Use the first match
                    section_positions[section_name] = matches[0].start()
                    break
        
        # Sort sections by position in text
        sorted_sections = sorted(section_positions.items(), key=lambda x: x[1])
        
        # Extract content between sections
        if sorted_sections:
            for i, (section_name, start) in enumerate(sorted_sections):
                # Find end position (start of next section or end of text)
                end = sorted_sections[i + 1][1] if i + 1 < len(sorted_sections) else len(text)
                
                # Extract section content
                section_content = text[start:end]
                
                # Remove section header from content
                section_content = re.sub(
                    rf'(?:^|\n)\s*{TextPreprocessor.SECTION_PATTERNS[section_name][0]}\s*:?\s*\n',
                    '',
                    section_content,
                    flags=re.IGNORECASE | re.MULTILINE
                )
                
                sections[section_name] = section_content.strip()
        else:
            # No clear sections found - put everything in "other"
            sections["other"] = text
        
        return sections
    
    @staticmethod
    def segment_text(text: str, max_segment_length: int = 1000) -> List[str]:
        """
        Segment text into smaller chunks for better processing.
        
        Args:
            text: Text to segment
            max_segment_length: Maximum length of each segment
            
        Returns:
            List of text segments
        """
        if not text:
            return []
        
        segments = []
        
        # Split by paragraphs first
        paragraphs = text.split('\n\n')
        
        current_segment = ""
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            
            if not paragraph:
                continue
            
            # If adding this paragraph would exceed max length, start new segment
            if current_segment and len(current_segment) + len(paragraph) + 2 > max_segment_length:
                segments.append(current_segment.strip())
                current_segment = paragraph
            else:
                if current_segment:
                    current_segment += "\n\n" + paragraph
                else:
                    current_segment = paragraph
        
        # Add remaining segment
        if current_segment:
            segments.append(current_segment.strip())
        
        return segments
    
    @staticmethod
    def extract_sentences(text: str) -> List[str]:
        """
        Extract sentences from text.
        
        Args:
            text: Text to extract sentences from
            
        Returns:
            List of sentences
        """
        if not text:
            return []
        
        # Simple sentence splitting (can be enhanced with NLP)
        sentences = re.split(r'[.!?]+\s+', text)
        
        # Clean sentences
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    @staticmethod
    def preprocess(text: str, extract_sections_flag: bool = True, segment_flag: bool = True) -> PreprocessedText:
        """
        Complete preprocessing pipeline.
        
        Args:
            text: Raw text to preprocess
            extract_sections_flag: Whether to extract sections
            segment_flag: Whether to segment text
            
        Returns:
            PreprocessedText object with all processed data
        """
        original_length = len(text) if text else 0
        
        # Step 1: Fix encoding issues
        text = TextPreprocessor.fix_encoding(text)
        
        # Step 2: Normalize whitespace
        text = TextPreprocessor.normalize_whitespace(text)
        
        # Step 3: Remove special characters (keep punctuation)
        text = TextPreprocessor.remove_special_characters(text, keep_punctuation=True)
        
        cleaned_text = text
        cleaned_length = len(cleaned_text)
        
        # Step 4: Extract sections (if requested)
        sections = {}
        if extract_sections_flag:
            sections = TextPreprocessor.extract_sections(cleaned_text)
        
        # Step 5: Segment text (if requested)
        segments = []
        if segment_flag:
            segments = TextPreprocessor.segment_text(cleaned_text)
        
        # Metadata
        metadata = {
            "original_length": original_length,
            "cleaned_length": cleaned_length,
            "sections_found": list(sections.keys()) if sections else [],
            "segment_count": len(segments),
            "sentence_count": len(TextPreprocessor.extract_sentences(cleaned_text)),
        }
        
        return PreprocessedText(
            cleaned_text=cleaned_text,
            sections=sections,
            segments=segments,
            metadata=metadata,
            original_length=original_length,
            cleaned_length=cleaned_length
        )


# Global preprocessor instance
text_preprocessor = TextPreprocessor()

# Backward compatibility functions
def clean_text(text: str) -> str:
    """Backward compatible clean_text function."""
    return text_preprocessor.preprocess(text, extract_sections_flag=False, segment_flag=False).cleaned_text


def normalize_whitespace(text: str) -> str:
    """Backward compatible normalize_whitespace function."""
    return text_preprocessor.normalize_whitespace(text)


def extract_sections(text: str) -> Dict[str, str]:
    """Backward compatible extract_sections function."""
    return text_preprocessor.extract_sections(text)


def remove_encoding_issues(text: str) -> str:
    """Backward compatible remove_encoding_issues function."""
    return text_preprocessor.fix_encoding(text)

