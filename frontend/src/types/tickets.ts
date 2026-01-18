/**
 * TypeScript Type Definitions for Ticket Management System
 */

// ===== Core Types =====

export interface TicketStatus {
  id: number
  name: string
  code: string
  color: string | null
}

export interface TicketPriority {
  id: number
  name: string
  code: string
  color: string | null
}

export interface TicketCategory {
  id: number
  name: string
  code: string
}

export interface Service {
  id: string
  name: string
}

export interface Entity {
  id: string
  name: string
}

export interface Requester {
  name: string | null
  email: string | null
  phone?: string | null
  category?: string | null
}

export interface SLA {
  response_target: string | null
  resolution_target: string | null
  first_response_at: string | null
}

export interface Timestamps {
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
}

// ===== Ticket Types =====

// Feature 1.5: Submitter info (no PII - just type and entity name)
export interface Submitter {
  type: 'anonymous' | 'citizen' | 'staff'
  entity_name: string | null
}

export interface Ticket {
  ticket_id: number
  ticket_number: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory | null
  service: Service | null
  entity: Entity | null
  assigned_entity: Entity | null
  requester: Requester
  submitter?: Submitter  // Feature 1.5: Who submitted the ticket
  created_at: string
  updated_at: string
  sla_resolution_target: string | null
  is_overdue?: boolean
}

export interface TicketDetail extends Ticket {
  sla: SLA
  timestamps: Timestamps
  source: string | null
}

// ===== Attachment Types =====

export interface TicketAttachment {
  attachment_id: number
  filename: string
  mimetype: string
  file_size: number
  uploaded_by: string
  created_at: string
}

// ===== Activity Types =====

export interface TicketActivity {
  activity_id: number
  activity_type: string
  performed_by: string
  description: string
  created_at: string
}

// ===== Dashboard Types =====

export interface DashboardStats {
  total_tickets: number
  status_breakdown: Record<
    string,
    {
      name: string
      count: number
      color: string | null
    }
  >
  priority_breakdown: Record<
    string,
    {
      name: string
      count: number
      color: string | null
    }
  >
  metrics: {
    overdue_tickets: number
    avg_resolution_time: string | null
    sla_compliance: string
    today_tickets: number
    week_tickets: number
  }
}

// ===== Filter Types =====

export interface TicketFilters {
  view?: 'received' | 'submitted' | null  // Feature 1.5: Tickets view
  entity_id?: string | null
  service_id?: string | null
  status?: string | null
  priority?: string | null
  search?: string | null
}

export interface TicketSort {
  by: 'created_at' | 'updated_at' | 'ticket_number' | 'subject' | 'status_id' | 'priority_id'
  order: 'asc' | 'desc'
}

// ===== Pagination Types =====

export interface Pagination {
  page: number
  limit: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ===== API Response Types =====

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  message?: string
  timestamp: string
}

export interface TicketListResponse {
  tickets: Ticket[]
  pagination: Pagination
  filters: TicketFilters
  sort: TicketSort
}

export interface TicketDetailResponse {
  ticket: TicketDetail
  attachments: TicketAttachment[]
  activities: TicketActivity[]
}

// ===== Update/Create Types =====

export interface TicketUpdatePayload {
  status_id?: number
  priority_id?: number
  internal_note?: string
  performed_by?: string
}

export interface TicketUpdateResponse {
  ticket_id: number
  ticket_number: string
  status_id: number
  priority_id: number
  updated_at: string
}

// ===== Dropdown Option Types (for UI) =====

export interface DropdownOption {
  value: string | number
  label: string
  color?: string | null
}

export interface StatusOption extends DropdownOption {
  value: number
}

export interface PriorityOption extends DropdownOption {
  value: number
}

export interface EntityOption extends DropdownOption {
  value: string
}

export interface ServiceOption extends DropdownOption {
  value: string
}
