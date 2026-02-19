// Master Data Type Definitions for Pagination
// Reusable types for Entities, Services, and QR Codes with pagination support

// ============================================================================
// Pagination Types (Reused from Tickets Pattern)
// ============================================================================

export interface Pagination {
  page: number
  limit: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ============================================================================
// Entity Types
// ============================================================================

export interface Entity {
  unique_entity_id: string
  entity_name: string
  entity_type: 'ministry' | 'department' | 'agency' | 'statutory_body'
  parent_entity_id: string | null
  parent_entity_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EntityFilters {
  search?: string | null
  entity_type?: string | null
  is_active?: 'active' | 'inactive' | 'all'
}

export interface EntitySort {
  by: 'unique_entity_id' | 'entity_name' | 'entity_type' | 'parent_entity_name' | 'is_active'
  order: 'asc' | 'desc'
}

export interface EntityListResponse {
  entities: Entity[]
  pagination: Pagination
  filters: EntityFilters
  sort: EntitySort
}

// ============================================================================
// Service Types
// ============================================================================

export interface Service {
  service_id: string
  service_name: string
  entity_id: string
  entity_name?: string
  service_category: string
  service_description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceFilters {
  search?: string | null
  service_category?: string | null
  entity_id?: string | null
  is_active?: 'active' | 'inactive' | 'all'
}

export interface ServiceSort {
  by: 'service_id' | 'service_name' | 'entity_name' | 'service_category'
  order: 'asc' | 'desc'
}

export interface ServiceListResponse {
  services: Service[]
  pagination: Pagination
  filters: ServiceFilters
  sort: ServiceSort
}

// ============================================================================
// QR Code Types
// ============================================================================

export interface QRCodeData {
  qr_code_id: string
  service_id: string
  service_name?: string
  entity_id: string
  entity_name?: string
  location_name: string
  location_address: string
  location_type: string
  generated_url: string
  scan_count: number
  is_active: boolean
  notes: string
  created_at: string
}

export interface QRCodeFilters {
  search?: string | null
  is_active?: 'active' | 'inactive' | 'all'
}

export interface QRCodeSort {
  by: 'qr_code_id' | 'location_name' | 'location_type' | 'service_name' | 'created_at'
  order: 'asc' | 'desc'
}

export interface QRCodeListResponse {
  qrcodes: QRCodeData[]
  pagination: Pagination
  filters: QRCodeFilters
  sort: QRCodeSort
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: string
}

// ============================================================================
// Hook Parameter Types
// ============================================================================

export interface UseEntitiesParams {
  filters?: EntityFilters
  sort?: EntitySort
  page?: number
  limit?: number
}

export interface UseServicesParams {
  filters?: ServiceFilters
  sort?: ServiceSort
  page?: number
  limit?: number
}

export interface UseQRCodesParams {
  filters?: QRCodeFilters
  sort?: QRCodeSort
  page?: number
  limit?: number
}
