'use client'

import { useState } from 'react'

interface ExportButtonProps {
  statsData: any
  filters: any
}

export default function ExportButton({ statsData, filters }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const exportToCSV = () => {
    setExporting(true)

    try {
      // Prepare CSV content
      const rows: string[] = []
      
      // Add header with metadata
      rows.push('Grenada Feedback System - Analytics Export')
      rows.push(`Export Date: ${new Date().toLocaleString()}`)
      rows.push('')
      
      // Add filters if any
      if (filters.service_id || filters.entity_id || filters.start_date || filters.end_date || filters.channel) {
        rows.push('Applied Filters:')
        if (filters.service_id) rows.push(`Service ID: ${filters.service_id}`)
        if (filters.entity_id) rows.push(`Entity ID: ${filters.entity_id}`)
        if (filters.start_date) rows.push(`Start Date: ${filters.start_date}`)
        if (filters.end_date) rows.push(`End Date: ${filters.end_date}`)
        if (filters.channel) rows.push(`Channel: ${filters.channel}`)
        rows.push('')
      }

      // Overall Statistics
      rows.push('OVERALL STATISTICS')
      rows.push('Metric,Value')
      rows.push(`Total Submissions,${statsData.overall.total_submissions}`)
      rows.push(`Average Satisfaction,${parseFloat(statsData.overall.avg_satisfaction || '0').toFixed(2)}`)
      rows.push(`Average Ease,${parseFloat(statsData.overall.avg_ease || '0').toFixed(2)}`)
      rows.push(`Average Clarity,${parseFloat(statsData.overall.avg_clarity || '0').toFixed(2)}`)
      rows.push(`Average Timeliness,${parseFloat(statsData.overall.avg_timeliness || '0').toFixed(2)}`)
      rows.push(`Average Trust,${parseFloat(statsData.overall.avg_trust || '0').toFixed(2)}`)
      rows.push(`Grievances,${statsData.overall.grievance_count}`)
      rows.push('')

      // Top Services
      if (statsData.top_services && statsData.top_services.length > 0) {
        rows.push('TOP SERVICES')
        rows.push('Rank,Service Name,Entity,Submissions,Avg Satisfaction')
        statsData.top_services.forEach((service: any, index: number) => {
          rows.push(`${index + 1},"${service.service_name}","${service.entity_name}",${service.submission_count},${parseFloat(service.avg_satisfaction).toFixed(2)}`)
        })
        rows.push('')
      }

      // Channel Breakdown
      if (statsData.by_channel.length > 0) {
        rows.push('FEEDBACK BY CHANNEL')
        rows.push('Channel,Count,Avg Satisfaction')
        statsData.by_channel.forEach((channel: any) => {
          rows.push(`${channel.channel},${channel.count},${parseFloat(channel.avg_satisfaction || '0').toFixed(2)}`)
        })
        rows.push('')
      }

      // Recipient Breakdown
      if (statsData.by_recipient.length > 0) {
        rows.push('FEEDBACK BY USER TYPE')
        rows.push('User Type,Count,Avg Satisfaction')
        statsData.by_recipient.forEach((recipient: any) => {
          rows.push(`${recipient.recipient_group},${recipient.count},${parseFloat(recipient.avg_satisfaction || '0').toFixed(2)}`)
        })
        rows.push('')
      }

      // Rating Distribution
      if (statsData.rating_distribution.length > 0) {
        rows.push('RATING DISTRIBUTION')
        rows.push('Rating,Count,Percentage')
        statsData.rating_distribution.forEach((rating: any) => {
          rows.push(`${rating.rating} Stars,${rating.count},${parseFloat(rating.percentage).toFixed(2)}%`)
        })
        rows.push('')
      }

      // Trend Data
      if (statsData.trend && statsData.trend.length > 0) {
        rows.push('30-DAY TREND')
        rows.push('Date,Submissions,Avg Satisfaction')
        statsData.trend.forEach((day: any) => {
          rows.push(`${day.date},${day.submissions},${parseFloat(day.avg_satisfaction || '0').toFixed(2)}`)
        })
        rows.push('')
      }

      // Recent Grievances
      if (statsData.recent_grievances.length > 0) {
        rows.push('RECENT GRIEVANCES')
        rows.push('Feedback ID,Service,Entity,Rating,Comment,Date')
        statsData.recent_grievances.forEach((grievance: any) => {
          const comment = (grievance.comment_text || '').replace(/"/g, '""') // Escape quotes
          rows.push(`${grievance.feedback_id},"${grievance.service_name}","${grievance.entity_name}",${grievance.satisfaction_rating},"${comment}",${new Date(grievance.submitted_at).toLocaleString()}`)
        })
      }

      // Create CSV content
      const csvContent = rows.join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const filename = `feedback-analytics-${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={exportToCSV}
      disabled={exporting}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  )
}