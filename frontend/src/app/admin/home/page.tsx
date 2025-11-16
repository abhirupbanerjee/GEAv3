import QuickStatsCards from '@/components/admin/QuickStatsCards'
import { validateSession } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export default async function AdminHomePage() {
  const isAuthenticated = await validateSession()
  
  if (!isAuthenticated) {
    redirect('/admin')
  }

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
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <h4 className="font-semibold text-blue-900 mb-2">Quick Access to Key Administrative Functions:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Feedback Analytics:</strong> View comprehensive feedback analytics and service performance metrics</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Manage Data:</strong> Manage entities, services, and QR code deployments</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>Submit Tickets:</strong> Submit support tickets on behalf of citizens</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>AI Inventory:</strong> Configure and monitor AI bot integrations</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 italic">
            All administrative actions are logged for security and compliance purposes.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
        <QuickStatsCards />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
              <div>
                <p className="font-medium text-gray-900">System Status: Operational</p>
                <p className="text-xs text-gray-500">All services running normally</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
              <div>
                <p className="font-medium text-gray-900">Admin Portal Active</p>
                <p className="text-xs text-gray-500">Session expires in 2 hours of inactivity</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>For technical support:</strong><br />
              Contact the IT Department or submit a ticket through the helpdesk portal.
            </p>
            <p>
              <strong>Security Notice:</strong><br />
              Report any suspicious activity immediately to the security team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}