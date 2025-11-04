"""
Fit score calculation module for evaluating resume-job description compatibility.
"""
from typing import Optional, Dict, List
from app.models.schemas import (
    FitScoreBreakdown,
    GapAnalysis,
    SkillExtractionResult,
    SkillMatch,
    Skill,
    Education,
    Certification
)
from app.models.skill_taxonomy import SkillCategory
from app.services.gap_analysis import GapAnalyzer


class FitScoreCalculator:
    """Calculate fit scores between resume and job description."""
    
    # Default weights
    DEFAULT_TECHNICAL_WEIGHT = 0.7
    DEFAULT_SOFT_SKILLS_WEIGHT = 0.3
    
    # Education and certification weights (optional)
    DEFAULT_EDUCATION_WEIGHT = 0.1
    DEFAULT_CERTIFICATION_WEIGHT = 0.1
    
    @staticmethod
    def calculate_fit_score(
        gap_analysis: GapAnalysis,
        resume_skills: SkillExtractionResult,
        jd_skills: SkillExtractionResult,
        technical_weight: Optional[float] = None,
        soft_skills_weight: Optional[float] = None,
        include_education: bool = True,
        include_certifications: bool = True
    ) -> FitScoreBreakdown:
        """
        Calculate comprehensive fit score between resume and job description.
        
        Args:
            gap_analysis: GapAnalysis result from gap_analyzer
            resume_skills: SkillExtractionResult from resume
            jd_skills: SkillExtractionResult from job description
            technical_weight: Weight for technical skills (default: 0.7)
            soft_skills_weight: Weight for soft skills (default: 0.3)
            include_education: Whether to include education in score
            include_certifications: Whether to include certifications in score
            
        Returns:
            FitScoreBreakdown with all calculated scores
        """
        # Use default weights if not provided
        if technical_weight is None:
            technical_weight = FitScoreCalculator.DEFAULT_TECHNICAL_WEIGHT
        if soft_skills_weight is None:
            soft_skills_weight = FitScoreCalculator.DEFAULT_SOFT_SKILLS_WEIGHT
        
        # Normalize weights (ensure they sum to 1.0)
        total_weight = technical_weight + soft_skills_weight
        if total_weight > 0:
            technical_weight = technical_weight / total_weight
            soft_skills_weight = soft_skills_weight / total_weight
        
        # Calculate technical and soft skills scores
        technical_score = FitScoreCalculator._calculate_technical_score(
            gap_analysis, jd_skills
        )
        
        soft_skills_score = FitScoreCalculator._calculate_soft_skills_score(
            gap_analysis, jd_skills
        )
        
        # Calculate overall score (weighted average)
        overall_score = (
            technical_score * technical_weight +
            soft_skills_score * soft_skills_weight
        )
        
        # Calculate education score (optional)
        education_score = None
        if include_education:
            education_score = FitScoreCalculator._calculate_education_score(
                resume_skills.education, jd_skills.education
            )
        
        # Calculate certification score (optional)
        certification_score = None
        if include_certifications:
            certification_score = FitScoreCalculator._calculate_certification_score(
                resume_skills.certifications, jd_skills.certifications
            )
        
        # Calculate counts
        matched_count = len(gap_analysis.matched_skills)
        missing_count = len(gap_analysis.missing_skills)
        total_jd_skills = len(jd_skills.skills)
        
        return FitScoreBreakdown(
            overall_score=round(overall_score, 2),
            technical_score=round(technical_score, 2),
            soft_skills_score=round(soft_skills_score, 2),
            education_score=round(education_score, 2) if education_score is not None else None,
            certification_score=round(certification_score, 2) if certification_score is not None else None,
            matched_count=matched_count,
            missing_count=missing_count,
            total_jd_skills=total_jd_skills,
            technical_weight=technical_weight,
            soft_skills_weight=soft_skills_weight
        )
    
    @staticmethod
    def _calculate_technical_score(
        gap_analysis: GapAnalysis,
        jd_skills: SkillExtractionResult
    ) -> float:
        """
        Calculate technical skills match score.
        
        Args:
            gap_analysis: GapAnalysis result
            jd_skills: Job description skills
            
        Returns:
            Technical skills score (0-100)
        """
        # Get technical skills from JD
        jd_technical = [
            skill for skill in jd_skills.skills
            if skill.category in GapAnalyzer.TECHNICAL_CATEGORIES
        ]
        
        if not jd_technical:
            return 100.0  # No technical requirements means perfect match
        
        # Count matched technical skills
        matched_technical = [
            match for match in gap_analysis.matched_skills
            if match.skill.category in GapAnalyzer.TECHNICAL_CATEGORIES
        ]
        
        score = (len(matched_technical) / len(jd_technical)) * 100.0
        return min(100.0, max(0.0, score))
    
    @staticmethod
    def _calculate_soft_skills_score(
        gap_analysis: GapAnalysis,
        jd_skills: SkillExtractionResult
    ) -> float:
        """
        Calculate soft skills match score.
        
        Args:
            gap_analysis: GapAnalysis result
            jd_skills: Job description skills
            
        Returns:
            Soft skills score (0-100)
        """
        # Get soft skills from JD
        jd_soft = [
            skill for skill in jd_skills.skills
            if skill.category in GapAnalyzer.SOFT_SKILL_CATEGORIES
        ]
        
        if not jd_soft:
            return 100.0  # No soft skill requirements means perfect match
        
        # Count matched soft skills
        matched_soft = [
            match for match in gap_analysis.matched_skills
            if match.skill.category in GapAnalyzer.SOFT_SKILL_CATEGORIES
        ]
        
        score = (len(matched_soft) / len(jd_soft)) * 100.0
        return min(100.0, max(0.0, score))
    
    @staticmethod
    def _calculate_education_score(
        resume_education: List[Education],
        jd_education: List[Education]
    ) -> Optional[float]:
        """
        Calculate education match score.
        
        Args:
            resume_education: Education from resume
            jd_education: Education requirements from JD
            
        Returns:
            Education score (0-100) or None if no requirements
        """
        if not jd_education:
            return None
        
        # Check required education first
        required_education = [edu for edu in jd_education if edu.required]
        
        if required_education:
            # Check if resume meets required education
            matches = FitScoreCalculator._match_education(
                resume_education, required_education
            )
            if matches:
                # Check preferred education
                preferred_education = [edu for edu in jd_education if edu.preferred]
                if preferred_education:
                    preferred_matches = FitScoreCalculator._match_education(
                        resume_education, preferred_education
                    )
                    # Score based on required (100%) + preferred (bonus)
                    base_score = 100.0
                    bonus = (len(preferred_matches) / len(preferred_education)) * 20.0
                    return min(100.0, base_score + bonus)
                return 100.0
            else:
                return 0.0
        
        # Only preferred education
        preferred_education = [edu for edu in jd_education if edu.preferred]
        if preferred_education:
            matches = FitScoreCalculator._match_education(
                resume_education, preferred_education
            )
            score = (len(matches) / len(preferred_education)) * 100.0
            return min(100.0, max(0.0, score))
        
        return None
    
    @staticmethod
    def _match_education(
        resume_education: List[Education],
        jd_education: List[Education]
    ) -> List[Education]:
        """
        Match education requirements.
        
        Args:
            resume_education: Education from resume
            jd_education: Education requirements from JD
            
        Returns:
            List of matched education requirements
        """
        matches = []
        
        for jd_edu in jd_education:
            for resume_edu in resume_education:
                # Check degree match
                if jd_edu.degree and resume_edu.degree:
                    if FitScoreCalculator._normalize_degree(
                        jd_edu.degree
                    ) == FitScoreCalculator._normalize_degree(resume_edu.degree):
                        # Check field match if specified
                        if jd_edu.field:
                            if resume_edu.field and FitScoreCalculator._normalize_field(
                                jd_edu.field
                            ) == FitScoreCalculator._normalize_field(resume_edu.field):
                                matches.append(jd_edu)
                                break
                        else:
                            matches.append(jd_edu)
                            break
        
        return matches
    
    @staticmethod
    def _normalize_degree(degree: str) -> str:
        """Normalize degree name for comparison."""
        degree_lower = degree.lower().strip()
        
        # Map common variations
        degree_mapping = {
            "bachelor": "bachelor",
            "bachelor's": "bachelor",
            "bs": "bachelor",
            "ba": "bachelor",
            "b.sc": "bachelor",
            "master": "master",
            "master's": "master",
            "ms": "master",
            "ma": "master",
            "m.sc": "master",
            "phd": "phd",
            "ph.d": "phd",
            "doctorate": "phd",
            "doctor": "phd",
        }
        
        for key, value in degree_mapping.items():
            if key in degree_lower:
                return value
        
        return degree_lower
    
    @staticmethod
    def _normalize_field(field: str) -> str:
        """Normalize field of study for comparison."""
        return field.lower().strip()
    
    @staticmethod
    def _calculate_certification_score(
        resume_certifications: List[Certification],
        jd_certifications: List[Certification]
    ) -> Optional[float]:
        """
        Calculate certification match score.
        
        Args:
            resume_certifications: Certifications from resume
            jd_certifications: Certification requirements from JD
            
        Returns:
            Certification score (0-100) or None if no requirements
        """
        if not jd_certifications:
            return None
        
        # Check required certifications first
        required_certs = [cert for cert in jd_certifications if cert.required]
        
        if required_certs:
            # Check if resume has required certifications
            matches = FitScoreCalculator._match_certifications(
                resume_certifications, required_certs
            )
            if matches:
                # Check preferred certifications
                preferred_certs = [cert for cert in jd_certifications if cert.preferred]
                if preferred_certs:
                    preferred_matches = FitScoreCalculator._match_certifications(
                        resume_certifications, preferred_certs
                    )
                    # Score based on required (100%) + preferred (bonus)
                    base_score = 100.0
                    bonus = (len(preferred_matches) / len(preferred_certs)) * 20.0
                    return min(100.0, base_score + bonus)
                return 100.0
            else:
                return 0.0
        
        # Only preferred certifications
        preferred_certs = [cert for cert in jd_certifications if cert.preferred]
        if preferred_certs:
            matches = FitScoreCalculator._match_certifications(
                resume_certifications, preferred_certs
            )
            score = (len(matches) / len(preferred_certs)) * 100.0
            return min(100.0, max(0.0, score))
        
        return None
    
    @staticmethod
    def _match_certifications(
        resume_certifications: List[Certification],
        jd_certifications: List[Certification]
    ) -> List[Certification]:
        """
        Match certification requirements.
        
        Args:
            resume_certifications: Certifications from resume
            jd_certifications: Certification requirements from JD
            
        Returns:
            List of matched certification requirements
        """
        matches = []
        
        for jd_cert in jd_certifications:
            cert_name_normalized = FitScoreCalculator._normalize_cert_name(jd_cert.name)
            
            for resume_cert in resume_certifications:
                resume_name_normalized = FitScoreCalculator._normalize_cert_name(
                    resume_cert.name
                )
                
                # Check if names match (fuzzy match)
                if cert_name_normalized in resume_name_normalized or \
                   resume_name_normalized in cert_name_normalized:
                    # Check issuer if specified
                    if jd_cert.issuer:
                        if resume_cert.issuer and FitScoreCalculator._normalize_issuer(
                            jd_cert.issuer
                        ) == FitScoreCalculator._normalize_issuer(resume_cert.issuer):
                            matches.append(jd_cert)
                            break
                    else:
                        matches.append(jd_cert)
                        break
        
        return matches
    
    @staticmethod
    def _normalize_cert_name(name: str) -> str:
        """Normalize certification name for comparison."""
        return name.lower().strip()
    
    @staticmethod
    def _normalize_issuer(issuer: str) -> str:
        """Normalize certification issuer for comparison."""
        return issuer.lower().strip()


# Global fit score calculator instance
fit_score_calculator = FitScoreCalculator()

