"""
Learning Resources Service - Provides course recommendations based on missing skills.
"""
from typing import List, Dict, Any, Optional
from app.models.schemas import Skill, GapAnalysis
from app.models.skill_taxonomy import SkillCategory


class LearningResourcesService:
    """Service for recommending learning resources based on skill gaps."""

    # Curated learning resources database
    # Structure: {skill_name: [resource_dict]}
    LEARNING_RESOURCES_DB: Dict[str, List[Dict[str, Any]]] = {
        # Programming Languages
        "python": [
            {
                "name": "Python for Everybody Specialization",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/python",
                "description": "Learn Python programming fundamentals and data structures",
                "skill_category": "programming_languages",
            },
            {
                "name": "Complete Python Bootcamp",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/complete-python-bootcamp/",
                "description": "Comprehensive Python course from beginner to advanced",
                "skill_category": "programming_languages",
            },
        ],
        "javascript": [
            {
                "name": "JavaScript: The Complete Guide",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/javascript-the-complete-guide/",
                "description": "Master JavaScript from basics to advanced concepts",
                "skill_category": "programming_languages",
            },
            {
                "name": "Full Stack JavaScript",
                "type": "Course",
                "platform": "freeCodeCamp",
                "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
                "description": "Free comprehensive JavaScript course",
                "skill_category": "programming_languages",
            },
        ],
        "java": [
            {
                "name": "Java Programming and Software Engineering Fundamentals",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/java-programming",
                "description": "Learn Java programming and software engineering principles",
                "skill_category": "programming_languages",
            },
        ],
        "typescript": [
            {
                "name": "Understanding TypeScript",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/understanding-typescript/",
                "description": "Deep dive into TypeScript features and best practices",
                "skill_category": "programming_languages",
            },
        ],
        # Frameworks
        "react": [
            {
                "name": "React - The Complete Guide",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
                "description": "Comprehensive React course including hooks, Redux, and more",
                "skill_category": "frameworks_libraries",
            },
            {
                "name": "React Documentation",
                "type": "Documentation",
                "platform": "Official",
                "url": "https://react.dev/",
                "description": "Official React documentation and tutorials",
                "skill_category": "frameworks_libraries",
            },
        ],
        "django": [
            {
                "name": "Django for Everybody Specialization",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/django",
                "description": "Learn Django web framework for Python",
                "skill_category": "frameworks_libraries",
            },
        ],
        "spring boot": [
            {
                "name": "Spring Boot - Complete Guide",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/spring-boot-tutorial-for-beginners/",
                "description": "Master Spring Boot framework for Java development",
                "skill_category": "frameworks_libraries",
            },
        ],
        # Cloud Services
        "aws": [
            {
                "name": "AWS Certified Solutions Architect",
                "type": "Certification",
                "platform": "AWS",
                "url": "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
                "description": "Official AWS certification training",
                "skill_category": "cloud_services",
            },
            {
                "name": "AWS Cloud Practitioner",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/learn/aws-cloud-technical-essentials",
                "description": "Learn AWS fundamentals and cloud concepts",
                "skill_category": "cloud_services",
            },
        ],
        "docker": [
            {
                "name": "Docker Mastery",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/docker-mastery/",
                "description": "Complete Docker containerization course",
                "skill_category": "devops",
            },
        ],
        "kubernetes": [
            {
                "name": "Kubernetes for the Absolute Beginners",
                "type": "Course",
                "platform": "Udemy",
                "url": "https://www.udemy.com/course/learn-kubernetes/",
                "description": "Learn Kubernetes orchestration from scratch",
                "skill_category": "devops",
            },
        ],
        # Databases
        "postgresql": [
            {
                "name": "PostgreSQL for Everybody",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/learn/postgresql-database-server",
                "description": "Learn PostgreSQL database administration",
                "skill_category": "databases",
            },
        ],
        "mongodb": [
            {
                "name": "MongoDB University",
                "type": "Course",
                "platform": "MongoDB",
                "url": "https://university.mongodb.com/",
                "description": "Free MongoDB courses and certifications",
                "skill_category": "databases",
            },
        ],
        # Machine Learning
        "machine learning": [
            {
                "name": "Machine Learning Specialization",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/machine-learning-introduction",
                "description": "Andrew Ng's famous machine learning course",
                "skill_category": "machine_learning",
            },
        ],
        "tensorflow": [
            {
                "name": "TensorFlow Developer Certificate",
                "type": "Certification",
                "platform": "TensorFlow",
                "url": "https://www.tensorflow.org/certificate",
                "description": "Official TensorFlow certification program",
                "skill_category": "machine_learning",
            },
        ],
        # Soft Skills
        "leadership": [
            {
                "name": "Leading People and Teams Specialization",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/leading-people-teams",
                "description": "Develop leadership and team management skills",
                "skill_category": "leadership",
            },
        ],
        "communication": [
            {
                "name": "Effective Communication",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/learn/wharton-communication",
                "description": "Improve workplace communication skills",
                "skill_category": "communication",
            },
        ],
        # Methodologies
        "agile": [
            {
                "name": "Agile Development Specialization",
                "type": "Course",
                "platform": "Coursera",
                "url": "https://www.coursera.org/specializations/agile-development",
                "description": "Learn Agile methodologies and practices",
                "skill_category": "agile",
            },
        ],
        "scrum": [
            {
                "name": "Certified ScrumMaster",
                "type": "Certification",
                "platform": "Scrum Alliance",
                "url": "https://www.scrumalliance.org/get-certified",
                "description": "Professional Scrum certification",
                "skill_category": "scrum",
            },
        ],
    }

    @staticmethod
    def normalize_skill_name(skill_name: str) -> str:
        """Normalize skill name for matching."""
        return skill_name.lower().strip()

    @staticmethod
    def find_resources_for_skill(skill: Skill) -> List[Dict[str, Any]]:
        """Find learning resources for a specific skill."""
        normalized_name = LearningResourcesService.normalize_skill_name(skill.name)
        
        # Direct match
        if normalized_name in LearningResourcesService.LEARNING_RESOURCES_DB:
            return LearningResourcesService.LEARNING_RESOURCES_DB[normalized_name].copy()
        
        # Partial match (check if skill name contains key or vice versa)
        resources = []
        for key, resource_list in LearningResourcesService.LEARNING_RESOURCES_DB.items():
            if key in normalized_name or normalized_name in key:
                resources.extend(resource_list)
        
        # Category-based match
        if not resources:
            for key, resource_list in LearningResourcesService.LEARNING_RESOURCES_DB.items():
                for resource in resource_list:
                    if resource.get("skill_category") == skill.category.value:
                        resources.append(resource)
        
        # Remove duplicates
        seen = set()
        unique_resources = []
        for resource in resources:
            resource_key = (resource.get("name"), resource.get("url"))
            if resource_key not in seen:
                seen.add(resource_key)
                unique_resources.append(resource)
        
        return unique_resources[:3]  # Limit to 3 resources per skill

    @staticmethod
    def generate_recommendations(
        gap_analysis: GapAnalysis,
        max_resources: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Generate learning resource recommendations based on missing skills.

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

        # Collect resources for each missing skill
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

        # If we don't have enough resources, add general resources
        if len(recommendations) < max_resources:
            general_resources = [
                {
                    "name": "Technical Interview Prep",
                    "type": "Course",
                    "platform": "LeetCode",
                    "url": "https://leetcode.com/",
                    "description": "Practice coding interview problems",
                    "skill_category": "other",
                },
                {
                    "name": "Git and GitHub",
                    "type": "Course",
                    "platform": "freeCodeCamp",
                    "url": "https://www.freecodecamp.org/learn",
                    "description": "Learn version control with Git",
                    "skill_category": "tools_platforms",
                },
            ]
            
            for resource in general_resources:
                resource_key = (resource.get("name"), resource.get("url"))
                if resource_key not in seen_resources:
                    seen_resources.add(resource_key)
                    recommendations.append(resource)
                    if len(recommendations) >= max_resources:
                        break

        return recommendations[:max_resources]


# Global instance
learning_resources_service = LearningResourcesService()

