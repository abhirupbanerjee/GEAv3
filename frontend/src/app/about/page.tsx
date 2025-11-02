import { aboutContent } from '@/config/content'

export default function About() {
  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-12 text-center">About</h1>

        {/* DTA Section */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {aboutContent.dta.title}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {aboutContent.dta.description}
          </p>
        </section>

        {/* GEA Section */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {aboutContent.gea.title}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {aboutContent.gea.description}
          </p>
        </section>

        {/* EA Governance Section */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {aboutContent.governance.title}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {aboutContent.governance.description}
          </p>
        </section>

        {/* Contact Section */}
        <section className="bg-blue-50 p-8 rounded-lg border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {aboutContent.contact.title}
          </h2>
          <p className="text-gray-700 mb-4">{aboutContent.contact.description}</p>
          <a 
            href={`mailto:${aboutContent.contact.email}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {aboutContent.contact.email}
          </a>
        </section>
      </div>
    </div>
  )
}
