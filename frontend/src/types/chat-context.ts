/**
 * Types for AI Chat Context Communication
 * These types define the structure of context sent to the AI Bot via postMessage
 */

// ============================================================================
// Modal Context
// ============================================================================

export interface ModalContext {
  /** Modal type identifier */
  type: string;
  /** Modal title displayed to user */
  title?: string;
  /** Type of entity being viewed/edited in modal */
  entityType?: 'ticket' | 'grievance' | 'entity' | 'service' | 'user' | 'feedback' | 'qr-code' | string;
  /** ID of the entity */
  entityId?: string | number;
  /** Display name of the entity */
  entityName?: string;
  /** Additional modal-specific data */
  data?: Record<string, any>;
}

// ============================================================================
// Edit Context
// ============================================================================

export interface EditContext {
  /** Whether edit mode is active */
  isEditing: boolean;
  /** Type of entity being edited */
  entityType: 'entity' | 'service' | 'user' | 'ticket' | 'grievance' | 'qr-code' | string;
  /** ID of the entity being edited */
  entityId: string | number;
  /** Display name of the entity */
  entityName?: string;
  /** List of fields available for editing */
  fields?: string[];
  /** Original values before editing */
  originalData?: Record<string, any>;
  /** Current values being edited */
  currentData?: Record<string, any>;
}

// ============================================================================
// Tab Context
// ============================================================================

export interface TabContext {
  /** Tab group identifier (e.g., 'master-data', 'analytics', 'managedata') */
  tabGroup: string;
  /** Currently active tab */
  activeTab: string;
  /** List of all available tabs */
  availableTabs: string[];
}

// ============================================================================
// Form Context
// ============================================================================

export interface FormContext {
  /** Form identifier */
  formName: string;
  /** Current step number (for multi-step forms) */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Fields that have been completed */
  completedFields?: string[];
  /** Fields that still need to be filled */
  pendingFields?: string[];
  /** Current validation errors */
  validationErrors?: string[];
}

// ============================================================================
// Full Page Context
// ============================================================================

export interface PageContext {
  // Route information
  /** Current page route (e.g., '/admin/tickets') */
  route: string;
  /** Page title */
  pageTitle?: string;
  /** Page description */
  pageDescription?: string;

  // UI State
  /** Currently open modal, if any */
  modal?: ModalContext | null;
  /** Current edit state, if editing */
  edit?: EditContext | null;
  /** Current tab state */
  tab?: TabContext | null;
  /** Current form state */
  form?: FormContext | null;

  // Custom context
  /** Any page-specific additional context */
  custom?: Record<string, any>;

  // Metadata
  /** Timestamp of this context update */
  timestamp: number;
  /** What triggered this update */
  changeType: 'navigation' | 'modal' | 'edit' | 'tab' | 'form' | 'custom';
}

// ============================================================================
// Message Types
// ============================================================================

export interface ContextUpdateMessage {
  type: 'CONTEXT_UPDATE';
  context: PageContext;
}

export type ChatContextMessage = ContextUpdateMessage;
