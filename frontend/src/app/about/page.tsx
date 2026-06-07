/**
 * @pageContext
 * @title About DTA and GEA
 * @purpose Learn about the Digital Transformation Agency, Grenada Enterprise Architecture framework, EA governance, and leadership team
 * @audience public
 * @features
 *   - DTA overview and mission statement
 *   - GEA framework description and purpose
 *   - EA governance structure explanation
 *   - Leadership team profiles with contact information
 *   - Contact information and action buttons
 * @tips
 *   - DTA drives digital transformation across Government of Grenada
 *   - GEA provides unified framework for technology alignment
 *   - Leadership profiles show key decision-makers (placeholders currently)
 *   - Contact via email or view services for more information
 * @relatedPages
 *   - /services: Browse EA services offered by DTA
 *   - /: Return to homepage
 *   - /feedback: Submit feedback for government services
 * @permissions
 *   - public: Full access to all about page content
 */

'use client'

import { useState, useEffect } from 'react'
import { aboutContent } from '../../config/content'

// Leadership contact interface (from database)
interface LeadershipContact {
  contact_id: number
  name: string
  title: string
  email: string | null
  image_path: string | null
  sort_order: number
  is_active: boolean
}

export default function About() {
  const [contacts, setContacts] = useState<LeadershipContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)

  // Fetch leadership contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/admin/contacts?public=true')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.contacts) {
            setContacts(data.contacts)
          }
        }
      } catch (error) {
        console.error('Error fetching leadership contacts:', error)
      } finally {
        setLoadingContacts(false)
      }
    }
    fetchContacts()
  }, [])

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

          {loadingContacts ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : contacts.length > 0 ? (
            /* Horizontal scrolling container for multiple contacts */
            <div className="relative">
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {contacts.map((contact) => (
                  <div
                    key={contact.contact_id}
                    className="flex-shrink-0 w-72 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow snap-start"
                  >
                    {/* Photo */}
                    {contact.image_path ? (
                      <div className="h-64 overflow-hidden">
                        <img
                          src={contact.image_path}
                          alt={contact.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-blue-100 to-blue-200 h-64 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-24 h-24 rounded-full bg-blue-200 flex items-center justify-center mx-auto">
                            <span className="text-4xl font-bold text-blue-600">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {contact.name}
                      </h3>
                      <p className="text-blue-600 font-medium mb-4">
                        {contact.title}
                      </p>

                      {/* Email */}
                      {contact.email && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center text-gray-600">
                            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${contact.email}`} className="text-sm hover:text-blue-600 transition-colors">
                              {contact.email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scroll indicators for more contacts */}
              {contacts.length > 3 && (
                <div className="text-center text-sm text-gray-500 mt-2">
                  Scroll to see more leadership members →
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-600">Leadership team information coming soon.</p>
            </div>
          )}
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
