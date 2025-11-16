import QuickStatsCards from '@/components/admin/QuickStatsCards'

export default function AdminHomePage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Government of Grenada EA Portal
        </h1>
        <h2 className="text-xl text-gray-600">Admin Dashboard</h2>
      </div>

      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Welcome to the Administration Interface</h3>
        <div className="prose prose-blue max-w-none text-gray-700 space-y-3">
          <p>
            Welcome to the Enterprise Architecture Portal administration interface. This dashboard provides 
            centralized access to system analytics, master data management, citizen feedback ticketing, and 
            AI assistant configuration.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-2">Quick Access to Key Administrative Functions:</h4>
            <ul className="space-y-2 text-blue-900">
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                <div>
                  <strong>Feedback Analytics:</strong> View comprehensive feedback analytics and service performance metrics
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🗄️</span>
                <div>
                  <strong>Manage Data:</strong> Manage entities, services, and QR code deployments
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🎫</span>
                <div>
                  <strong>Submit Tickets:</strong> Submit support tickets on behalf of citizens
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🤖</span>
                <div>
                  <strong>AI Inventory:</strong> Configure and monitor AI bot integrations
                </div>
              </li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-500 italic mt-4">
            All administrative actions are logged for security and compliance purposes.
          </p>
        </div>
      </div>

      {/* System Overview */}
      <QuickStatsCards />
    </div>
  )
}