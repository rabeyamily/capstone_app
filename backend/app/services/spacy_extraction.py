"""
Alternative NLP-based skill extraction using spaCy as fallback.
"""
import re
from typing import List, Dict, Set, Optional, Tuple
import spacy
from spacy.matcher import Matcher
from app.models.schemas import Skill, Education, Certification
from app.models.skill_taxonomy import SkillCategory


class SpacySkillExtractor:
    """spaCy-based skill extraction as fallback when LLM is unavailable."""
    
    def __init__(self):
        """Initialize spaCy model and skill dictionaries."""
        self.nlp = None
        self.matcher = None
        self._initialize_model()
        self._build_skill_dictionary()
        self._build_matcher_patterns()
    
    def _initialize_model(self):
        """Initialize spaCy model."""
        try:
            # Try to load the model
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Model not found - will use keyword matching only
            self.nlp = None
    
    def _build_skill_dictionary(self):
        """Build skill dictionary for keyword matching."""
        self.skill_dict = {
            # Programming Languages
            SkillCategory.PROGRAMMING_LANGUAGES: {
                "python", "java", "javascript", "typescript", "c++", "c#", "cpp", "go", "golang",
                "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
                "haskell", "erlang", "clojure", "lua", "objective-c", "dart", "elixir"
            },
            # Frameworks & Libraries
            SkillCategory.FRAMEWORKS_LIBRARIES: {
                "react", "django", "spring", "spring boot", "flask", "express", "angular",
                "vue", "node.js", "nodejs", "tensorflow", "pytorch", "keras", "pandas",
                "numpy", "scikit-learn", "scikit", "sklearn", "redux", "next.js", "nextjs",
                "laravel", "symfony", "rails", "ruby on rails", "asp.net", "aspnet",
                "jquery", "bootstrap", "tailwind", "tailwindcss"
            },
            # Tools & Platforms
            SkillCategory.TOOLS_PLATFORMS: {
                "git", "jira", "confluence", "slack", "vs code", "vscode", "intellij",
                "eclipse", "visual studio", "postman", "insomnia", "fiddler", "wireshark",
                "figma", "sketch", "adobe xd", "trello", "asana", "monday", "notion"
            },
            # Databases
            SkillCategory.DATABASES: {
                "postgresql", "postgres", "mysql", "mongodb", "mongo", "redis", "cassandra",
                "oracle", "sqlite", "dynamodb", "elasticsearch", "solr", "couchdb",
                "neo4j", "mariadb", "firebase", "supabase"
            },
            # Cloud Services
            SkillCategory.CLOUD_SERVICES: {
                "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
                "google cloud platform", "heroku", "vercel", "netlify", "digitalocean",
                "cloudflare", "linode", "vultr"
            },
            # DevOps
            SkillCategory.DEVOPS: {
                "kubernetes", "k8s", "docker", "terraform", "jenkins", "gitlab ci", "github actions",
                "ansible", "puppet", "chef", "vagrant", "prometheus", "grafana", "splunk",
                "elastic", "elk stack", "ci/cd", "continuous integration", "continuous deployment"
            },
            # Software Architecture
            SkillCategory.SOFTWARE_ARCHITECTURE: {
                "microservices", "rest api", "rest", "graphql", "soap", "api design",
                "design patterns", "system design", "distributed systems", "event-driven",
                "service-oriented", "soa", "monolith", "serverless", "lambda"
            },
            # Machine Learning
            SkillCategory.MACHINE_LEARNING: {
                "machine learning", "ml", "deep learning", "neural networks", "nlp",
                "natural language processing", "computer vision", "reinforcement learning",
                "supervised learning", "unsupervised learning", "neural net", "cnn", "rnn",
                "lstm", "transformer", "bert", "gpt"
            },
            # Blockchain
            SkillCategory.BLOCKCHAIN: {
                "blockchain", "solidity", "ethereum", "smart contracts", "web3", "defi",
                "decentralized finance", "bitcoin", "cryptocurrency", "hyperledger",
                "nft", "non-fungible token"
            },
            # Cybersecurity
            SkillCategory.CYBERSECURITY: {
                "cybersecurity", "penetration testing", "pen testing", "security", "encryption",
                "ssl", "tls", "oauth", "oauth2", "jwt", "authentication", "authorization",
                "vulnerability assessment", "security auditing"
            },
            # Data Science
            SkillCategory.DATA_SCIENCE: {
                "data science", "data analysis", "data analytics", "statistics", "etl",
                "data visualization", "tableau", "power bi", "looker", "metabase",
                "sql", "nosql", "data mining", "big data", "hadoop", "spark"
            },
            # Soft Skills
            SkillCategory.LEADERSHIP: {
                "leadership", "team management", "mentoring", "strategic planning", "managing",
                "supervision", "team leadership", "people management"
            },
            SkillCategory.COMMUNICATION: {
                "communication", "technical writing", "presentations", "public speaking",
                "written communication", "verbal communication", "documentation"
            },
            SkillCategory.COLLABORATION: {
                "collaboration", "teamwork", "pair programming", "code reviews",
                "cross-functional", "cooperation", "agile collaboration"
            },
            SkillCategory.PROBLEM_SOLVING: {
                "problem solving", "debugging", "troubleshooting", "critical thinking",
                "analytical problem solving", "troubleshoot"
            },
            SkillCategory.ANALYTICAL_THINKING: {
                "analytical thinking", "data analysis", "root cause analysis",
                "logical reasoning", "analysis", "analytical skills"
            },
            # Methodologies
            SkillCategory.AGILE: {
                "agile", "agile development", "agile methodologies", "agile practices"
            },
            SkillCategory.SCRUM: {
                "scrum", "scrum master", "sprint", "scrum practices", "sprint planning",
                "daily standup", "sprint retrospective"
            },
            SkillCategory.CI_CD: {
                "ci/cd", "continuous integration", "continuous deployment", "continuous delivery",
                "ci", "cd", "pipeline", "devops pipeline"
            },
        }
    
    def _build_matcher_patterns(self):
        """Build spaCy matcher patterns."""
        if not self.nlp:
            return
        
        self.matcher = Matcher(self.nlp.vocab)
        
        # Add patterns for common skill mentions
        patterns = [
            [{"LOWER": {"IN": ["proficient", "experienced", "skilled", "expert"]}},
             {"LOWER": {"IN": ["in", "with"]}},
             {"POS": "PROPN", "OP": "+"}],
            [{"LOWER": {"IN": ["knowledge", "experience"]}},
             {"LOWER": {"IN": ["of", "with"]}},
             {"POS": "PROPN", "OP": "+"}],
        ]
        
        for pattern in patterns:
            self.matcher.add("SKILL_MENTION", [pattern])
    
    def extract_skills(self, text: str) -> List[Skill]:
        """
        Extract skills using keyword matching and spaCy.
        
        Args:
            text: Text to extract skills from
            
        Returns:
            List of Skill objects
        """
        if not text:
            return []
        
        text_lower = text.lower()
        found_skills = {}
        
        # Keyword matching against skill dictionary
        for category, skill_set in self.skill_dict.items():
            for skill_name in skill_set:
                # Use word boundaries for exact matching
                pattern = r'\b' + re.escape(skill_name.lower()) + r'\b'
                if re.search(pattern, text_lower):
                    # Use the original skill name from dictionary or capitalize
                    display_name = skill_name.title() if skill_name.islower() else skill_name
                    found_skills[display_name.lower()] = Skill(
                        name=display_name,
                        category=category,
                        confidence=0.8  # Lower confidence for keyword matching
                    )
        
        # Use spaCy NER if available
        if self.nlp and self.matcher:
            doc = self.nlp(text)
            
            # Find skill mentions using matcher
            matches = self.matcher(doc)
            for match_id, start, end in matches:
                span = doc[start:end]
                # Extract potential skill names
                potential_skill = span.text.strip()
                if len(potential_skill) > 2:
                    # Try to categorize
                    category = self._categorize_skill(potential_skill)
                    if category:
                        found_skills[potential_skill.lower()] = Skill(
                            name=potential_skill,
                            category=category,
                            confidence=0.7
                        )
        
        return list(found_skills.values())
    
    def _categorize_skill(self, skill_name: str) -> Optional[SkillCategory]:
        """Categorize a skill name."""
        skill_lower = skill_name.lower()
        
        for category, skill_set in self.skill_dict.items():
            if skill_lower in skill_set:
                return category
        
        return None
    
    def extract_education(self, text: str, source_type: str = "resume") -> List[Education]:
        """
        Extract education requirements using pattern matching.
        
        Args:
            text: Text to extract from
            source_type: Type of source
            
        Returns:
            List of Education objects
        """
        education_list = []
        text_lower = text.lower()
        
        # Patterns for degree types
        degree_patterns = {
            r"\b(bachelor['s]?|b\.?s\.?|b\.?a\.?|b\.?sc\.?)\b": "Bachelor's",
            r"\b(master['s]?|m\.?s\.?|m\.?a\.?|m\.?sc\.?|mba)\b": "Master's",
            r"\b(ph\.?d\.?|doctorate|doctoral)\b": "PhD",
            r"\b(associate['s]?|a\.?a\.?|a\.?s\.?)\b": "Associate's",
        }
        
        # Patterns for fields
        field_patterns = {
            r"\b(computer\s+science|cs|software\s+engineering|se)\b": "Computer Science",
            r"\b(information\s+technology|it)\b": "Information Technology",
            r"\b(electrical\s+engineering|ee)\b": "Electrical Engineering",
            r"\b(artificial\s+intelligence|ai|machine\s+learning)\b": "Artificial Intelligence",
        }
        
        # Find degree mentions
        for pattern, degree in degree_patterns.items():
            if re.search(pattern, text_lower):
                # Try to find associated field
                field = None
                for field_pattern, field_name in field_patterns.items():
                    if re.search(field_pattern, text_lower):
                        field = field_name
                        break
                
                # Determine if required/preferred
                required = False
                preferred = False
                if source_type == "job_description":
                    # Check context around degree mention
                    context = text_lower[max(0, text_lower.find(pattern) - 50):
                                         min(len(text_lower), text_lower.find(pattern) + 100)]
                    if "required" in context or "must have" in context:
                        required = True
                    elif "preferred" in context or "nice to have" in context:
                        preferred = True
                
                education_list.append(Education(
                    degree=degree,
                    field=field,
                    required=required,
                    preferred=preferred
                ))
        
        return education_list
    
    def extract_certifications(self, text: str, source_type: str = "resume") -> List[Certification]:
        """
        Extract certifications using pattern matching.
        
        Args:
            text: Text to extract from
            source_type: Type of source
            
        Returns:
            List of Certification objects
        """
        certifications = []
        text_lower = text.lower()
        
        # Common certification patterns
        cert_patterns = {
            r"\b(aws\s+certified\s+\w+)\b": ("AWS", r"aws"),
            r"\b(azure\s+\w+\s+certified)\b": ("Microsoft", r"azure"),
            r"\b(google\s+cloud\s+professional)\b": ("Google", r"gcp"),
            r"\b(pmp|project\s+management\s+professional)\b": ("PMI", r"pmp"),
            r"\b(cissp|certified\s+information\s+systems\s+security)\b": ("ISC2", r"cissp"),
            r"\b(cisco\s+ccna|ccnp|ccie)\b": ("Cisco", r"cisco"),
        }
        
        for cert_pattern, (issuer, issuer_pattern) in cert_patterns.items():
            matches = re.finditer(cert_pattern, text_lower)
            for match in matches:
                cert_name = match.group(0).title()
                
                # Determine if required/preferred
                required = False
                preferred = False
                if source_type == "job_description":
                    context = text_lower[max(0, match.start() - 50):
                                         min(len(text_lower), match.end() + 100)]
                    if "required" in context or "must have" in context:
                        required = True
                    elif "preferred" in context or "nice to have" in context:
                        preferred = True
                
                certifications.append(Certification(
                    name=cert_name,
                    issuer=issuer,
                    required=required,
                    preferred=preferred
                ))
        
        return certifications


# Global spaCy extractor instance
spacy_skill_extractor = SpacySkillExtractor()

