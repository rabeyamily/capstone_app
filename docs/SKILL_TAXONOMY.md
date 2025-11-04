# Skill Taxonomy Documentation

## Overview

This document describes the skill taxonomy and data models used in the Resume Job Skill Gap Analyzer application.

## Skill Categories

The application uses a hierarchical skill taxonomy to classify skills extracted from resumes and job descriptions.

### Technical Skills

1. **Programming Languages** (`programming_languages`)
   - Examples: Python, Java, JavaScript, C++, Go, Rust, TypeScript
   - Description: Core programming languages

2. **Frameworks & Libraries** (`frameworks_libraries`)
   - Examples: React, Django, Spring Boot, TensorFlow, PyTorch
   - Description: Development frameworks and libraries

3. **Tools & Platforms** (`tools_platforms`)
   - Examples: Git, Docker, Jira, VS Code, IntelliJ
   - Description: Development tools and platforms

4. **Databases** (`databases`)
   - Examples: PostgreSQL, MongoDB, Redis, MySQL, Cassandra
   - Description: Database technologies

5. **Cloud Services** (`cloud_services`)
   - Examples: AWS, Azure, GCP, Heroku
   - Description: Cloud platforms and services

6. **DevOps** (`devops`)
   - Examples: Kubernetes, Terraform, Jenkins, CI/CD, Docker Swarm
   - Description: DevOps tools and practices

### Conceptual Skills

7. **Software Architecture** (`software_architecture`)
   - Examples: Microservices, REST APIs, Design Patterns, System Design
   - Description: Architecture patterns and concepts

8. **Machine Learning** (`machine_learning`)
   - Examples: Neural Networks, NLP, Computer Vision, Deep Learning
   - Description: ML and AI technologies

9. **Blockchain** (`blockchain`)
   - Examples: Solidity, Ethereum, Smart Contracts, Web3
   - Description: Blockchain technologies

10. **Cybersecurity** (`cybersecurity`)
    - Examples: Penetration Testing, Security Protocols, Encryption
    - Description: Security skills and tools

11. **Data Science** (`data_science`)
    - Examples: Data Analysis, Statistics, Visualization, ETL
    - Description: Data science and analytics

### Soft Skills

12. **Leadership** (`leadership`)
    - Examples: Team Management, Mentoring, Strategic Planning
    - Description: Leadership capabilities

13. **Communication** (`communication`)
    - Examples: Technical Writing, Presentations, Cross-functional Collaboration
    - Description: Communication abilities

14. **Collaboration** (`collaboration`)
    - Examples: Teamwork, Pair Programming, Code Reviews
    - Description: Collaborative skills

15. **Problem Solving** (`problem_solving`)
    - Examples: Debugging, Troubleshooting, Critical Thinking
    - Description: Problem-solving abilities

16. **Analytical Thinking** (`analytical_thinking`)
    - Examples: Data Analysis, Root Cause Analysis, Logical Reasoning
    - Description: Analytical capabilities

### Methodologies

17. **Agile** (`agile`)
    - Examples: Agile Development, Sprint Planning, User Stories
    - Description: Agile methodologies

18. **Scrum** (`scrum`)
    - Examples: Scrum Master, Sprint Retrospectives, Daily Standups
    - Description: Scrum practices

19. **CI/CD** (`ci_cd`)
    - Examples: Continuous Integration, Continuous Deployment, Pipeline Automation
    - Description: CI/CD practices

20. **Design Thinking** (`design_thinking`)
    - Examples: User-Centered Design, Prototyping, User Research
    - Description: Design thinking approach

### Education & Certifications

21. **Education** (`education`)
    - Examples: Bachelor's in CS, Master's in AI, PhD
    - Description: Education requirements

22. **Certifications** (`certifications`)
    - Examples: AWS Certified Architect, Azure Developer, PMP
    - Description: Professional certifications

### Domain Knowledge

23. **FinTech** (`fintech`)
    - Examples: Payment Systems, Banking Software, Financial APIs
    - Description: Financial technology domain

24. **Healthcare IT** (`healthcare_it`)
    - Examples: EHR Systems, HIPAA Compliance, Medical Software
    - Description: Healthcare IT domain

25. **E-commerce** (`e_commerce`)
    - Examples: Online Retail, Payment Processing, Inventory Management
    - Description: E-commerce domain

26. **Other** (`other`)
    - Examples: Any skills that don't fit the above categories
    - Description: Miscellaneous skills

## Data Models

### Core Models

#### Skill
Represents a single skill with metadata:
- `name`: Name of the skill
- `category`: Skill category (enum)
- `confidence`: Confidence score (0-1, optional)
- `aliases`: Alternative names for the skill

#### Education
Represents education requirements:
- `degree`: Degree type (Bachelor's, Master's, PhD, etc.)
- `field`: Field of study
- `required`: Whether required
- `preferred`: Whether preferred

#### Certification
Represents professional certifications:
- `name`: Certification name
- `issuer`: Certifying organization
- `required`: Whether required
- `preferred`: Whether preferred

#### ResumeData
Complete resume data:
- `text`: Raw resume text
- `name`: Candidate name
- `email`: Candidate email
- `skills`: List of extracted skills
- `education`: Education details
- `certifications`: Certifications
- `experience_years`: Years of experience
- `extracted_at`: Timestamp

#### JobDescription
Complete job description data:
- `text`: Raw JD text
- `title`: Job title
- `company`: Company name
- `skills`: Required/preferred skills
- `education`: Education requirements
- `certifications`: Certification requirements
- `experience_years`: Required years
- `extracted_at`: Timestamp

### Analysis Models

#### SkillExtractionResult
Result of skill extraction:
- `skills`: Extracted skills
- `education`: Education found
- `certifications`: Certifications found
- `extraction_method`: Method used (llm, spacy, etc.)
- `confidence_score`: Overall confidence
- `raw_text`: Original text

#### SkillMatch
Matched skill between resume and JD:
- `skill`: The matched skill
- `match_type`: Type (exact, synonym, fuzzy)
- `confidence`: Match confidence

#### GapAnalysis
Gap analysis results:
- `matched_skills`: Skills in both
- `missing_skills`: Skills in JD but not resume
- `extra_skills`: Skills in resume but not JD
- `category_breakdown`: Breakdown by category

#### FitScoreBreakdown
Detailed fit score:
- `overall_score`: Overall percentage (0-100)
- `technical_score`: Technical skills score
- `soft_skills_score`: Soft skills score
- `education_score`: Education match score
- `certification_score`: Certification match score
- `matched_count`: Number matched
- `missing_count`: Number missing
- `total_jd_skills`: Total JD skills
- `technical_weight`: Weight for technical (default 0.7)
- `soft_skills_weight`: Weight for soft (default 0.3)

#### SkillGapReport
Complete analysis report:
- `resume_id`: Resume identifier
- `job_description_id`: JD identifier
- `resume_summary`: Resume summary
- `job_description_summary`: JD summary
- `fit_score`: Fit score breakdown
- `gap_analysis`: Gap analysis details
- `recommendations`: Personalized recommendations
- `learning_resources`: Suggested learning resources
- `generated_at`: Generation timestamp
- `version`: Report format version

## Fit Score Calculation

The fit score is calculated using a weighted formula:

```
Fit Score = (Technical Matched × 0.7 + Soft Matched × 0.3) / Total JD Skills × 100
```

Where:
- Technical skills include: Programming Languages, Frameworks, Tools, Databases, Cloud, DevOps, Architecture, ML, Blockchain, Cybersecurity, Data Science
- Soft skills include: Leadership, Communication, Collaboration, Problem Solving, Analytical Thinking

Weights can be customized via the API request.

## JSON Schema

All models follow Pydantic schemas which automatically generate JSON schemas for API documentation. See `/docs` endpoint when backend is running.

