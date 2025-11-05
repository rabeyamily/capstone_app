"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import apiClient from "@/services/api";
import {
  SkillGapReport,
  SkillMatch,
  Skill,
  FitScoreBreakdown,
  SkillExtractionResult,
} from "@/utils/types";
import {
  SkillTag,
  CategoryBreakdownChart,
  ScoreDistributionChart,
  SkillMatchPieChart,
  MatchTypeDistributionChart,
} from "@/components/Charts";
import {
  RetryableError,
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
  const router = useRouter();
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<SkillExtractionResult | null>(null);
  const [jdSkills, setJdSkills] = useState<SkillExtractionResult | null>(null);

  // Extract IDs from searchParams once
  const resumeId = searchParams?.get("resume") || null;
  const jdId = searchParams?.get("jd") || null;

  const fetchReport = useCallback(async () => {
    if (!searchParams) {
      setError("Missing search parameters");
      setLoading(false);
      return;
    }

    const currentResumeId = searchParams.get("resume");
    const currentJdId = searchParams.get("jd");

    // Allow either to be missing, but we need at least one
    if (!currentResumeId && !currentJdId) {
      setError("Missing resume or job description ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
        // Try to get stored text from sessionStorage with multiple fallback keys
        const storedResumeText = 
          (currentResumeId && sessionStorage.getItem(`resume_text_${currentResumeId}`)) ||
          sessionStorage.getItem(`resume_text`) ||
          sessionStorage.getItem(`resume_text_${currentResumeId || ''}`) ||
          null;
        
        const storedJdText = 
          (currentJdId && sessionStorage.getItem(`jd_text_${currentJdId}`)) ||
          sessionStorage.getItem(`jd_text`) ||
          sessionStorage.getItem(`job_description_text_${currentJdId || ''}`) ||
          null;

        // Also try to get text from generic keys
        const genericResumeText = sessionStorage.getItem('current_resume_text');
        const genericJdText = sessionStorage.getItem('current_jd_text');

        // Prepare extraction request - prefer stored text over file IDs
        let extractRequest: any = {};
        
        // Use stored text if available, otherwise use file IDs
        if (storedResumeText || genericResumeText) {
          extractRequest.resume_text = storedResumeText || genericResumeText;
          console.log("[Frontend] Using stored resume text:", (storedResumeText || genericResumeText)?.substring(0, 50) + "...");
        } else if (currentResumeId) {
          extractRequest.resume_id = currentResumeId;
          console.log("[Frontend] Using resume ID:", currentResumeId);
        }
        
        if (storedJdText || genericJdText) {
          extractRequest.job_description_text = storedJdText || genericJdText;
          console.log("[Frontend] Using stored JD text:", (storedJdText || genericJdText)?.substring(0, 50) + "...");
        } else if (currentJdId) {
          extractRequest.jd_id = currentJdId;
          console.log("[Frontend] Using JD ID:", currentJdId);
        }

        // Backend requires at least resume_text or resume_id
        if (!extractRequest.resume_text && !extractRequest.resume_id) {
          console.error("[Frontend] No resume input found. Debug info:", {
            currentResumeId,
            currentJdId,
            storedResumeText: !!storedResumeText,
            genericResumeText: !!genericResumeText,
            availableKeys: Object.keys(sessionStorage).filter(k => 
              k.toLowerCase().includes('resume') || 
              k.toLowerCase().includes('jd') || 
              k.toLowerCase().includes('job')
            ),
            allSessionKeys: Object.keys(sessionStorage)
          });
          throw new Error("Resume data is required. Please upload or paste your resume and try again.");
        }

        // JD is optional but if we have an ID, we should try to use it
        if (!extractRequest.job_description_text && !extractRequest.jd_id && currentJdId) {
          console.warn("[Frontend] JD ID provided but no text found. Will try to use ID directly.");
          extractRequest.jd_id = currentJdId;
        }

        console.log("[Frontend] Extract request prepared:", {
          hasResumeText: !!extractRequest.resume_text,
          hasResumeId: !!extractRequest.resume_id,
          hasJdText: !!extractRequest.job_description_text,
          hasJdId: !!extractRequest.jd_id,
          resumeTextLength: extractRequest.resume_text?.length || 0,
          jdTextLength: extractRequest.job_description_text?.length || 0,
        });

      // Add timeout to extraction request (180 seconds - LLM calls can be slow, but parallel extraction should help)
      const extractTimeout = 180000; // Increased to 3 minutes
      const extractController = new AbortController();
      let extractTimeoutId: NodeJS.Timeout | null = null;
      
      // Set timeout only if not already aborted
      extractTimeoutId = setTimeout(() => {
        extractController.abort();
      }, extractTimeout);

      // First extract skills from both
      let extractResponse;
      try {
        console.log("[Frontend] Starting extraction...");
        extractResponse = await apiClient.post(
          "/api/extract/extract",
          extractRequest,
          {
            signal: extractController.signal,
            timeout: extractTimeout,
          }
        );
        clearTimeout(extractTimeoutId);
        console.log("[Frontend] Extraction completed:", {
          resumeSkills: extractResponse.data.resume_skills?.skills?.length || 0,
          jdSkills: extractResponse.data.jd_skills?.skills?.length || 0,
        });
      } catch (extractErr: any) {
        if (extractTimeoutId) {
          clearTimeout(extractTimeoutId);
        }
        
        console.error("[Frontend] Extraction error:", extractErr);
        console.error("[Frontend] Error response:", extractErr.response?.data);
        console.error("[Frontend] Extract request:", extractRequest);
        
        // Handle cancellation/abort (ignore if it's just navigation, treat timeout as error)
        if (extractErr.code === 'ERR_CANCELED' || extractErr.message === 'canceled' || extractErr.name === 'CanceledError') {
          // Check if it was aborted due to timeout
          if (extractController.signal.aborted) {
            throw new Error("Extraction timed out. Please try again with shorter text or check your API key.");
          }
          // Otherwise, it was likely navigation - just re-throw to show error
          throw new Error("Extraction was cancelled. Please try again.");
        }
        
        // Handle timeout
        if (extractErr.code === 'ECONNABORTED' || extractErr.message?.includes('timeout')) {
          throw new Error("Extraction is taking too long. Please try again with shorter text or check your API key.");
        }
        
        // If extraction fails with file not found, try using stored text or request text directly
        if (extractErr.response?.data?.detail?.includes("not found") || 
            extractErr.response?.data?.detail?.includes("expired")) {
          
          // Try to get text from sessionStorage
          const fallbackResumeText = sessionStorage.getItem(`resume_text_${currentResumeId}`) || 
                                     sessionStorage.getItem(`resume_text`);
          const fallbackJdText = sessionStorage.getItem(`jd_text_${currentJdId}`) || 
                                 sessionStorage.getItem(`jd_text`);
          
          if (fallbackResumeText && fallbackJdText) {
            // Retry with stored text
            const retryController = new AbortController();
            let retryTimeoutId: NodeJS.Timeout | null = null;
            retryTimeoutId = setTimeout(() => retryController.abort(), extractTimeout);
            
            try {
              extractResponse = await apiClient.post(
                "/api/extract/extract",
                {
                  resume_text: fallbackResumeText,
                  job_description_text: fallbackJdText,
                },
                {
                  signal: retryController.signal,
                  timeout: extractTimeout,
                }
              );
              if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
              }
            } catch (retryErr: any) {
              if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
              }
              if (retryErr.code === 'ERR_CANCELED' || retryErr.message === 'canceled' || retryErr.name === 'CanceledError') {
                if (retryController.signal.aborted) {
                  throw new Error("Extraction timed out. Please try again with shorter text or check your API key.");
                }
                throw new Error("Extraction was cancelled. Please try again.");
              }
              if (retryErr.code === 'ECONNABORTED' || retryErr.message?.includes('timeout')) {
                throw new Error("Extraction is taking too long. Please try again with shorter text or check your API key.");
              }
              throw retryErr;
            }
          } else {
            throw extractErr; // Re-throw if no fallback available
          }
        } else {
          // Log the actual error for debugging
          console.error("Extraction error:", extractErr.response?.data || extractErr.message);
          throw extractErr; // Re-throw other errors
        }
      }

      // Add timeout to analysis request (30 seconds)
      const analyzeTimeout = 30000;
      const analyzeController = new AbortController();
      let analyzeTimeoutId: NodeJS.Timeout | null = null;
      analyzeTimeoutId = setTimeout(() => analyzeController.abort(), analyzeTimeout);

      // Then analyze the gap
      let analyzeResponse;
      try {
        console.log("[Frontend] Starting gap analysis...");
        analyzeResponse = await apiClient.post("/api/analyze/analyze-gap", {
          resume_skills: extractResponse.data.resume_skills,
          jd_skills: extractResponse.data.jd_skills,
        }, {
          signal: analyzeController.signal,
          timeout: analyzeTimeout,
        });
        clearTimeout(analyzeTimeoutId);
        console.log("[Frontend] Analysis completed:", {
          fitScore: analyzeResponse.data.report?.fit_score?.overall_score,
        });
      } catch (analyzeErr: any) {
        if (analyzeTimeoutId) {
          clearTimeout(analyzeTimeoutId);
        }
        console.error("[Frontend] Analysis error:", analyzeErr);
        
        // Handle cancellation/abort
        if (analyzeErr.code === 'ERR_CANCELED' || analyzeErr.message === 'canceled' || analyzeErr.name === 'CanceledError') {
          if (analyzeController.signal.aborted) {
            throw new Error("Analysis timed out. Please try again.");
          }
          throw new Error("Analysis was cancelled. Please try again.");
        }
        
        if (analyzeErr.code === 'ECONNABORTED' || analyzeErr.message?.includes('timeout')) {
          throw new Error("Analysis is taking too long. Please try again.");
        }
        console.error("Analysis error:", analyzeErr.response?.data || analyzeErr.message);
        throw analyzeErr;
      }

      const reportData = analyzeResponse.data.report;
      setReport(reportData);
      
      // Store extracted skills
      if (extractResponse.data.resume_skills) {
        console.log("[Frontend] Setting resume skills:", extractResponse.data.resume_skills.skills?.length || 0);
        setResumeSkills(extractResponse.data.resume_skills);
      }
      if (extractResponse.data.jd_skills) {
        console.log("[Frontend] Setting JD skills:", extractResponse.data.jd_skills.skills?.length || 0);
        setJdSkills(extractResponse.data.jd_skills);
      }
      
      // Store report in sessionStorage for back navigation
      if (reportData) {
        try {
          sessionStorage.setItem('last_report', JSON.stringify(reportData));
          sessionStorage.setItem('last_report_resume_id', currentResumeId || '');
          sessionStorage.setItem('last_report_jd_id', currentJdId || '');
          
          // Also update URL to ensure it's correct
          if (typeof window !== 'undefined' && currentResumeId && currentJdId) {
            const currentUrl = window.location.pathname + window.location.search;
            const expectedUrl = `/analyze/results?resume=${currentResumeId}&jd=${currentJdId}`;
            if (currentUrl !== expectedUrl) {
              router.replace(expectedUrl);
            }
          }
        } catch (e) {
          console.warn('Failed to store report in sessionStorage:', e);
        }
      }
      
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to generate analysis.";
      console.error("Full error:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchParams, router]);

  useEffect(() => {
    // Try to restore report from sessionStorage first
    const currentResumeId = searchParams?.get("resume") || null;
    const currentJdId = searchParams?.get("jd") || null;
    
    const storedResumeId = sessionStorage.getItem('last_report_resume_id');
    const storedJdId = sessionStorage.getItem('last_report_jd_id');
    
    // If we don't have query params but have stored IDs, restore URL and report
    if (!currentResumeId && !currentJdId && storedResumeId && storedJdId) {
      // Restore the URL with stored IDs using router
      router.replace(`/analyze/results?resume=${storedResumeId}&jd=${storedJdId}`);
      
      // Immediately restore the report from sessionStorage
      try {
        const storedReport = sessionStorage.getItem('last_report');
        if (storedReport) {
          const parsedReport = JSON.parse(storedReport);
          setReport(parsedReport);
          setLoading(false);
          return; // Don't fetch, we already have the report
        }
      } catch (e) {
        console.warn('Failed to restore report from sessionStorage:', e);
      }
    }
    
    // If we have matching IDs, try to restore the report immediately
    if (currentResumeId && currentJdId && currentResumeId === storedResumeId && currentJdId === storedJdId) {
      try {
        const storedReport = sessionStorage.getItem('last_report');
        if (storedReport) {
          const parsedReport = JSON.parse(storedReport);
          setReport(parsedReport);
          setLoading(false);
          // Optionally fetch fresh data in background, but show cached version immediately
          return; // Show cached version, don't fetch again unless user requests
        }
      } catch (e) {
        console.warn('Failed to restore report from sessionStorage:', e);
      }
    }
    
    // If we have query params but no stored report, fetch fresh
    if (currentResumeId || currentJdId) {
      fetchReport();
    } else {
      // No query params and no stored data - show error
      setError("No analysis data found. Please run a new analysis.");
      setLoading(false);
    }
  }, [resumeId, jdId, fetchReport, router, searchParams]);
  
  const handleGoBack = () => {
    router.push('/');
  };

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
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            {/* Animated Loading Icon */}
            <div className="relative inline-block mb-8">
              <div className="w-20 h-20 border-4 border-orange-200 dark:border-orange-600 rounded-full animate-spin border-t-orange-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-orange-600 dark:text-orange-400 animate-pulse"
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
            
            {/* Cute Loading Text */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🎯 Analyzing Your Skills...
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              Our AI is carefully examining your resume and job description
            </p>
            <p className="text-base text-gray-500 dark:text-gray-500 animate-pulse">
              ✨ Extracting skills • Calculating fit scores • Finding gaps • Almost there...
            </p>
            
            {/* Progress Steps */}
            <div className="mt-8 space-y-3 max-w-md mx-auto">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Reading your documents...</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Identifying skills...</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-5 h-5 mr-2">
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span>Calculating match scores...</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-5 h-5 mr-2">
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span>Preparing your personalized report...</span>
              </div>
            </div>
          </div>
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
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={handleGoBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-orange-400 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Analysis
        </button>
      </div>
      
      <div className="space-y-8">
        {/* Download Actions */}
        <DownloadActions
          onDownloadPDF={handleDownloadPDF}
          onDownloadCSV={handleDownloadCSV}
          downloadingPDF={downloadingPDF}
          downloadingCSV={downloadingCSV}
        />

        {/* Resume Skills and JD Skills - Two Columns */}
        {(() => {
          if (!report) return null;
          
          // Get skills from extracted data if available, otherwise reconstruct from report
          let resumeSkillsList: Skill[] = [];
          let jdSkillsList: Skill[] = [];
          
          // Resume skills: prefer extracted, fallback to report reconstruction
          if (resumeSkills?.skills && resumeSkills.skills.length > 0) {
            resumeSkillsList = resumeSkills.skills;
          } else if (report.gap_analysis) {
            // Reconstruct from gap analysis: matched + extra = all resume skills
            resumeSkillsList = [
              ...report.gap_analysis.matched_skills.map(m => m.skill),
              ...report.gap_analysis.extra_skills
            ];
          }
          
          // JD skills: prefer extracted, fallback to report reconstruction
          if (jdSkills?.skills && jdSkills.skills.length > 0) {
            jdSkillsList = jdSkills.skills;
          } else if (report.gap_analysis) {
            // Reconstruct from gap analysis: matched + missing = all JD skills
            jdSkillsList = [
              ...report.gap_analysis.matched_skills.map(m => m.skill),
              ...report.gap_analysis.missing_skills
            ];
          }
          
          // Always show sections if we have a report (even if empty, to show "No skills found")
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <ResumeSkillsSection skills={resumeSkillsList} />
              <JDSkillsSection skills={jdSkillsList} />
            </div>
          );
        })()}

        {/* Fit Score Display */}
        <FitScoreDisplay fitScore={report.fit_score} />

        {/* Spacing divider with more space */}
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

        {/* Category Breakdown Chart */}
        {Object.keys(report.gap_analysis.category_breakdown).length > 0 && (
          <CategoryBreakdownChart
            breakdown={report.gap_analysis.category_breakdown}
          />
        )}

        {/* Learning Resources */}
        <LearningResourcesSection resources={report.learning_resources || []} />
      </div>
    </div>
  );
}

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
      <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent mb-6">
        Fit Score Analysis
      </h2>

      <div className="flex flex-col lg:flex-row gap-20 items-start lg:items-center">
        {/* Circular Score on the Left */}
        <div className="flex-shrink-0">
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
            <p className="mt-4 text-sm font-medium text-orange-700 dark:text-orange-300">
              Overall Match Score
            </p>
          </div>
        </div>

        {/* Vertical divider/gap column */}
        <div className="hidden lg:block w-px h-full min-h-[250px] bg-gradient-to-b from-transparent via-orange-300 to-transparent dark:via-orange-700 mx-10"></div>

        {/* Cards stacked vertically on the Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
          {/* Score Cards */}
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
          
          {/* Stat Cards */}
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
  // Handle null/undefined scores
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

  // Determine color based on score
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
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
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

  if (skills.length === 0) {
    return (
      <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-4 shadow-sm ring-1 ${colors.ring} dark:bg-gray-800 dark:ring-gray-700`}>
        <h3 className={`text-base font-semibold ${colors.title} mb-2 dark:text-gray-300`}>
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">No skills found</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-4 shadow-sm ring-1 ${colors.ring} dark:bg-gray-800 dark:ring-gray-700`}>
      <h3 className={`text-base font-semibold ${colors.title} mb-3 dark:text-gray-300`}>
        {title} <span className="text-xs font-normal text-gray-600 dark:text-gray-400">({skills.length})</span>
      </h3>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
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
    <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-white via-orange-50/50 to-indigo-50/30 p-6 shadow-lg ring-1 ring-orange-200/50 dark:from-gray-800 dark:via-orange-950/20 dark:to-indigo-950/20 dark:ring-orange-600/30 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-600 rounded-lg flex items-center justify-center">
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
            <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-orange-300">
              Download Report
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-10">
            Export your skill gap analysis
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
            className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:shadow-orange-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
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
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onDownloadCSV}
            disabled={downloadingCSV}
            className="group relative inline-flex items-center justify-center rounded-xl border-2 border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 hover:border-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed dark:border-orange-700 dark:bg-gray-800 dark:text-orange-300 dark:hover:bg-orange-950/30 dark:hover:border-orange-500 dark:disabled:bg-gray-900 dark:disabled:border-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
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
                Download CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResumeSkillsSection({ skills }: { skills: Skill[] }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-white to-green-50/30 p-6 shadow-sm ring-1 ring-green-200 dark:from-gray-800 dark:to-green-950/20 dark:ring-green-600/30">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-xl font-bold text-green-700 dark:text-green-300">
          Resume Skills
        </h2>
        <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
          ({skills.length})
        </span>
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No skills found</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
          {skills.map((skill, index) => (
            <div
              key={`resume-skill-${skill.name}-${index}`}
              className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
            >
              <svg
                className="w-4 h-4 mr-1.5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{skill.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JDSkillsSection({ skills }: { skills: Skill[] }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm ring-1 ring-blue-200 dark:from-gray-800 dark:to-blue-950/20 dark:ring-blue-600/30">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-6 h-6 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
          />
        </svg>
        <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
          JD Skills
        </h2>
        <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
          ({skills.length})
        </span>
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No skills found</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
          {skills.map((skill, index) => (
            <div
              key={`jd-skill-${skill.name}-${index}`}
              className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <svg
                className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
              <span>{skill.name}</span>
            </div>
          ))}
        </div>
      )}
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

