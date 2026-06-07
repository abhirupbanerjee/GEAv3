export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to the GEA Portal
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          The Government of Grenada Enterprise Architecture Portal — your single access point
          for government services, feedback, and support.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/services"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Browse Services
          </a>
          <a
            href="/about"
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  )
}
