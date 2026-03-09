'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode
} from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { config } from '@/config/env';
import type {
  PageContext,
  ModalContext,
  EditContext,
  TabContext,
  FormContext,
  UserSessionContext,
  ContextUpdateMessage
} from '@/types/chat-context';

// ============================================================================
// Context Type Definition
// ============================================================================

interface ChatContextValue {
  /** Get the current context snapshot (always returns latest) */
  getContext: () => PageContext;
  /** Current context snapshot (value at last render - prefer getContext() for latest) */
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
  const { data: session, status } = useSession();
  const chatbotUrlRef = useRef<string>(config.CHATBOT_URL);

  // Fetch chatbot URL from database on mount
  useEffect(() => {
    fetch(`/api/settings/chatbot?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          chatbotUrlRef.current = data.url;
        }
      })
      .catch((err) => {
        console.error('[ChatContext] Failed to load chatbot URL:', err);
      });
  }, []);

  // Convert NextAuth session to UserSessionContext
  const getUserContext = useCallback((): UserSessionContext | null => {
    if (status === 'loading') return null;

    if (!session?.user) {
      return {
        id: 'guest',
        role: 'public',
        isAuthenticated: false,
      };
    }

    const user = session.user as any;
    return {
      id: user.id || user.email || 'unknown',
      name: user.name || undefined,
      email: user.email || undefined,
      role: user.role_name?.toLowerCase() === 'admin' ? 'admin'
            : user.role_name?.toLowerCase() === 'staff' ? 'staff'
            : 'public',
      roleName: user.role_name || undefined,
      entity: user.entity_id && user.entity_name ? {
        id: user.entity_id,
        name: user.entity_name,
      } : undefined,
      isAuthenticated: true,
    };
  }, [session, status]);

  // ──────────────────────────────────────────────────────────────────────────
  // Context stored in ref (no re-renders on update)
  // ──────────────────────────────────────────────────────────────────────────

  const contextRef = useRef<PageContext>({
    route: pathname,
    user: getUserContext(),
    timestamp: Date.now(),
    changeType: 'navigation',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Send Context to AI Bot
  // ──────────────────────────────────────────────────────────────────────────

  const sendContextToBot = useCallback((newContext: PageContext) => {
    const iframe = document.querySelector(
      'iframe[title="Grenada AI Assistant"]'
    ) as HTMLIFrameElement | null;

    if (!iframe?.contentWindow) {
      return;
    }

    try {
      const message: ContextUpdateMessage = {
        type: 'CONTEXT_UPDATE',
        context: newContext,
      };

      const botOrigin = new URL(chatbotUrlRef.current).origin;
      iframe.contentWindow.postMessage(message, botOrigin);

      console.log('[ChatContext] Sent:', newContext.changeType, {
        route: newContext.route,
        user: newContext.user ? {
          role: newContext.user.role,
          name: newContext.user.name,
          authenticated: newContext.user.isAuthenticated,
        } : null,
        modal: newContext.modal?.type,
        edit: newContext.edit?.entityType,
        tab: newContext.tab?.activeTab,
        form: newContext.form?.formName,
      });
    } catch (error) {
      console.error('[ChatContext] Failed to send:', error);
    }
  }, []);

  // Helper: update ref and send to bot (no React re-render)
  const updateContext = useCallback((updater: (prev: PageContext) => PageContext) => {
    const newContext = updater(contextRef.current);
    contextRef.current = newContext;
    sendContextToBot(newContext);
  }, [sendContextToBot]);

  // ──────────────────────────────────────────────────────────────────────────
  // Handle Session Changes
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'loading') {
      updateContext(prev => ({
        ...prev,
        user: getUserContext(),
        timestamp: Date.now(),
        changeType: prev.changeType,
      }));
    }
  }, [session, status, getUserContext, updateContext]);

  // ──────────────────────────────────────────────────────────────────────────
  // Handle Route Changes (Navigation)
  // No longer calls setState — writes to ref only, avoiding tree re-render
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    updateContext(prev => ({
      custom: prev.route.split('/')[1] === pathname.split('/')[1]
        ? prev.custom
        : undefined,
      route: pathname,
      user: prev.user,
      modal: null,
      edit: null,
      tab: prev.tab,
      form: null,
      timestamp: Date.now(),
      changeType: 'navigation',
    }));
  }, [pathname, updateContext]);

  // ──────────────────────────────────────────────────────────────────────────
  // Context Update Methods
  // ──────────────────────────────────────────────────────────────────────────

  const setModal = useCallback((modal: ModalContext | null) => {
    updateContext(prev => ({ ...prev, modal, timestamp: Date.now(), changeType: 'modal' }));
  }, [updateContext]);

  const setEdit = useCallback((edit: EditContext | null) => {
    updateContext(prev => ({ ...prev, edit, timestamp: Date.now(), changeType: 'edit' }));
  }, [updateContext]);

  const setTab = useCallback((tab: TabContext) => {
    updateContext(prev => ({ ...prev, tab, timestamp: Date.now(), changeType: 'tab' }));
  }, [updateContext]);

  const setForm = useCallback((form: FormContext | null) => {
    updateContext(prev => ({ ...prev, form, timestamp: Date.now(), changeType: 'form' }));
  }, [updateContext]);

  const setCustom = useCallback((custom: Record<string, any>) => {
    updateContext(prev => ({
      ...prev,
      custom: { ...prev.custom, ...custom },
      timestamp: Date.now(),
      changeType: 'custom',
    }));
  }, [updateContext]);

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

  const getContext = useCallback(() => contextRef.current, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Provide Context (stable value — no re-renders on context changes)
  // ──────────────────────────────────────────────────────────────────────────

  const value: ChatContextValue = useMemo(() => ({
    context: contextRef.current,
    getContext,
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
  }), [getContext, setModal, setEdit, setTab, setForm, setCustom,
       openModal, closeModal, startEditing, stopEditing,
       switchTab, updateFormProgress, clearForm]);

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
