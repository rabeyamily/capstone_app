import Logo from "@/components/Logo";

export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-3 py-16 lg:px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header Section with Gradient */}
        <div className="text-center mb-16">
          <h1 className="mb-6 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent">About</span> 
            <Logo className="text-4xl sm:text-5xl" />
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-orange-600 to-orange-500 mx-auto rounded-full"></div>
        </div>

        {/* Main Description Card */}
        <div className="bg-gradient-to-br from-white to-orange-50 dark:from-gray-900 dark:to-orange-950/20 rounded-2xl shadow-xl p-8 mb-12 border border-orange-100 dark:border-orange-900/30">
          <p className="text-lg leading-8 text-gray-700 dark:text-gray-300 mb-6">
            SkilledU is an AI-powered tool that helps students and professionals identify how their current skills align with industry job requirements. Using advanced natural language processing, it analyzes both your resume and job descriptions to extract key competencies — from technical and soft skills to certifications and education.
          </p>
          <p className="text-lg leading-8 text-gray-700 dark:text-gray-300 mb-6">
            The system then compares both profiles to calculate a Fit Score, highlight missing or extra skills, and offer personalized upskilling recommendations. Interactive charts make it easy to visualize where you stand and what to improve.
          </p>
          <p className="text-lg leading-8 text-gray-700 dark:text-gray-300">
            Built with Next.js, React, FastAPI, Python, and OpenAI&apos;s GPT models, SkilledU is designed for accuracy, privacy, and simplicity — no login required.
          </p>
        </div>

        {/* Call to Action Section */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl shadow-2xl p-10 text-center text-white mb-12 transform hover:scale-[1.02] transition-transform duration-300">
          <p className="text-2xl font-semibold leading-relaxed">
            Bridge the gap between education and industry — one skill at a time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Analysis</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Advanced NLP extracts skills from resumes and job descriptions with precision
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fit Score Calculation</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Get a comprehensive score showing how well your skills match job requirements
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Visual Analytics</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Interactive charts and breakdowns help you understand your skill profile
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personalized Recommendations</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Receive targeted suggestions to close skill gaps and improve your fit
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack Section */}
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-orange-950/20 dark:to-blue-950/20 rounded-xl p-8 border border-orange-100 dark:border-orange-900/30">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1 h-8 bg-gradient-to-b from-orange-600 to-orange-500 rounded-full mr-3"></span>
            Technology Stack
          </h2>
          <p className="text-base leading-7 text-gray-700 dark:text-gray-300">
            Built with <span className="font-semibold text-slate-800 dark:text-orange-400">Next.js</span>, <span className="font-semibold text-slate-800 dark:text-orange-400">React</span>, <span className="font-semibold text-slate-800 dark:text-orange-400">FastAPI</span>, <span className="font-semibold text-slate-800 dark:text-orange-400">Python</span>, and <span className="font-semibold text-slate-800 dark:text-orange-400">OpenAI&apos;s GPT models</span> for intelligent skill extraction and analysis.
          </p>
        </div>
      </div>
    </div>
  );
}


