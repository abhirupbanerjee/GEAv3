/**
 * Tests for QRCodeManager component
 *
 * Tests form validation, data loading, and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QRCodeManager from '@/components/managedata/QRCodeManager'

// Mock qrcode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
    toCanvas: vi.fn((canvas, url, options, callback) => {
      if (callback) callback(null)
    })
  }
}))

// Mock env-client
vi.mock('@/config/env-client', () => ({
  generateQRFeedbackUrl: vi.fn((id) => `https://feedback.example.com/${id}`)
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('QRCodeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/managedata/qrcodes') && !url.includes('next-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              qr_code_id: 'QR-TEST-001',
              service_id: 'SVC-001',
              service_name: 'Test Service',
              entity_id: 'AGY-001',
              entity_name: 'Test Entity',
              location_name: 'Main Office',
              location_address: '123 Test St',
              location_type: 'office',
              generated_url: 'https://feedback.example.com/QR-TEST-001',
              scan_count: 42,
              is_active: true,
              notes: '',
              created_at: '2024-01-15T12:00:00Z'
            }
          ])
        })
      }
      if (url.includes('/api/managedata/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { service_id: 'SVC-001', service_name: 'Test Service', entity_id: 'AGY-001', is_active: true },
            { service_id: 'SVC-002', service_name: 'Another Service', entity_id: 'AGY-002', is_active: true }
          ])
        })
      }
      if (url.includes('/api/managedata/entities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { unique_entity_id: 'AGY-001', entity_name: 'Test Entity', entity_type: 'agency', is_active: true },
            { unique_entity_id: 'AGY-002', entity_name: 'Another Entity', entity_type: 'ministry', is_active: true }
          ])
        })
      }
      if (url.includes('next-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ suggested_id: 'QR-TEST-002' })
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  describe('Initial rendering', () => {
    it('should render the component with search and add button', async () => {
      render(<QRCodeManager />)

      expect(screen.getByPlaceholderText('Search QR codes...')).toBeInTheDocument()
      expect(screen.getByText('+ Add QR Code')).toBeInTheDocument()
    })

    it('should show loading state initially', () => {
      render(<QRCodeManager />)

      expect(screen.getByText('Loading QR codes...')).toBeInTheDocument()
    })

    it('should load and display QR codes', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      expect(screen.getByText('Main Office')).toBeInTheDocument()
      expect(screen.getByText('Test Service')).toBeInTheDocument()
    })

    it('should display scan count', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument()
      })
    })

    it('should display active status badge', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })
  })

  describe('Search functionality', () => {
    it('should filter QR codes by search term', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search QR codes...')
      await userEvent.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.queryByText('QR-TEST-001')).not.toBeInTheDocument()
      })
    })

    it('should find QR codes matching search term', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search QR codes...')
      await userEvent.type(searchInput, 'Main')

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })
    })
  })

  describe('Add QR Code form', () => {
    it('should toggle form visibility when clicking Add button', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.queryByText('Loading QR codes...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByText('+ Add QR Code')
      await userEvent.click(addButton)

      // Form header includes emoji: '➕ Add New QR Code'
      expect(screen.getByText(/Add New QR Code/)).toBeInTheDocument()

      // Button text changes to Cancel
      expect(screen.getByText('✕ Cancel')).toBeInTheDocument()
    })

    it('should display form fields when form is open', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.queryByText('Loading QR codes...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByText('+ Add QR Code')
      await userEvent.click(addButton)

      // Check form fields are present
      expect(screen.getByText('Service *')).toBeInTheDocument()
      expect(screen.getByText('Location Type *')).toBeInTheDocument()
      expect(screen.getByText('QR Code ID *')).toBeInTheDocument()
      expect(screen.getByText('Location Name *')).toBeInTheDocument()
      expect(screen.getByText('Location Address *')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('should load services in dropdown', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.queryByText('Loading QR codes...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByText('+ Add QR Code')
      await userEvent.click(addButton)

      // Service dropdown should have "Select Service" placeholder option
      expect(screen.getByText('Select Service')).toBeInTheDocument()

      // Check "Another Service" option exists (unique to dropdown, not in table)
      await waitFor(() => {
        expect(screen.getByText('Another Service')).toBeInTheDocument()
      })
    })

    it('should have location type options', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.queryByText('Loading QR codes...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByText('+ Add QR Code')
      await userEvent.click(addButton)

      // Location type dropdown should have options
      expect(screen.getByText('Office')).toBeInTheDocument()
      expect(screen.getByText('Kiosk')).toBeInTheDocument()
      expect(screen.getByText('Service Center')).toBeInTheDocument()
    })

    it('should close form when Cancel is clicked', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.queryByText('Loading QR codes...')).not.toBeInTheDocument()
      })

      // Open form
      const addButton = screen.getByText('+ Add QR Code')
      await userEvent.click(addButton)

      // Form header includes emoji: '➕ Add New QR Code'
      expect(screen.getByText(/Add New QR Code/)).toBeInTheDocument()

      // Click cancel in form
      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      // Form should be closed - form header contains '➕ Add New QR Code'
      expect(screen.queryByText(/Add New QR Code/)).not.toBeInTheDocument()
    })
  })

  describe('Table actions', () => {
    it('should have QR download button', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      expect(screen.getByTitle('Download QR Poster')).toBeInTheDocument()
    })

    it('should have copy link button', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      expect(screen.getByTitle('Copy Feedback Link')).toBeInTheDocument()
    })

    it('should have edit button', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      expect(screen.getByTitle('Edit QR Code')).toBeInTheDocument()
    })

    it('should have toggle active button', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      // For active QR codes, button should say "Off" (to deactivate)
      expect(screen.getByTitle('Deactivate QR Code')).toBeInTheDocument()
    })

    it('should open edit form when edit is clicked', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      const editButton = screen.getByTitle('Edit QR Code')
      await userEvent.click(editButton)

      // Edit form header includes emoji: '✏️ Edit QR Code'
      await waitFor(() => {
        expect(screen.getByText(/Edit QR Code/)).toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('should have sortable column headers', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR-TEST-001')).toBeInTheDocument()
      })

      // Column headers exist in thead (uppercase)
      const tableHeaders = screen.getAllByRole('columnheader')
      expect(tableHeaders.length).toBeGreaterThan(0)

      // Table should have ID, Location, Service columns
      const headerTexts = tableHeaders.map(h => h.textContent)
      expect(headerTexts.some(t => t?.includes('ID'))).toBe(true)
    })
  })

  describe('Empty state', () => {
    it('should show empty message when no QR codes exist', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/managedata/qrcodes') && !url.includes('next-id')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          })
        }
        if (url.includes('/api/managedata/services')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          })
        }
        if (url.includes('/api/managedata/entities')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          })
        }
        return Promise.resolve({ ok: false })
      })

      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('No QR codes found')).toBeInTheDocument()
      })
    })
  })

  describe('QR code count display', () => {
    it('should display total QR code count', async () => {
      render(<QRCodeManager />)

      await waitFor(() => {
        expect(screen.getByText('QR Codes (1)')).toBeInTheDocument()
      })
    })
  })
})
