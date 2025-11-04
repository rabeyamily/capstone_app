import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
            AI-Powered Resume Skill Gap Analyzer
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Discover the skills you need to land your dream job. Upload your
            resume and job description to get instant insights into skill gaps,
            fit scores, and personalized recommendations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/analyze"
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="text-base font-semibold leading-6 text-gray-900 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mx-auto mt-24 max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              How It Works
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Simple, fast, and insightful skill gap analysis
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <svg
                  className="h-6 w-6 text-white"
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
              <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                Upload Your Resume
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                Upload your resume in PDF, DOCX, or paste plain text. Our AI
                extracts all your skills automatically.
              </p>
            </div>

            <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <svg
                  className="h-6 w-6 text-white"
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
              <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                Add Job Description
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                Paste the job description you&apos;re targeting. We&apos;ll
                identify required skills and qualifications.
              </p>
            </div>

            <div className="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                Get Insights
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                Receive a comprehensive report with fit scores, skill gaps, and
                personalized recommendations to improve your profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
