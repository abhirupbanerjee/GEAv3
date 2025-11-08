'use client'

import { config } from '@/config/env'

// EA Service types
interface EAService {
  id: string
  title: string
  description: string
  icon: string
  targetAudience: string
  estimatedTime: string
}

const eaServices: EAService[] = [
  {
    id: 'digital-roadmap',
    title: 'Public Sector Digital Roadmap Support',
    description: 'Guiding government agencies in adopting new technologies and digital strategies to improve public service delivery and operational efficiency.',
    icon: '🗺️',
    targetAudience: 'Government entities, MDAs',
    estimatedTime: '3 months'
  },
  {
    id: 'ea-framework',
    title: 'Grenada EA Framework Management',
    description: 'Developing and maintaining enterprise architecture frameworks tailored to GoG needs and evolving digital agenda of the government.',
    icon: '🏗️',
    targetAudience: 'Project teams',
    estimatedTime: '1 month'
  },
  {
    id: 'maturity-assessment',
    title: 'Grenada EA Maturity Assessment',
    description: 'Evaluating the current state of enterprise architecture practices within MDAs and recommending improvements to enhance efficiency and service delivery.',
    icon: '📊',
    targetAudience: 'MoF or MDA',
    estimatedTime: '2 weeks'
  },
  {
    id: 'repository-access',
    title: 'Grenada EA Repository Access',
    description: 'Provisioning of access to the shared EA repository for public officers and associated partners.',
    icon: '🗄️',
    targetAudience: 'MDA / Project Team / DTA',
    estimatedTime: '2 days'
  },
  {
    id: 'compliance-review',
    title: 'Grenada EA Compliance Review',
    description: 'Evaluating the current state / future state design for digital initiatives undertaken by MDAs against the Grenada EA principles and architecture domain development guidelines.',
    icon: '✅',
    targetAudience: 'MDA / Project Team',
    estimatedTime: '1 month'
  },
  {
    id: 'portfolio-review',
    title: 'IT Portfolio Review',
    description: 'Assessment of current state baselines IT inventory against the list of services and digital roadmap for the government / MDA basis of the EA principles and guidelines.',
    icon: '💼',
    targetAudience: 'MDA',
    estimatedTime: '2 months'
  },
  {
    id: 'training',
    title: 'Grenada EA Training and Capacity Development',
    description: 'Undertaking periodic EA training and capacity training for public officers and local technology partners of GoG.',
    icon: '📚',
    targetAudience: 'MDA (for project teams)',
    estimatedTime: '1 week'
  }
]

export default function Services() {
  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">EA Services</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Enterprise Architecture services offered by the Digital Transformation Agency (DTA) 
            to support government entities in their digital transformation journey.
          </p>
        </div>

        {/* Introduction */}
        <section className="bg-white p-8 rounded-lg shadow-md mb-12">
          <div className="flex items-start">
            <div className="text-4xl mr-4">🏛️</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                About EA Services
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The DTA Enterprise Architecture Services team provides comprehensive support to Ministries, 
                Departments, and Agencies (MDAs) in aligning digital initiatives with national priorities 
                and the Grenada Enterprise Architecture (GEA) framework.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Our services range from strategic roadmap development to technical compliance reviews, 
                ensuring that all digital transformation efforts are coordinated, efficient, and aligned 
                with government standards.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Available Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eaServices.map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6">
                <div className="text-5xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {service.description}
                </p>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-medium">Target:</span>
                    <span className="ml-1">{service.targetAudience}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-1">{service.estimatedTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to Request Services */}
        <section className="bg-white p-8 rounded-lg shadow-md mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How to Request EA Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Review Services</h3>
              <p className="text-gray-600 text-sm">
                Review the available EA services and identify which service matches your needs.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Submit Request</h3>
              <p className="text-gray-600 text-sm">
                Submit a service request ticket through our helpdesk with details about your requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get Support</h3>
              <p className="text-gray-600 text-sm">
                Our EA team will review your request and initiate the service delivery process.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <a 
              href={config.HELPDESK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Submit Service Request
            </a>
            <a 
              href={`mailto:${config.CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg transition-colors shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact via Email
            </a>
          </div>
        </section>

        {/* Important Notes */}
        <section className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• All service requests require approval from senior leadership</li>
                <li>• Service delivery timelines may vary based on complexity and resource availability</li>
                <li>• Some services may require supporting documentation and baseline assessments</li>
                <li>• Services are provided in accordance with the Grenada Enterprise Architecture policy</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
