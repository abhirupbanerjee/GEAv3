'use client'

import { useEffect, useState } from 'react'

interface Stats {
  entities: number
  services: number
  qrCodes: number
  totalFeedback: number
}

export default function QuickStatsCards() {
  const [stats, setStats] = useState<Stats>({
    entities: 0,
    services: 0,
    qrCodes: 0,
    totalFeedback: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all data in parallel
        const [entitiesRes, servicesRes, qrCodesRes, feedbackRes] = await Promise.all([
          fetch('/api/managedata/entities'),
          fetch('/api/managedata/services'),
          fetch('/api/managedata/qrcodes'),
          fetch('/api/feedback/stats'),
        ])

        if (!entitiesRes.ok || !servicesRes.ok || !qrCodesRes.ok || !feedbackRes.ok) {
          throw new Error('Failed to fetch stats')
        }

        const entities = await entitiesRes.json()
        const services = await servicesRes.json()
        const qrCodes = await qrCodesRes.json()
        const feedback = await feedbackRes.json()

        setStats({
          entities: entities.filter((e: any) => e.is_active).length,
          services: services.filter((s: any) => s.is_active).length,
          qrCodes: qrCodes.filter((q: any) => q.is_active).length,
          totalFeedback: parseInt(feedback.overall?.total_submissions || '0', 10),
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const cards = [
    {
      label: 'Active Entities',
      value: stats.entities,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/admin/managedata',
    },
    {
      label: 'Active Services',
      value: stats.services,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/admin/managedata',
    },
    {
      label: 'Active QR Codes',
      value: stats.qrCodes,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      link: '/admin/managedata',
    },
    {
      label: 'Total Feedback',
      value: stats.totalFeedback,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/admin/analytics',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <a
          key={card.label}
          href={card.link}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${card.bgColor} ${card.textColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
          <p className={`text-3xl font-bold ${card.textColor}`}>
            {card.value.toLocaleString()}
          </p>
        </a>
      ))}
    </div>
  )
}