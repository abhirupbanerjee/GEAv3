'use client'

import { aboutContent } from '../../config/content'

// Leadership team member interface
interface LeadershipMember {
  id: string
  role: string
  name: string
  email: string
  phone: string
  photo: string
}

// Placeholder leadership team - will be populated later
const leadershipTeam: LeadershipMember[] = [
  {
    id: 'ceo',
    role: 'Chief Executive Officer',
    name: 'To be announced',
    email: 'ceo@dta.gov.gd',
    phone: '+1 (473) XXX-XXXX',
    photo: '/images/placeholder-ceo.jpg'
  },
  {
    id: 'coo',
    role: 'Chief Operating Officer',
    name: 'To be announced',
    email: 'coo@dta.gov.gd',
    phone: '+1 (473) XXX-XXXX',
    photo: '/images/placeholder-coo.jpg'
  },
  {
    id: 'cdo',
    role: 'Chief Digital Officer',
    name: 'To be announced',
    email: 'cdo@dta.gov.gd',
    phone: '+1 (473) XXX-XXXX',
    photo: '/images/placeholder-cdo.jpg'
  }
]

export default function About() {
  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Learn about the Digital Transformation Agency and how we support Grenada's digital future.
          </p>
        </div>

        {/* DTA Section */}
        <section className="mb-12 bg-white p-10 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <div className="text-4xl mr-3">🏛️</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {aboutContent.dta.title}
            </h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            {aboutContent.dta.description}
          </p>
        </section>

        {/* GEA Section */}
        <section className="mb-12 bg-white p-10 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <div className="text-4xl mr-3">🏗️</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {aboutContent.gea.title}
            </h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            {aboutContent.gea.description}
          </p>
        </section>

        {/* EA Governance Section */}
        <section className="mb-12 bg-white p-10 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <div className="text-4xl mr-3">⚖️</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {aboutContent.governance.title}
            </h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            {aboutContent.governance.description}
          </p>
        </section>

        {/* Leadership Team Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Leadership Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {leadershipTeam.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                {/* Photo Placeholder */}
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">👤</div>
                    <p className="text-gray-600 text-sm">Photo Coming Soon</p>
                  </div>
                </div>
                
                {/* Member Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-blue-600 font-medium mb-4">
                    {member.role}
                  </p>
                  
                  {/* Contact Details */}
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${member.email}`} className="text-sm hover:text-blue-600 transition-colors">
                        {member.email}
                      </a>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-sm">{member.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Information Section */}
        <section className="bg-white p-10 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-3xl font-bold text-gray-900">
              {aboutContent.contact.title}
            </h2>
          </div>
          
          <p className="text-gray-700 mb-4 text-lg">
            {aboutContent.contact.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <a 
              href={`mailto:${aboutContent.contact.email}`}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Us
            </a>
            <a 
              href="/services"
              className="inline-flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              View Services
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
