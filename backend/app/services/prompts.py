"""
Prompt templates for skill extraction from resumes and job descriptions.
"""
from typing import Dict, List
from app.models.skill_taxonomy import SkillCategory, SKILL_CATEGORY_DESCRIPTIONS


class SkillExtractionPrompts:
    """Prompt templates for skill extraction using LLM."""
    
    # System prompt with taxonomy guidelines
    SYSTEM_PROMPT = """You are an expert at extracting and categorizing skills from resumes and job descriptions. 
Your task is to identify technical skills, soft skills, education requirements, and certifications from text.

SKILL CATEGORIES:
- programming_languages: Python, Java, JavaScript, C++, Go, Rust, TypeScript, etc.
- frameworks_libraries: React, Django, Spring Boot, TensorFlow, PyTorch, etc.
- tools_platforms: Git, Docker, Jira, VS Code, AWS, Azure, etc.
- databases: PostgreSQL, MongoDB, Redis, MySQL, Cassandra, etc.
- cloud_services: AWS, Azure, GCP, Heroku, etc.
- devops: Kubernetes, Terraform, Jenkins, CI/CD, Docker Swarm, etc.
- software_architecture: Microservices, REST APIs, Design Patterns, System Design, etc.
- machine_learning: Neural Networks, NLP, Computer Vision, Deep Learning, etc.
- blockchain: Solidity, Ethereum, Smart Contracts, Web3, etc.
- cybersecurity: Penetration Testing, Security Protocols, Encryption, etc.
- data_science: Data Analysis, Statistics, Visualization, ETL, etc.
- leadership: Team Management, Mentoring, Strategic Planning, etc.
- communication: Technical Writing, Presentations, Cross-functional Collaboration, etc.
- collaboration: Teamwork, Pair Programming, Code Reviews, etc.
- problem_solving: Debugging, Troubleshooting, Critical Thinking, etc.
- analytical_thinking: Data Analysis, Root Cause Analysis, Logical Reasoning, etc.
- agile: Agile Development, Sprint Planning, User Stories, etc.
- scrum: Scrum Master, Sprint Retrospectives, Daily Standups, etc.
- ci_cd: Continuous Integration, Continuous Deployment, Pipeline Automation, etc.
- design_thinking: User-Centered Design, Prototyping, User Research, etc.
- fintech: Payment Systems, Banking Software, Financial APIs, etc.
- healthcare_it: EHR Systems, HIPAA Compliance, Medical Software, etc.
- e_commerce: Online Retail, Payment Processing, Inventory Management, etc.
- other: Any skills that don't fit the above categories

IMPORTANT GUIDELINES:
1. Extract only concrete, verifiable skills mentioned in the text
2. Do not infer skills that are not explicitly mentioned
3. Use the exact skill names as they appear in the text (case-insensitive matching)
4. Categorize each skill into the most appropriate category
5. For job descriptions, distinguish between required and preferred skills
6. Extract education requirements (degree type, field of study)
7. Extract certifications (name, issuer)
8. Be precise and avoid duplication
9. Return results in valid JSON format only"""

    # Few-shot examples for better accuracy
    FEW_SHOT_EXAMPLES = [
        {
            "input": "I have 5 years of experience with Python, Django, and PostgreSQL. I'm proficient in Docker and AWS.",
            "output": {
                "skills": [
                    {"name": "Python", "category": "programming_languages"},
                    {"name": "Django", "category": "frameworks_libraries"},
                    {"name": "PostgreSQL", "category": "databases"},
                    {"name": "Docker", "category": "tools_platforms"},
                    {"name": "AWS", "category": "cloud_services"}
                ],
                "education": [],
                "certifications": []
            }
        },
        {
            "input": "Required: Bachelor's degree in Computer Science. Preferred: Master's degree. AWS Certified Solutions Architect preferred.",
            "output": {
                "skills": [],
                "education": [
                    {"degree": "Bachelor's", "field": "Computer Science", "required": True},
                    {"degree": "Master's", "field": "Computer Science", "required": False, "preferred": True}
                ],
                "certifications": [
                    {"name": "AWS Certified Solutions Architect", "issuer": "AWS", "required": False, "preferred": True}
                ]
            }
        },
        {
            "input": "Strong leadership skills, excellent communication, and ability to work in cross-functional teams.",
            "output": {
                "skills": [
                    {"name": "Leadership", "category": "leadership"},
                    {"name": "Communication", "category": "communication"},
                    {"name": "Cross-functional Collaboration", "category": "collaboration"}
                ],
                "education": [],
                "certifications": []
            }
        }
    ]
    
    @staticmethod
    def build_skill_extraction_prompt(text: str, source_type: str = "resume") -> List[Dict[str, str]]:
        """
        Build prompt for skill extraction.
        
        Args:
            text: Text to extract skills from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            List of message dictionaries for LLM API
        """
        source_context = "resume" if source_type == "resume" else "job description"
        
        user_prompt = f"""Extract all skills, education requirements, and certifications from the following {source_context} text.

Return the results in JSON format with this structure:
{{
    "skills": [
        {{"name": "skill_name", "category": "category_name"}},
        ...
    ],
    "education": [
        {{"degree": "degree_type", "field": "field_of_study", "required": true/false, "preferred": false}},
        ...
    ],
    "certifications": [
        {{"name": "certification_name", "issuer": "issuer_name", "required": false, "preferred": false}},
        ...
    ]
}}

For {source_context}s:
- Extract all technical and soft skills mentioned
- For job descriptions, mark skills as required if explicitly stated as "required" or "must have"
- Mark skills as preferred if stated as "preferred", "nice to have", or "bonus"
- Extract degree requirements (Bachelor's, Master's, PhD, etc.)
- Extract field of study if mentioned
- Extract certification names and issuers if mentioned

TEXT TO ANALYZE:
{text}

Return only valid JSON, no additional text or explanation."""
        
        messages = [
            {"role": "system", "content": SkillExtractionPrompts.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        return messages
    
    @staticmethod
    def build_technical_skills_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for technical skills extraction.
        
        Args:
            text: Text to extract technical skills from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting technical skills from resumes and job descriptions.
Focus on programming languages, frameworks, tools, databases, cloud services, DevOps, and technical concepts.
Extract only concrete technical skills that are explicitly mentioned."""
        
        user_prompt = f"""Extract all technical skills from the following text. 
Include: programming languages, frameworks, libraries, tools, platforms, databases, cloud services, DevOps tools, and technical concepts.

Return as JSON array:
[
    {{"name": "Python", "category": "programming_languages"}},
    {{"name": "Docker", "category": "tools_platforms"}},
    ...
]

TEXT:
{text}

Return only valid JSON array."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_soft_skills_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for soft skills extraction.
        
        Args:
            text: Text to extract soft skills from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting soft skills and interpersonal competencies from resumes and job descriptions.
Focus on leadership, communication, collaboration, problem-solving, and analytical thinking skills."""
        
        user_prompt = f"""Extract all soft skills and interpersonal competencies from the following text.

Return as JSON array:
[
    {{"name": "Leadership", "category": "leadership"}},
    {{"name": "Communication", "category": "communication"}},
    ...
]

TEXT:
{text}

Return only valid JSON array."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_education_extraction_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for education requirements extraction.
        
        Args:
            text: Text to extract education from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting education requirements and qualifications from resumes and job descriptions.
Identify degree types (Bachelor's, Master's, PhD, etc.) and fields of study."""
        
        user_prompt = f"""Extract all education requirements and qualifications from the following text.

Return as JSON array:
[
    {{"degree": "Bachelor's", "field": "Computer Science", "required": true, "preferred": false}},
    ...
]

TEXT:
{text}

Return only valid JSON array."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_certification_extraction_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for certification extraction.
        
        Args:
            text: Text to extract certifications from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting professional certifications from resumes and job descriptions.
Identify certification names and issuing organizations."""
        
        user_prompt = f"""Extract all certifications from the following text.

Return as JSON array:
[
    {{"name": "AWS Certified Solutions Architect", "issuer": "AWS", "required": false, "preferred": true}},
    ...
]

TEXT:
{text}

Return only valid JSON array."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def get_response_format() -> Dict[str, str]:
        """
        Get response format specification for JSON mode.
        
        Returns:
            Response format dictionary for LLM API
        """
        return {
            "type": "json_object"
        }


# Global prompts instance
skill_extraction_prompts = SkillExtractionPrompts()

