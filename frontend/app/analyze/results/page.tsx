"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import apiClient from "@/services/api";
import {
  SkillGapReport,
  SkillMatch,
  Skill,
  GapAnalysis,
  FitScoreBreakdown,
} from "@/utils/types";
import {
  SkillTag,
  CategoryBreakdownChart,
  ScoreDistributionChart,
  SkillMatchPieChart,
  MatchTypeDistributionChart,
} from "@/components/Charts";
import {
  LoadingSpinner,
  RetryableError,
  CardSkeleton,
  ChartSkeleton,
} from "@/components/LoadingStates";
import { exportToCSV, downloadCSV, downloadPDF } from "@/utils/export";
import { generatePDFReportFromIds } from "@/services/api";

export default function ResultsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="ml-4 text-lg text-gray-600 dark:text-gray-400">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <ResultsDashboardContent />
    </Suspense>
  );
}

function ResultsDashboardContent() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const fetchReport = async () => {
    if (!searchParams) {
      setError("Missing search parameters");
      setLoading(false);
      return;
    }

    const resumeId = searchParams.get("resume");
    const jdId = searchParams.get("jd");

    if (!resumeId || !jdId) {
      setError("Missing resume or job description ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First extract skills from both
      const extractResponse = await apiClient.post(
        "/api/extract/extract",
        {
          resume_id: resumeId,
          jd_id: jdId,
        }
      );

      // Then analyze the gap
      const analyzeResponse = await apiClient.post("/api/analyze/analyze-gap", {
        resume_skills: extractResponse.data.resume_skills,
        jd_skills: extractResponse.data.jd_skills,
      });

      setReport(analyzeResponse.data.report);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to generate analysis. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [searchParams]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchReport();
  };

  const handleDownloadPDF = async () => {
    if (!searchParams) {
      setError("Cannot download PDF: Missing search parameters");
      return;
    }

    const resumeId = searchParams.get("resume");
    const jdId = searchParams.get("jd");

    if (!resumeId || !jdId) {
      setError("Cannot download PDF: Missing resume or job description ID");
      return;
    }

    setDownloadingPDF(true);
    try {
      const pdfBlob = await generatePDFReportFromIds(resumeId, jdId);
      const filename = `skill_gap_report_${new Date().toISOString().split("T")[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to generate PDF. Please try again."
      );
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;

    setDownloadingCSV(true);
    try {
      const csvContent = exportToCSV(report);
      const filename = `skill_gap_report_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (err: any) {
      setError("Failed to generate CSV. Please try again.");
    } finally {
      setDownloadingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <CardSkeleton />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <RetryableError
          error={error}
          onRetry={handleRetry}
          retryCount={retryCount}
        />
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Download Actions */}
        <DownloadActions
          onDownloadPDF={handleDownloadPDF}
          onDownloadCSV={handleDownloadCSV}
          downloadingPDF={downloadingPDF}
          downloadingCSV={downloadingCSV}
        />

        {/* Fit Score Display */}
        <FitScoreDisplay fitScore={report.fit_score} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ScoreDistributionChart
            technicalScore={report.fit_score.technical_score}
            softSkillsScore={report.fit_score.soft_skills_score}
            educationScore={report.fit_score.education_score}
            certificationScore={report.fit_score.certification_score}
          />
          <SkillMatchPieChart
            matched={report.fit_score.matched_count}
            missing={report.fit_score.missing_count}
            total={report.fit_score.total_jd_skills}
          />
        </div>

        {report.gap_analysis.matched_skills.length > 0 && (
          <MatchTypeDistributionChart
            matches={report.gap_analysis.matched_skills}
          />
        )}

        {/* Skill Breakdown */}
        <SkillBreakdown gapAnalysis={report.gap_analysis} />

        {/* Category Breakdown Chart */}
        {Object.keys(report.gap_analysis.category_breakdown).length > 0 && (
          <CategoryBreakdownChart
            breakdown={report.gap_analysis.category_breakdown}
          />
        )}

        {/* Recommendations */}
        <RecommendationsSection recommendations={report.recommendations} />

        {/* Learning Resources */}
        {report.learning_resources && report.learning_resources.length > 0 && (
          <LearningResourcesSection resources={report.learning_resources} />
        )}
      </div>
    </div>
  );
}

function FitScoreDisplay({ fitScore }: { fitScore: FitScoreBreakdown }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 60) return "bg-blue-100 dark:bg-blue-900/20";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Fit Score Analysis
      </h2>

      {/* Overall Score */}
      <div className="text-center mb-8">
        <div
          className={`mx-auto inline-flex h-32 w-32 items-center justify-center rounded-full ${getScoreBgColor(
            fitScore.overall_score
          )}`}
        >
          <span
            className={`text-5xl font-bold ${getScoreColor(
              fitScore.overall_score
            )}`}
          >
            {fitScore.overall_score.toFixed(0)}
          </span>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
          Overall Match Score
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Technical Skills"
          score={fitScore.technical_score}
          weight={fitScore.technical_weight}
        />
        <ScoreCard
          label="Soft Skills"
          score={fitScore.soft_skills_score}
          weight={fitScore.soft_skills_weight}
        />
        {fitScore.education_score !== undefined && (
          <ScoreCard
            label="Education"
            score={fitScore.education_score}
            weight={undefined}
          />
        )}
        {fitScore.certification_score !== undefined && (
          <ScoreCard
            label="Certifications"
            score={fitScore.certification_score}
            weight={undefined}
          />
        )}
      </div>

      {/* Statistics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Matched Skills"
          value={fitScore.matched_count}
          total={fitScore.total_jd_skills}
        />
        <StatCard
          label="Missing Skills"
          value={fitScore.missing_count}
          total={fitScore.total_jd_skills}
        />
        <StatCard
          label="Total JD Skills"
          value={fitScore.total_jd_skills}
          total={undefined}
        />
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight?: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {score.toFixed(0)}%
      </p>
      {weight !== undefined && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Weight: {(weight * 100).toFixed(0)}%
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total?: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
        {total !== undefined && (
          <span className="text-lg text-gray-500 dark:text-gray-400">
            {" "}
            / {total}
          </span>
        )}
      </p>
    </div>
  );
}

function SkillBreakdown({ gapAnalysis }: { gapAnalysis: GapAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Matched Skills */}
      <SkillList
        title="Matched Skills"
        skills={gapAnalysis.matched_skills.map((m) => m.skill)}
        matches={gapAnalysis.matched_skills}
        type="matched"
      />

      {/* Missing Skills */}
      <SkillList
        title="Missing Skills"
        skills={gapAnalysis.missing_skills}
        type="missing"
      />

      {/* Extra Skills */}
      <SkillList
        title="Extra Skills"
        skills={gapAnalysis.extra_skills}
        type="extra"
      />

      {/* Category Breakdown */}
      <CategoryBreakdown breakdown={gapAnalysis.category_breakdown} />
    </div>
  );
}

function SkillList({
  title,
  skills,
  matches,
  type,
}: {
  title: string;
  skills: Skill[];
  matches?: SkillMatch[];
  type: "matched" | "missing" | "extra";
}) {
  if (skills.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No skills found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {title} ({skills.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => {
          const match = matches?.[index];
          return (
            <SkillTag
              key={`${skill.name}-${index}`}
              name={skill.name}
              category={skill.category}
              type={type}
              matchType={match?.match_type}
              confidence={match?.confidence}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryBreakdown({
  breakdown,
}: {
  breakdown: Record<string, Record<string, number>>;
}) {
  const categories = Object.entries(breakdown);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Category Breakdown
      </h3>
      <div className="space-y-4">
        {categories.map(([category, counts]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize mb-2">
              {category.replace(/_/g, " ")}
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Matched:
                </span>{" "}
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {counts.matched || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Missing:
                </span>{" "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {counts.missing || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Extra:</span>{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {counts.extra || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsSection({
  recommendations,
}: {
  recommendations: string[];
}) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Recommendations
      </h3>
      <ul className="space-y-3">
        {recommendations.map((rec, index) => (
          <li
            key={index}
            className="flex items-start text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="mr-2 text-blue-600 dark:text-blue-400">•</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DownloadActionsProps {
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
  downloadingPDF: boolean;
  downloadingCSV: boolean;
}

function DownloadActions({
  onDownloadPDF,
  onDownloadCSV,
  downloadingPDF,
  downloadingCSV,
}: DownloadActionsProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Download Report
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Download your skill gap analysis report in PDF or CSV format
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 transition-colors"
          >
            {downloadingPDF ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onDownloadCSV}
            disabled={downloadingCSV}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:disabled:bg-gray-900 transition-colors"
          >
            {downloadingCSV ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface LearningResourcesSectionProps {
  resources: Array<Record<string, any>>;
}

function LearningResourcesSection({ resources }: LearningResourcesSectionProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Learning Resources
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Here are some recommended learning resources to help you close the skill gaps:
      </p>
      <div className="space-y-4">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  {resource.name || "Learning Resource"}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {resource.type || "Course"}
                  </span>
                  {resource.platform && (
                    <span className="text-gray-500 dark:text-gray-400">
                      • {resource.platform}
                    </span>
                  )}
                </div>
                {resource.description && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {resource.description}
                  </p>
                )}
                {resource.related_skill && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Related to: <span className="font-medium">{resource.related_skill}</span>
                  </p>
                )}
              </div>
              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Visit
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

