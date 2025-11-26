'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode
} from 'react';
import { usePathname } from 'next/navigation';
import { config } from '@/config/env';
import type {
  PageContext,
  ModalContext,
  EditContext,
  TabContext,
  FormContext,
  ContextUpdateMessage
} from '@/types/chat-context';

// ============================================================================
// Context Type Definition
// ============================================================================

interface ChatContextValue {
  /** Current full context state */
  context: PageContext;

  /** Set modal state */
  setModal: (modal: ModalContext | null) => void;
  /** Set edit state */
  setEdit: (edit: EditContext | null) => void;
  /** Set tab state */
  setTab: (tab: TabContext) => void;
  /** Set form state */
  setForm: (form: FormContext | null) => void;
  /** Set custom context data */
  setCustom: (custom: Record<string, any>) => void;

  /** Helper: Open a modal */
  openModal: (type: string, data?: Partial<ModalContext>) => void;
  /** Helper: Close current modal */
  closeModal: () => void;
  /** Helper: Start editing an entity */
  startEditing: (entityType: string, entityId: string | number, data?: Partial<EditContext>) => void;
  /** Helper: Stop editing */
  stopEditing: () => void;
  /** Helper: Switch to a different tab */
  switchTab: (tabGroup: string, activeTab: string, availableTabs?: string[]) => void;
  /** Helper: Update form progress */
  updateFormProgress: (formName: string, data: Partial<FormContext>) => void;
  /** Helper: Clear form state */
  clearForm: () => void;
}

// Create context with null default
const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface ChatContextProviderProps {
  children: ReactNode;
}

export function ChatContextProvider({ children }: ChatContextProviderProps) {
  const pathname = usePathname();

  // Initialize context state
  const [context, setContext] = useState<PageContext>({
    route: pathname,
    timestamp: Date.now(),
    changeType: 'navigation',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Send Context to AI Bot
  // ──────────────────────────────────────────────────────────────────────────

  const sendContextToBot = useCallback((newContext: PageContext) => {
    // Find the chatbot iframe by title
    const iframe = document.querySelector(
      'iframe[title="Grenada AI Assistant"]'
    ) as HTMLIFrameElement | null;

    if (!iframe?.contentWindow) {
      // Iframe not mounted yet, that's OK
      console.log('[ChatContext] Iframe not found, skipping postMessage');
      return;
    }

    try {
      const message: ContextUpdateMessage = {
        type: 'CONTEXT_UPDATE',
        context: newContext,
      };

      // Get the AI Bot origin from config
      const botOrigin = new URL(config.CHATBOT_URL).origin;

      iframe.contentWindow.postMessage(message, botOrigin);

      console.log('[ChatContext] Sent:', newContext.changeType, {
        route: newContext.route,
        modal: newContext.modal?.type,
        edit: newContext.edit?.entityType,
        tab: newContext.tab?.activeTab,
        form: newContext.form?.formName,
      });
    } catch (error) {
      console.error('[ChatContext] Failed to send:', error);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Handle Route Changes (Navigation)
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setContext(prev => {
      const newContext: PageContext = {
        // Keep custom context if on same base route
        custom: prev.route.split('/')[1] === pathname.split('/')[1]
          ? prev.custom
          : undefined,
        // Reset modal and edit on navigation
        route: pathname,
        modal: null,
        edit: null,
        // Keep tab if navigating within same section
        tab: prev.tab,
        form: null,
        timestamp: Date.now(),
        changeType: 'navigation',
      };

      // Send after state update
      setTimeout(() => sendContextToBot(newContext), 0);

      return newContext;
    });
  }, [pathname, sendContextToBot]);

  // ──────────────────────────────────────────────────────────────────────────
  // Context Update Methods
  // ──────────────────────────────────────────────────────────────────────────

  const setModal = useCallback((modal: ModalContext | null) => {
    setContext(prev => {
      const newContext: PageContext = {
        ...prev,
        modal,
        timestamp: Date.now(),
        changeType: 'modal',
      };
      sendContextToBot(newContext);
      return newContext;
    });
  }, [sendContextToBot]);

  const setEdit = useCallback((edit: EditContext | null) => {
    setContext(prev => {
      const newContext: PageContext = {
        ...prev,
        edit,
        timestamp: Date.now(),
        changeType: 'edit',
      };
      sendContextToBot(newContext);
      return newContext;
    });
  }, [sendContextToBot]);

  const setTab = useCallback((tab: TabContext) => {
    setContext(prev => {
      const newContext: PageContext = {
        ...prev,
        tab,
        timestamp: Date.now(),
        changeType: 'tab',
      };
      sendContextToBot(newContext);
      return newContext;
    });
  }, [sendContextToBot]);

  const setForm = useCallback((form: FormContext | null) => {
    setContext(prev => {
      const newContext: PageContext = {
        ...prev,
        form,
        timestamp: Date.now(),
        changeType: 'form',
      };
      sendContextToBot(newContext);
      return newContext;
    });
  }, [sendContextToBot]);

  const setCustom = useCallback((custom: Record<string, any>) => {
    setContext(prev => {
      const newContext: PageContext = {
        ...prev,
        custom: { ...prev.custom, ...custom },
        timestamp: Date.now(),
        changeType: 'custom',
      };
      sendContextToBot(newContext);
      return newContext;
    });
  }, [sendContextToBot]);

  // ──────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ──────────────────────────────────────────────────────────────────────────

  const openModal = useCallback((type: string, data?: Partial<ModalContext>) => {
    setModal({ type, ...data });
  }, [setModal]);

  const closeModal = useCallback(() => {
    setModal(null);
  }, [setModal]);

  const startEditing = useCallback((
    entityType: string,
    entityId: string | number,
    data?: Partial<EditContext>
  ) => {
    setEdit({
      isEditing: true,
      entityType,
      entityId,
      ...data,
    });
  }, [setEdit]);

  const stopEditing = useCallback(() => {
    setEdit(null);
  }, [setEdit]);

  const switchTab = useCallback((
    tabGroup: string,
    activeTab: string,
    availableTabs: string[] = []
  ) => {
    setTab({
      tabGroup,
      activeTab,
      availableTabs,
    });
  }, [setTab]);

  const updateFormProgress = useCallback((
    formName: string,
    data: Partial<FormContext>
  ) => {
    setForm({
      formName,
      ...data,
    });
  }, [setForm]);

  const clearForm = useCallback(() => {
    setForm(null);
  }, [setForm]);

  // ──────────────────────────────────────────────────────────────────────────
  // Provide Context
  // ──────────────────────────────────────────────────────────────────────────

  const value: ChatContextValue = {
    context,
    setModal,
    setEdit,
    setTab,
    setForm,
    setCustom,
    openModal,
    closeModal,
    startEditing,
    stopEditing,
    switchTab,
    updateFormProgress,
    clearForm,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      'useChatContext must be used within a ChatContextProvider. ' +
      'Make sure your component is wrapped with <ChatContextProvider>.'
    );
  }

  return context;
}

// ============================================================================
// Optional: Hook that doesn't throw (for optional usage)
// ============================================================================

export function useChatContextOptional(): ChatContextValue | null {
  return useContext(ChatContext);
}
