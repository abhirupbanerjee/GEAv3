'use client'

import { aboutContent } from '@/config/content'
import { useState } from 'react'

export default function About() {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    service: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Build mailto link with proper formatting
    const mailtoLink = `mailto:${aboutContent.contact.email}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\n\nService Type: ${formData.service}\n\nMessage:\n${formData.message}`
    )}`
    
    // Open email client
    window.location.href = mailtoLink
  }

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Learn about the Digital Transformation Agency and how we support Grenada's digital future. 
            Get in touch with our EA Governance team for assistance.
          </p>
        </div>

        {/* Contact Form Section - MOVED TO TOP */}
        <section className="mb-16 bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-3xl font-bold text-gray-900">
              Contact Information
            </h2>
          </div>
          
          <p className="text-gray-700 mb-2">
            The team can be reached at <span className="font-semibold">{aboutContent.contact.email}</span>
          </p>
          <p className="text-sm text-gray-600 mb-8">
            Choose your inquiry type and we'll respond within 2 business days.
          </p>
          
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two Column Layout for Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    id="service"
                    value={formData.service}
                    onChange={(e) => setFormData({...formData, service: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a service...</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Maturity Assessment">Maturity Assessment</option>
                    <option value="Program Management">Program Management</option>
                    <option value="Digital Transformation Roadmap">Digital Transformation Roadmap</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide details about your request..."
                  />
                </div>
              </div>
            </div>

            {/* Attachment Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After clicking "Compose Message", your email client will open with all information pre-filled. You can add attachments there before sending.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg shadow-md"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Compose Message
            </button>
          </form>

          {/* Alternative Contact - More Prominent */}
          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <p className="text-gray-700 mb-3 font-medium">Or email us directly:</p>
            <a 
              href={`mailto:${aboutContent.contact.email}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {aboutContent.contact.email}
            </a>
          </div>
        </section>

        {/* DTA Section */}
        <section className="mb-16 bg-white p-10 rounded-lg shadow-md">
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
        <section className="mb-16 bg-white p-10 rounded-lg shadow-md">
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
        <section className="mb-16 bg-white p-10 rounded-lg shadow-md">
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
      </div>
    </div>
  )
}
