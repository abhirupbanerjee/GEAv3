'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  showCloseButton = true,
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[101] overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[101] bg-gray-900 bg-opacity-60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative z-[102] bg-white rounded-lg shadow-2xl w-full ${maxWidthClasses[maxWidth]} transform transition-all`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body - scrollable */}
          <div className="px-6 py-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {children}
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
