"""
Learning Resources Service - Provides course recommendations based on missing skills.
Uses LLM to intelligently find courses from Coursera, freeCodeCamp, Udemy, and similar platforms.
"""
from typing import List, Dict, Any, Optional
from app.models.schemas import Skill, GapAnalysis
from app.models.skill_taxonomy import SkillCategory
from app.services.llm_service import llm_service


class LearningResourcesService:
    """Service for recommending learning resources based on skill gaps using LLM."""

    @staticmethod
    def _build_course_search_prompt(skill: Skill) -> List[Dict[str, str]]:
        """Build prompt for LLM to search for courses."""
        prompt = f"""Find 3-5 real, currently available online courses or learning resources for learning "{skill.name}" (category: {skill.category.value}).

Focus on these platforms:
- Coursera (coursera.org)
- freeCodeCamp (freecodecamp.org)
- Udemy (udemy.com)
- edX (edx.org)
- Khan Academy (khanacademy.org)
- Codecademy (codecademy.com)
- Pluralsight (pluralsight.com)
- LinkedIn Learning (linkedin.com/learning)
- Official documentation/tutorials

For each course, provide:
- Exact course name
- Platform name
- URL (use actual URLs if you know them, or construct realistic ones based on platform patterns)
- Brief description (1-2 sentences)

Return ONLY valid JSON in this format:
{{
    "resources": [
        {{
            "name": "Course Name",
            "platform": "Platform Name",
            "url": "https://platform.com/course-url",
            "description": "Course description",
            "type": "Course" or "Certification" or "Tutorial"
        }}
    ]
}}

Important:
- Use real, well-known courses when possible
- URLs should be realistic and follow platform URL patterns
- Prioritize free or accessible courses
- Include a mix of beginner and intermediate options
- If you don't know exact URLs, use format: "https://platform.com/search?q=skill-name" or similar"""

        return [
            {
                "role": "system",
                "content": "You are an expert at finding online learning resources. You know about courses from Coursera, freeCodeCamp, Udemy, edX, and other major learning platforms. Always provide real, helpful course recommendations."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

    @staticmethod
    def _find_courses_with_llm(skill: Skill) -> List[Dict[str, Any]]:
        """
        Use LLM to find courses for a skill.
        
        Args:
            skill: Skill to find courses for
            
        Returns:
            List of course resources
        """
        if not llm_service.is_configured():
            return []

        try:
            prompt = LearningResourcesService._build_course_search_prompt(skill)
            response = llm_service.call_api(
                messages=prompt,
                response_format={"type": "json_object"},
                temperature=0.7,  # Slightly higher for creativity
                max_tokens=1000
            )
            
            content = response.get("content", "")
            if not content:
                return []
            
            # Parse JSON response
            data = llm_service.extract_json_response(content)
            resources = data.get("resources", [])
            
            # Validate and format resources
            formatted_resources = []
            for resource in resources:
                if not isinstance(resource, dict):
                    continue
                    
                # Ensure required fields
                formatted_resource = {
                    "name": resource.get("name", ""),
                    "platform": resource.get("platform", "Unknown"),
                    "url": resource.get("url", ""),
                    "description": resource.get("description", f"Learn {skill.name}"),
                    "type": resource.get("type", "Course"),
                    "skill_category": skill.category.value,
                    "source": "llm"
                }
                
                # Only add if has name and URL
                if formatted_resource["name"] and formatted_resource["url"]:
                    formatted_resources.append(formatted_resource)
            
            return formatted_resources[:5]  # Limit to 5
            
        except Exception as e:
            print(f"[LearningResources] LLM search error for '{skill.name}': {e}")
            return []

    @staticmethod
    def find_resources_for_skill(skill: Skill) -> List[Dict[str, Any]]:
        """
        Find learning resources for a specific skill using LLM.
        
        Args:
            skill: Skill to find courses for
            
        Returns:
            List of course resources from LLM
        """
        # Use LLM to find courses
        resources = LearningResourcesService._find_courses_with_llm(skill)
        
        # Remove duplicates by URL
        seen_urls = set()
        unique_resources = []
        for resource in resources:
            url = resource.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_resources.append(resource)
        
        return unique_resources[:5]  # Limit to 5 resources per skill

    @staticmethod
    def generate_recommendations(
        gap_analysis: GapAnalysis,
        max_resources: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate learning resource recommendations based on missing skills.
        Uses LLM to intelligently find courses from Coursera, freeCodeCamp, Udemy, etc.

        Args:
            gap_analysis: The gap analysis result
            max_resources: Maximum number of resources to return

        Returns:
            List of recommended learning resources
        """
        recommendations = []
        seen_resources = set()

        # Prioritize missing skills
        missing_skills = gap_analysis.missing_skills

        # Sort by category importance (technical skills first)
        technical_categories = [
            SkillCategory.PROGRAMMING_LANGUAGES,
            SkillCategory.FRAMEWORKS_LIBRARIES,
            SkillCategory.TOOLS_PLATFORMS,
            SkillCategory.DATABASES,
            SkillCategory.CLOUD_SERVICES,
            SkillCategory.DEVOPS,
        ]

        def get_priority(skill: Skill) -> int:
            if skill.category in technical_categories:
                return 0
            elif skill.category in [
                SkillCategory.MACHINE_LEARNING,
                SkillCategory.SOFTWARE_ARCHITECTURE,
            ]:
                return 1
            else:
                return 2

        sorted_skills = sorted(missing_skills, key=get_priority)

        # Collect resources for each missing skill (LLM will be called here)
        for skill in sorted_skills:
            if len(recommendations) >= max_resources:
                break

            resources = LearningResourcesService.find_resources_for_skill(skill)
            
            for resource in resources:
                resource_key = (resource.get("name"), resource.get("url"))
                if resource_key not in seen_resources:
                    seen_resources.add(resource_key)
                    # Add skill context
                    resource_copy = resource.copy()
                    resource_copy["related_skill"] = skill.name
                    recommendations.append(resource_copy)
                    
                    if len(recommendations) >= max_resources:
                        break

        return recommendations[:max_resources]


# Global instance
learning_resources_service = LearningResourcesService()

