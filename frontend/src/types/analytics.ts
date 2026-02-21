/**
 * Analytics Type Definitions
 *
 * Type definitions for feedback analytics data structures
 */

// ============================================================================
// Feedback Statistics Data
// ============================================================================

export interface FeedbackStatsData {
  overall: {
    total_submissions: number
    avg_satisfaction: string | number
    avg_ease: string | number
    avg_clarity: string | number
    avg_timeliness: string | number
    avg_trust: string | number
    grievance_count: number
  }
  top_services: Array<{
    service_name: string
    entity_name: string
    submission_count: number
    avg_satisfaction: number
  }>
  by_channel: Array<{
    channel: string
    count: number
    avg_satisfaction: string | number
  }>
  by_recipient: Array<{
    recipient_group: string
    count: number
    avg_satisfaction: string | number
  }>
  rating_distribution: Array<{
    rating: number
    count: number
    percentage: number
  }>
  trend: Array<{
    date: string
    submissions: number
    avg_satisfaction: string | number
  }>
  recent_grievances: Array<{
    feedback_id: number
    service_name: string
    entity_name: string
    satisfaction_rating: number
    comment_text: string | null
    submitted_at: string
  }>
}

// ============================================================================
// Feedback Filters
// ============================================================================

export interface FeedbackFilters {
  service_id?: string
  entity_id?: string
  start_date?: string
  end_date?: string
  channel?: string
}
