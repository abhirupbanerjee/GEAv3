'use client'

import { config } from '@/config/env'

export default function Feedback() {
  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Feedback</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Your feedback helps us improve our digital services for all citizens of Grenada.
          </p>
        </div>

        {/* Coming Soon Section */}
        <section className="bg-white p-10 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-6">🚧</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h2>
          <p className="text-gray-700 leading-relaxed text-lg mb-6">
            We're building a comprehensive feedback system to hear your thoughts and suggestions 
            about our digital transformation initiatives.
          </p>
          <p className="text-gray-600 mb-8">
            This page will include:
          </p>
          <ul className="text-left max-w-2xl mx-auto space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Feedback forms for specific services and initiatives</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Service quality ratings and reviews</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Suggestions for new digital services</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Track the status of your feedback submissions</span>
            </li>
          </ul>

          {/* Temporary Contact */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-700 mb-4">
              <strong>In the meantime,</strong> you can reach us through the DTA email id.
            </p>
            <a 
              href={`mailto:${config.CONTACT_EMAIL}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Us
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
