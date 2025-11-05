"use client";

import { useState, useEffect, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import Link from "next/link";
import apiClient from "@/services/api";
import {
  SkillGapReport,
  SkillMatch,
  Skill,
  FitScoreBreakdown,
} from "@/utils/types";
import {
  SkillTag,
} from "@/components/Charts";
import {
  RetryableError,
} from "@/components/LoadingStates";
import { exportToCSV, downloadCSV, downloadPDF } from "@/utils/export";
import { generatePDFReportFromIds } from "@/services/api";

export default function Home() {
  const [resumeFileId, setResumeFileId] = useState<string | null>(null);
  const [resumeTextId, setResumeTextId] = useState<string | null>(null);
  const [jdFileId, setJdFileId] = useState<string | null>(null);
  const [jdTextId, setJdTextId] = useState<string | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const handleResumeUpload = (fileId: string, filename: string) => {
    setResumeFileId(fileId);
    setResumeTextId(null);
  };

  const handleResumeText = (textId: string) => {
    setResumeTextId(textId);
    setResumeFileId(null);
  };

  const handleJDUpload = (fileId: string, filename: string) => {
    setJdFileId(fileId);
    setJdTextId(null);
  };

  const handleJDText = (textId: string) => {
    setJdTextId(textId);
    setJdFileId(null);
  };

  useEffect(() => {
    const hasResume = !!(resumeFileId || resumeTextId);
    const hasJD = !!(jdFileId || jdTextId);
    setCanAnalyze(hasResume && hasJD);
  }, [resumeFileId, resumeTextId, jdFileId, jdTextId]);

  const fetchReport = useCallback(async () => {
    const resumeId = resumeFileId || resumeTextId;
    const jdId = jdFileId || jdTextId;

    if (!resumeId || !jdId) {
      setError("Missing resume or job description");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const storedResumeText = 
        (resumeId && sessionStorage.getItem(`resume_text_${resumeId}`)) ||
        sessionStorage.getItem(`resume_text`) ||
        sessionStorage.getItem(`resume_text_${resumeId || ''}`) ||
        null;
      
      const storedJdText = 
        (jdId && sessionStorage.getItem(`jd_text_${jdId}`)) ||
        sessionStorage.getItem(`jd_text`) ||
        sessionStorage.getItem(`job_description_text_${jdId || ''}`) ||
        null;

      const genericResumeText = sessionStorage.getItem('current_resume_text');
      const genericJdText = sessionStorage.getItem('current_jd_text');

      let extractRequest: any = {};
      
      if (storedResumeText || genericResumeText) {
        extractRequest.resume_text = storedResumeText || genericResumeText;
      } else if (resumeId) {
        extractRequest.resume_id = resumeId;
      }
      
      if (storedJdText || genericJdText) {
        extractRequest.job_description_text = storedJdText || genericJdText;
      } else if (jdId) {
        extractRequest.jd_id = jdId;
      }

      if (!extractRequest.resume_text && !extractRequest.resume_id) {
        throw new Error("Resume data is required. Please upload or paste your resume and try again.");
      }

      const extractTimeout = 180000;
      const extractController = new AbortController();
      let extractTimeoutId: NodeJS.Timeout | null = null;
      extractTimeoutId = setTimeout(() => extractController.abort(), extractTimeout);

      let extractResponse;
      try {
        extractResponse = await apiClient.post("/api/extract/extract", extractRequest, {
          signal: extractController.signal,
          timeout: extractTimeout,
        });
        if (extractTimeoutId) clearTimeout(extractTimeoutId);
      } catch (extractErr: any) {
        if (extractTimeoutId) clearTimeout(extractTimeoutId);
        
        if (extractErr.code === 'ERR_CANCELED' || extractErr.message === 'canceled' || extractErr.name === 'CanceledError') {
          if (extractController.signal.aborted) {
            throw new Error("Extraction timed out. Please try again.");
          }
          throw new Error("Extraction was cancelled. Please try again.");
        }
        
        if (extractErr.code === 'ECONNABORTED' || extractErr.message?.includes('timeout')) {
          throw new Error("Extraction is taking too long. Please try again.");
        }
        
        const fallbackResumeText = sessionStorage.getItem(`resume_text_${resumeId}`) || sessionStorage.getItem(`resume_text`);
        const fallbackJdText = sessionStorage.getItem(`jd_text_${jdId}`) || sessionStorage.getItem(`jd_text`);
        
        if (fallbackResumeText && fallbackJdText) {
          const retryController = new AbortController();
          let retryTimeoutId: NodeJS.Timeout | null = null;
          retryTimeoutId = setTimeout(() => retryController.abort(), extractTimeout);
          
          try {
            extractResponse = await apiClient.post("/api/extract/extract", {
              resume_text: fallbackResumeText,
              job_description_text: fallbackJdText,
            }, {
              signal: retryController.signal,
              timeout: extractTimeout,
            });
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
          } catch (retryErr: any) {
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
            throw retryErr;
          }
        } else {
          throw extractErr;
        }
      }

      const analyzeTimeout = 30000;
      const analyzeController = new AbortController();
      let analyzeTimeoutId: NodeJS.Timeout | null = null;
      analyzeTimeoutId = setTimeout(() => analyzeController.abort(), analyzeTimeout);

      let analyzeResponse;
      try {
        analyzeResponse = await apiClient.post("/api/analyze/analyze-gap", {
          resume_skills: extractResponse.data.resume_skills,
          jd_skills: extractResponse.data.jd_skills,
        }, {
          signal: analyzeController.signal,
          timeout: analyzeTimeout,
        });
        if (analyzeTimeoutId) clearTimeout(analyzeTimeoutId);
      } catch (analyzeErr: any) {
        if (analyzeTimeoutId) clearTimeout(analyzeTimeoutId);
        
        if (analyzeErr.code === 'ERR_CANCELED' || analyzeErr.message === 'canceled' || analyzeErr.name === 'CanceledError') {
          if (analyzeController.signal.aborted) {
            throw new Error("Analysis timed out. Please try again.");
          }
          throw new Error("Analysis was cancelled. Please try again.");
        }
        
        if (analyzeErr.code === 'ECONNABORTED' || analyzeErr.message?.includes('timeout')) {
          throw new Error("Analysis is taking too long. Please try again.");
        }
        throw analyzeErr;
      }

      const reportData = analyzeResponse.data.report;
      setReport(reportData);
      
      if (reportData) {
        try {
          sessionStorage.setItem('last_report', JSON.stringify(reportData));
          sessionStorage.setItem('last_report_resume_id', resumeId || '');
          sessionStorage.setItem('last_report_jd_id', jdId || '');
        } catch (e) {
          console.warn('Failed to store report in sessionStorage:', e);
        }
      }
      
      setRetryCount(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to generate analysis.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [resumeFileId, resumeTextId, jdFileId, jdTextId]);

  const handleAnalyze = () => {
    const ids = {
      resumeId: resumeFileId || resumeTextId,
      jdId: jdFileId || jdTextId,
    };

    if (ids.resumeId) {
      sessionStorage.setItem('current_resume_id', ids.resumeId);
      const resumeText = sessionStorage.getItem(`resume_text_${ids.resumeId}`) || sessionStorage.getItem(`resume_text`);
      if (resumeText) {
        sessionStorage.setItem('current_resume_text', resumeText);
      }
    }
    if (ids.jdId) {
      sessionStorage.setItem('current_jd_id', ids.jdId);
      const jdText = sessionStorage.getItem(`jd_text_${ids.jdId}`) || 
                     sessionStorage.getItem(`job_description_text_${ids.jdId}`) ||
                     sessionStorage.getItem(`jd_text`);
      if (jdText) {
        sessionStorage.setItem('current_jd_text', jdText);
      }
    }

    fetchReport();
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchReport();
  };

  const handleDownloadPDF = async () => {
    const resumeId = resumeFileId || resumeTextId;
    const jdId = jdFileId || jdTextId;

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
      setError(err.response?.data?.detail || "Failed to generate PDF. Please try again.");
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

  return (
    <div className="bg-gradient-to-b from-orange-50 via-[#FFF8F0] to-orange-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-orange-950/20">
      {/* Banner Tab */}
      {bannerVisible && (
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 dark:from-orange-900 dark:via-orange-600 dark:to-orange-900 w-full">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <h1 
                className="text-2xl sm:text-3xl font-bold text-white flex-shrink-0"
                style={{
                  fontFamily: "var(--font-lora), 'Lora', serif",
                }}
              >
                What is SkilledU?
              </h1>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed text-center flex-1 px-4" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
                See how your skills align with industry needs. Upload your resume and a job description to get instant fit scores, skill gap insights, and personalized recommendations.
              </p>
              <div className="flex items-center gap-6 flex-shrink-0 ml-auto">
                <Link
                  href="/about"
                  className="text-sm text-white hover:text-white/80 transition-colors whitespace-nowrap underline underline-offset-2"
                >
                  Learn More
                </Link>
                <button
                  onClick={() => setBannerVisible(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-white/20 transition-colors flex-shrink-0"
                  aria-label="Close banner"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Upload Section */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-l-4 border-orange-600 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  Your Resume
                </h2>
              </div>
              <FileUpload
                label=""
                sourceType="resume"
                onUploadSuccess={handleResumeUpload}
                onTextSubmit={handleResumeText}
              />
            </div>

            {/* Job Description Upload Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-l-4 border-orange-600 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 14.15v4.25c0 .414-.168.81-.47 1.101a1.5 1.5 0 01-1.06.44H4.939a1.5 1.5 0 01-1.06-.44 1.495 1.495 0 01-.47-1.1v-4.25m16.5 0a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25m16.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916v-.243M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0zM4.5 19.5h15v2.25h-15V19.5z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  Job Description
                </h2>
              </div>
              <FileUpload
                label=""
                sourceType="job_description"
                onUploadSuccess={handleJDUpload}
                onTextSubmit={handleJDText}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex justify-center pt-8">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
              <span className="relative flex items-center">
                {loading ? (
                  <>
                    <svg className="mr-1.5 h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-mono">Analyze Skill Gap</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 mt-4">
            <div className="flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-12 h-12 border-2 border-orange-200 dark:border-orange-600 rounded-full animate-spin border-t-orange-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  🎯 Analyzing Your Skills...
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-500 animate-pulse">
                  ✨ Extracting skills • Calculating fit scores • Finding gaps • Almost there...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 mt-12">
            <RetryableError
              error={error}
              onRetry={handleRetry}
              retryCount={retryCount}
            />
          </div>
        )}

        {/* Results Section */}
        {report && !loading && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-6">
            <div className="space-y-8">
              {/* Resume Skills and JD Skills Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Resume Skills */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-orange-200 dark:ring-orange-600/30 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 font-mono">
                    Resume Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...report.gap_analysis.matched_skills.map((m) => m.skill),
                      ...report.gap_analysis.extra_skills,
                    ].map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* JD Skills */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-orange-200 dark:ring-orange-600/30 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 font-mono">
                    JD Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...report.gap_analysis.matched_skills.map((m) => m.skill),
                      ...report.gap_analysis.missing_skills,
                    ].map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fit Score Display */}
              <FitScoreDisplay fitScore={report.fit_score} />

              {/* Spacing divider */}
              <div className="my-8">
                <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent dark:via-orange-600"></div>
              </div>

              {/* Skill Lists - Three Equal Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <SkillList
                  title="Matched Skills"
                  skills={report.gap_analysis.matched_skills.map((m) => m.skill)}
                  matches={report.gap_analysis.matched_skills}
                  type="matched"
                />
                <SkillList
                  title="Missing Skills"
                  skills={report.gap_analysis.missing_skills}
                  type="missing"
                />
                <SkillList
                  title="Extra Skills"
                  skills={report.gap_analysis.extra_skills}
                  type="extra"
                />
              </div>

              {/* Learning Resources */}
              <LearningResourcesSection resources={report.learning_resources || []} />

              {/* Download Actions */}
              <DownloadActions
                onDownloadPDF={handleDownloadPDF}
                onDownloadCSV={handleDownloadCSV}
                downloadingPDF={downloadingPDF}
                downloadingCSV={downloadingCSV}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Copy all the component functions from results page
function FitScoreDisplay({ fitScore }: { fitScore: FitScoreBreakdown }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20";
    if (score >= 60) return "from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20";
    if (score >= 40) return "from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20";
    return "from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20";
  };

  return (
    <div className="rounded-lg bg-gradient-to-br from-white to-orange-50/30 p-6 shadow-sm ring-1 ring-orange-200 dark:from-gray-800 dark:to-orange-950/20 dark:ring-orange-600/30">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-6 font-mono">
        Fit Score Analysis
      </h2>

      <div className="flex flex-col lg:flex-row gap-20 items-start lg:items-center">
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="flex flex-col items-center">
            <div
              className={`inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${getScoreBgColor(
                fitScore.overall_score ?? 0
              )} ring-2 ring-orange-200 dark:ring-orange-600/50`}
            >
              <span
                className={`text-5xl font-bold ${getScoreColor(
                  fitScore.overall_score ?? 0
                )}`}
              >
                {fitScore.overall_score !== null && fitScore.overall_score !== undefined
                  ? fitScore.overall_score.toFixed(0)
                  : "N/A"}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-orange-700 dark:text-orange-300 text-center">
              Overall Match Score
            </p>
          </div>
        </div>

        <div className="hidden lg:block w-px h-full min-h-[250px] bg-gradient-to-b from-transparent via-orange-300 to-transparent dark:via-orange-700 mx-10"></div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
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
    </div>
  );
}

function ScoreCard({
  label,
  score,
  weight,
}: {
  label: string;
  score: number | null | undefined;
  weight?: number;
}) {
  if (score === null || score === undefined) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-orange-50 to-blue-50 p-2 ring-1 ring-orange-200/50 dark:from-orange-950/30 dark:to-blue-950/30 dark:ring-orange-600/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
              {label}
            </p>
            <p className="text-lg font-bold text-orange-400 dark:text-orange-500">
              N/A
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getCardColor = (score: number) => {
    if (score >= 80) return "from-green-50 to-emerald-50 ring-green-200/50 dark:from-green-950/30 dark:to-emerald-950/30 dark:ring-green-800/30";
    if (score >= 60) return "from-blue-50 to-cyan-50 ring-blue-200/50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:ring-blue-800/30";
    if (score >= 40) return "from-orange-50 to-pink-50 ring-orange-200/50 dark:from-orange-950/30 dark:to-pink-950/30 dark:ring-orange-600/30";
    return "from-orange-50 to-red-50 ring-orange-200/50 dark:from-orange-950/30 dark:to-red-950/30 dark:ring-orange-600/30";
  };

  return (
    <div className={`rounded-lg bg-gradient-to-br ${getCardColor(score)} p-2 ring-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
            {label}
          </p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {score.toFixed(0)}%
          </p>
        </div>
        {weight !== undefined && weight !== null && (
          <div className="text-right">
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Weight
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {(weight * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
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
    <div className="rounded-lg bg-gradient-to-br from-orange-50 to-indigo-50 p-2 ring-1 ring-orange-200/50 dark:from-orange-950/30 dark:to-indigo-950/30 dark:ring-orange-600/30">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium text-orange-700 dark:text-orange-300 ${label === "Matched Skills" || label === "Missing Skills" || label === "Total JD Skills" ? "font-mono" : ""}`}>
            {label}
          </p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {value}
            {total !== undefined && (
              <span className="text-sm text-orange-600 dark:text-orange-400">
                {" "}
                / {total}
              </span>
            )}
          </p>
        </div>
      </div>
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
  const getTypeColors = (type: "matched" | "missing" | "extra") => {
    switch (type) {
      case "matched":
        return {
          bg: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
          ring: "ring-green-200 dark:ring-green-800/30",
          title: "text-green-700 dark:text-green-300",
          border: "border-green-200 dark:border-green-800/30",
        };
      case "missing":
        return {
          bg: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
          ring: "ring-orange-200 dark:ring-orange-800/30",
          title: "text-orange-700 dark:text-orange-300",
          border: "border-orange-200 dark:border-orange-800/30",
        };
      case "extra":
        return {
          bg: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
          ring: "ring-blue-200 dark:ring-blue-800/30",
          title: "text-blue-700 dark:text-blue-300",
          border: "border-blue-200 dark:border-blue-800/30",
        };
    }
  };

  const colors = getTypeColors(type);

  return (
    <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-4 ring-1 ${colors.ring}`}>
      <h3 className={`text-lg font-semibold ${colors.title} mb-3 font-mono`}>
        {title}
      </h3>
      {skills.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No skills found</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {skills.map((skill, index) => (
            <SkillTag 
              key={index} 
              name={skill.name}
              category={skill.category}
              type={type}
              matchType={matches?.[index]?.match_type}
              confidence={matches?.[index]?.confidence}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadActions({
  onDownloadPDF,
  onDownloadCSV,
  downloadingPDF,
  downloadingCSV,
}: {
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
  downloadingPDF: boolean;
  downloadingCSV: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-white via-orange-50/50 to-indigo-50/30 p-4 shadow-lg ring-1 ring-orange-200/50 dark:from-gray-800 dark:via-orange-950/20 dark:to-indigo-950/20 dark:ring-orange-600/30 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent dark:from-orange-400 dark:to-orange-300">
              Export Report
            </h3>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
            className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:shadow-orange-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57068C] disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
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
                  className="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
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
                PDF
              </>
            )}
          </button>
          <button
            onClick={onDownloadCSV}
            disabled={downloadingCSV}
            className="group relative inline-flex items-center justify-center rounded-xl border-2 border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 hover:border-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57068C] disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed dark:border-orange-700 dark:bg-gray-800 dark:text-orange-300 dark:hover:bg-orange-950/30 dark:hover:border-orange-500 dark:disabled:bg-gray-900 dark:disabled:border-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
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
                  className="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
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
                CSV
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
      {resources.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            No courses found for now
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
