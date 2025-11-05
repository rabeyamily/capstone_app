"""
PDF Report Generation Service using ReportLab.
"""
from io import BytesIO
from typing import Optional
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Image,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas

from app.models.schemas import SkillGapReport, FitScoreBreakdown, GapAnalysis


class PDFReportGenerator:
    """Generate PDF reports from skill gap analysis data."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style
        if "CustomTitle" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="CustomTitle",
                    parent=self.styles["Heading1"],
                    fontSize=24,
                    textColor=colors.HexColor("#1e40af"),
                    spaceAfter=30,
                    alignment=TA_CENTER,
                )
            )

        # Section header style
        if "SectionHeader" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="SectionHeader",
                    parent=self.styles["Heading2"],
                    fontSize=16,
                    textColor=colors.HexColor("#1e40af"),
                    spaceAfter=12,
                    spaceBefore=20,
                )
            )

        # Subsection header style
        if "SubsectionHeader" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="SubsectionHeader",
                    parent=self.styles["Heading3"],
                    fontSize=14,
                    textColor=colors.HexColor("#475569"),
                    spaceAfter=8,
                    spaceBefore=12,
                )
            )

        # Custom body text style (use different name to avoid conflict)
        if "ReportBodyText" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="ReportBodyText",
                    parent=self.styles["Normal"],
                    fontSize=11,
                    spaceAfter=12,
                    alignment=TA_JUSTIFY,
                )
            )

        # Score style
        if "ScoreText" not in self.styles.byName:
            self.styles.add(
                ParagraphStyle(
                    name="ScoreText",
                    parent=self.styles["Normal"],
                    fontSize=32,
                    textColor=colors.HexColor("#059669"),
                    alignment=TA_CENTER,
                    fontName="Helvetica-Bold",
                )
            )

    def generate_pdf(self, report: SkillGapReport) -> BytesIO:
        """
        Generate PDF report from SkillGapReport.
        
        Args:
            report: SkillGapReport object
            
        Returns:
            BytesIO buffer containing PDF data
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        story = []

        # Header
        story.extend(self._create_header(report))

        # Executive Summary
        story.extend(self._create_executive_summary(report))

        # Input Summaries Section
        story.extend(self._create_input_summaries_section(report))

        # Fit Score Section
        story.extend(self._create_fit_score_section(report.fit_score))

        # Skill Breakdown Section
        story.extend(self._create_skill_breakdown_section(report.gap_analysis))

        # Match Quality Analysis
        story.extend(self._create_match_quality_section(report.gap_analysis))

        # Recommendations Section
        story.extend(self._create_recommendations_section(report.recommendations))

        # Action Items Section
        story.extend(self._create_action_items_section(report))

        # Learning Resources Section (if available)
        if report.learning_resources:
            story.extend(self._create_learning_resources_section(report.learning_resources))

        # Footer
        story.extend(self._create_footer(report))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def _create_header(self, report: SkillGapReport) -> list:
        """Create report header."""
        elements = []

        # Title
        title = Paragraph("Skill Gap Analysis Report", self.styles["CustomTitle"])
        elements.append(title)
        elements.append(Spacer(1, 0.2 * inch))

        # Date
        date_str = report.generated_at.strftime("%B %d, %Y at %I:%M %p")
        date_para = Paragraph(f"Generated: {date_str}", self.styles["Normal"])
        elements.append(date_para)
        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_executive_summary(self, report: SkillGapReport) -> list:
        """Create executive summary section."""
        elements = []

        # Section header
        header = Paragraph("Executive Summary", self.styles["SectionHeader"])
        elements.append(header)

        # Overall score
        overall_score = report.fit_score.overall_score
        score_text = f"<b>Overall Fit Score: {overall_score:.1f}%</b>"
        score_para = Paragraph(score_text, self.styles["ReportBodyText"])
        elements.append(score_para)
        elements.append(Spacer(1, 0.1 * inch))

        # Summary text
        summary_text = f"""
        This comprehensive report analyzes the alignment between your resume and the target job description.
        You have achieved a <b>{overall_score:.1f}%</b> overall fit score, with <b>{report.fit_score.matched_count}</b> matched skills,
        <b>{report.fit_score.missing_count}</b> missing skills, and <b>{len(report.gap_analysis.extra_skills)}</b> extra skills.
        """
        summary_para = Paragraph(summary_text, self.styles["ReportBodyText"])
        elements.append(summary_para)
        elements.append(Spacer(1, 0.1 * inch))

        # Score interpretation
        if overall_score >= 80:
            interpretation = "Excellent match! Your skills align very well with the job requirements."
        elif overall_score >= 60:
            interpretation = "Good match! You have a solid foundation with room for improvement."
        elif overall_score >= 40:
            interpretation = "Moderate match. Focus on developing the missing skills identified below."
        else:
            interpretation = "Significant gaps identified. Consider whether this role aligns with your career goals or if you're willing to invest in substantial skill development."

        interpretation_para = Paragraph(f"<i>{interpretation}</i>", self.styles["ReportBodyText"])
        elements.append(interpretation_para)
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _create_fit_score_section(self, fit_score: FitScoreBreakdown) -> list:
        """Create fit score breakdown section."""
        elements = []

        header = Paragraph("Fit Score Breakdown", self.styles["SectionHeader"])
        elements.append(header)

        # Score table
        score_data = [
            ["Category", "Score (%)", "Weight"],
            [
                "Technical Skills",
                f"{fit_score.technical_score:.1f}%",
                f"{fit_score.technical_weight * 100:.0f}%",
            ],
            [
                "Soft Skills",
                f"{fit_score.soft_skills_score:.1f}%",
                f"{fit_score.soft_skills_weight * 100:.0f}%",
            ],
        ]

        if fit_score.education_score is not None:
            score_data.append(
                ["Education", f"{fit_score.education_score:.1f}%", "N/A"]
            )

        if fit_score.certification_score is not None:
            score_data.append(
                ["Certifications", f"{fit_score.certification_score:.1f}%", "N/A"]
            )

        score_table = Table(score_data, colWidths=[3 * inch, 1.5 * inch, 1.5 * inch])
        score_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                ]
            )
        )
        elements.append(score_table)
        elements.append(Spacer(1, 0.2 * inch))

        # Statistics
        stats_data = [
            ["Metric", "Count"],
            ["Matched Skills", str(fit_score.matched_count)],
            ["Missing Skills", str(fit_score.missing_count)],
            ["Total JD Skills", str(fit_score.total_jd_skills)],
        ]

        stats_table = Table(stats_data, colWidths=[3 * inch, 3 * inch])
        stats_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(stats_table)
        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_skill_breakdown_section(self, gap_analysis: GapAnalysis) -> list:
        """Create skill breakdown section."""
        elements = []

        header = Paragraph("Skill Breakdown", self.styles["SectionHeader"])
        elements.append(header)

        # Matched Skills
        if gap_analysis.matched_skills:
            matched_header = Paragraph(
                "Matched Skills", self.styles["SubsectionHeader"]
            )
            elements.append(matched_header)

            matched_text = f"""
            You have <b>{len(gap_analysis.matched_skills)}</b> skills that match the job requirements.
            """
            matched_intro = Paragraph(matched_text, self.styles["ReportBodyText"])
            elements.append(matched_intro)
            elements.append(Spacer(1, 0.1 * inch))

            matched_skills = [match.skill.name for match in gap_analysis.matched_skills]
            matched_list = ", ".join(matched_skills[:30])  # Increased limit
            if len(matched_skills) > 30:
                matched_list += f" ... and {len(matched_skills) - 30} more"
            matched_para = Paragraph(matched_list, self.styles["ReportBodyText"])
            elements.append(matched_para)
            elements.append(Spacer(1, 0.15 * inch))

        # Missing Skills
        if gap_analysis.missing_skills:
            missing_header = Paragraph(
                "Missing Skills", self.styles["SubsectionHeader"]
            )
            elements.append(missing_header)

            missing_text = f"""
            The following <b>{len(gap_analysis.missing_skills)}</b> skills are required or preferred for this position 
            but were not found in your resume:
            """
            missing_intro = Paragraph(missing_text, self.styles["ReportBodyText"])
            elements.append(missing_intro)
            elements.append(Spacer(1, 0.1 * inch))

            missing_skills = [skill.name for skill in gap_analysis.missing_skills]
            missing_list = ", ".join(missing_skills[:30])
            if len(missing_skills) > 30:
                missing_list += f" ... and {len(missing_skills) - 30} more"
            missing_para = Paragraph(missing_list, self.styles["ReportBodyText"])
            elements.append(missing_para)
            elements.append(Spacer(1, 0.15 * inch))

        # Extra Skills
        if gap_analysis.extra_skills:
            extra_header = Paragraph("Extra Skills", self.styles["SubsectionHeader"])
            elements.append(extra_header)

            extra_text = f"""
            You have <b>{len(gap_analysis.extra_skills)}</b> skills in your resume that are not explicitly mentioned 
            in the job description. These can be valuable differentiators:
            """
            extra_intro = Paragraph(extra_text, self.styles["ReportBodyText"])
            elements.append(extra_intro)
            elements.append(Spacer(1, 0.1 * inch))

            extra_skills = [skill.name for skill in gap_analysis.extra_skills]
            extra_list = ", ".join(extra_skills[:30])
            if len(extra_skills) > 30:
                extra_list += f" ... and {len(extra_skills) - 30} more"
            extra_para = Paragraph(extra_list, self.styles["ReportBodyText"])
            elements.append(extra_para)
            elements.append(Spacer(1, 0.15 * inch))

        # Category Breakdown
        if gap_analysis.category_breakdown:
            category_header = Paragraph(
                "Category Breakdown", self.styles["SubsectionHeader"]
            )
            elements.append(category_header)

            category_data = [["Category", "Matched", "Missing", "Extra"]]
            for category, counts in list(gap_analysis.category_breakdown.items())[:10]:
                category_data.append(
                    [
                        category.replace("_", " ").title(),
                        str(counts.get("matched", 0)),
                        str(counts.get("missing", 0)),
                        str(counts.get("extra", 0)),
                    ]
                )

            category_table = Table(
                category_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch]
            )
            category_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ]
                )
            )
            elements.append(category_table)
            elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_recommendations_section(self, recommendations: list) -> list:
        """Create recommendations section."""
        elements = []

        header = Paragraph("Recommendations", self.styles["SectionHeader"])
        elements.append(header)

        if not recommendations:
            no_recs = Paragraph(
                "No specific recommendations available at this time.",
                self.styles["ReportBodyText"],
            )
            elements.append(no_recs)
        else:
            for i, rec in enumerate(recommendations, 1):
                rec_text = f"<b>{i}.</b> {rec}"
                rec_para = Paragraph(rec_text, self.styles["ReportBodyText"])
                elements.append(rec_para)
                elements.append(Spacer(1, 0.1 * inch))

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_input_summaries_section(self, report: SkillGapReport) -> list:
        """Create input summaries section."""
        elements = []

        header = Paragraph("Input Summary", self.styles["SectionHeader"])
        elements.append(header)

        # Resume Summary
        if report.resume_summary:
            resume_header = Paragraph("Resume Overview", self.styles["SubsectionHeader"])
            elements.append(resume_header)

            resume_data = [
                ["Metric", "Value"],
                ["Total Skills", str(report.resume_summary.get("total_skills", 0))],
                ["Education Entries", str(report.resume_summary.get("total_education", 0))],
                ["Certifications", str(report.resume_summary.get("total_certifications", 0))],
            ]

            categories = report.resume_summary.get("skill_categories", [])
            if categories:
                resume_data.append(["Skill Categories", f"{len(categories)} categories"])

            resume_table = Table(resume_data, colWidths=[3 * inch, 3 * inch])
            resume_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ]
                )
            )
            elements.append(resume_table)
            elements.append(Spacer(1, 0.2 * inch))

        # Job Description Summary
        if report.job_description_summary:
            jd_header = Paragraph("Job Description Overview", self.styles["SubsectionHeader"])
            elements.append(jd_header)

            jd_data = [
                ["Metric", "Value"],
                ["Required Skills", str(report.job_description_summary.get("total_skills", 0))],
                ["Education Requirements", str(report.job_description_summary.get("total_education", 0))],
                ["Certification Requirements", str(report.job_description_summary.get("total_certifications", 0))],
            ]

            categories = report.job_description_summary.get("skill_categories", [])
            if categories:
                jd_data.append(["Skill Categories", f"{len(categories)} categories"])

            jd_table = Table(jd_data, colWidths=[3 * inch, 3 * inch])
            jd_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ]
                )
            )
            elements.append(jd_table)
            elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_match_quality_section(self, gap_analysis: GapAnalysis) -> list:
        """Create match quality analysis section."""
        elements = []

        header = Paragraph("Match Quality Analysis", self.styles["SectionHeader"])
        elements.append(header)

        # Analyze match types
        match_types = {}
        for match in gap_analysis.matched_skills:
            match_type = match.match_type
            match_types[match_type] = match_types.get(match_type, 0) + 1

        if match_types:
            quality_text = "Your skills matched the job requirements with the following quality distribution:"
            quality_para = Paragraph(quality_text, self.styles["ReportBodyText"])
            elements.append(quality_para)
            elements.append(Spacer(1, 0.1 * inch))

            quality_data = [["Match Type", "Count", "Percentage"]]
            total_matches = sum(match_types.values())
            for match_type, count in sorted(match_types.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / total_matches * 100) if total_matches > 0 else 0
                quality_data.append([
                    match_type.capitalize(),
                    str(count),
                    f"{percentage:.1f}%"
                ])

            quality_table = Table(quality_data, colWidths=[2 * inch, 2 * inch, 2 * inch])
            quality_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                    ]
                )
            )
            elements.append(quality_table)
            elements.append(Spacer(1, 0.2 * inch))

            # Match quality insights
            exact_matches = match_types.get("exact", 0)
            if exact_matches > 0:
                exact_percentage = (exact_matches / total_matches * 100) if total_matches > 0 else 0
                if exact_percentage >= 70:
                    insight = "Excellent! Most of your skills match exactly with the job requirements."
                elif exact_percentage >= 50:
                    insight = "Good match quality. Consider updating your resume terminology to match the job description more closely."
                else:
                    insight = "Consider refining your resume to use terminology that matches the job description more closely."

                insight_para = Paragraph(f"<i>{insight}</i>", self.styles["ReportBodyText"])
                elements.append(insight_para)

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_action_items_section(self, report: SkillGapReport) -> list:
        """Create actionable items section."""
        elements = []

        header = Paragraph("Action Items", self.styles["SectionHeader"])
        elements.append(header)

        action_items = []

        # Based on missing skills
        if report.gap_analysis.missing_skills:
            top_missing = report.gap_analysis.missing_skills[:5]
            missing_names = ", ".join([skill.name for skill in top_missing])
            action_items.append(
                f"<b>Priority:</b> Focus on learning these top missing skills: {missing_names}"
            )

        # Based on fit score
        overall_score = report.fit_score.overall_score
        if overall_score < 60:
            action_items.append(
                "<b>Immediate:</b> Consider taking online courses or getting certifications "
                "to strengthen your profile in the required skill areas."
            )
        elif overall_score < 80:
            action_items.append(
                "<b>Enhancement:</b> Work on the missing skills identified above to improve "
                "your overall fit score."
            )

        # Based on match quality
        matched_skills = report.gap_analysis.matched_skills
        fuzzy_matches = [m for m in matched_skills if m.match_type == "fuzzy"]
        if len(fuzzy_matches) > len(matched_skills) * 0.3:
            action_items.append(
                "<b>Resume Optimization:</b> Update your resume to use the exact terminology "
                "from the job description to improve keyword matching."
            )

        # Based on extra skills
        if report.gap_analysis.extra_skills:
            action_items.append(
                "<b>Highlight:</b> Emphasize your additional skills in your cover letter "
                "and interviews to differentiate yourself from other candidates."
            )

        if not action_items:
            action_items.append(
                "Review the recommendations above and focus on areas where you can improve "
                "your skill alignment."
            )

        for i, item in enumerate(action_items, 1):
            item_text = f"<b>{i}.</b> {item}"
            item_para = Paragraph(item_text, self.styles["ReportBodyText"])
            elements.append(item_para)
            elements.append(Spacer(1, 0.1 * inch))

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_learning_resources_section(self, learning_resources: list) -> list:
        """Create learning resources section."""
        elements = []

        header = Paragraph("Learning Resources", self.styles["SectionHeader"])
        elements.append(header)

        intro_text = "Here are some recommended learning resources to help you close the skill gaps:"
        intro_para = Paragraph(intro_text, self.styles["ReportBodyText"])
        elements.append(intro_para)
        elements.append(Spacer(1, 0.1 * inch))

        for i, resource in enumerate(learning_resources[:10], 1):  # Limit to 10
            resource_name = resource.get("name", "Resource")
            resource_type = resource.get("type", "Course")
            resource_url = resource.get("url", "")
            resource_description = resource.get("description", "")

            resource_text = f"""
            <b>{i}. {resource_name}</b> ({resource_type})<br/>
            {resource_description}
            """
            if resource_url:
                resource_text += f"<br/><i>URL: {resource_url}</i>"

            resource_para = Paragraph(resource_text, self.styles["ReportBodyText"])
            elements.append(resource_para)
            elements.append(Spacer(1, 0.15 * inch))

        elements.append(Spacer(1, 0.3 * inch))

        return elements

    def _create_footer(self, report: SkillGapReport) -> list:
        """Create report footer."""
        elements = []

        footer_text = f"""
        <i>Report Version: {report.version} | Generated by SkilledU</i>
        """
        footer_para = Paragraph(footer_text, self.styles["Normal"])
        elements.append(footer_para)

        return elements


# Global PDF generator instance
pdf_report_generator = PDFReportGenerator()

