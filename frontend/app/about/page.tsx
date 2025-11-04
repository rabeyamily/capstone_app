export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
          About Skill Gap Analyzer
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Skill Gap Analyzer is an AI-powered tool designed to help job seekers
          and professionals identify the skills they need to develop to match
          their target job descriptions.
        </p>

        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
              Our platform uses advanced AI and natural language processing to
              extract skills from both your resume and job descriptions. It then
              compares them to identify gaps, calculate fit scores, and provide
              personalized recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Features
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-7 text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">✓</span>
                Support for PDF, DOCX, and plain text formats
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">✓</span>
                Comprehensive skill extraction including technical skills, soft
                skills, education, and certifications
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">✓</span>
                Detailed fit score calculation with category breakdowns
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">✓</span>
                Personalized recommendations to close skill gaps
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-blue-600">✓</span>
                Visual skill gap analysis with charts and breakdowns
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Technology Stack
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
              Built with Next.js, React, TailwindCSS, FastAPI, Python, and
              OpenAI&apos;s GPT models for intelligent skill extraction and
              analysis.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

