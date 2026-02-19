'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
  icon?: 'warning' | 'info' | 'question';
  helperText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  icon = 'question',
  helperText,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={loading}
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-white transition-colors ${
          confirmVariant === 'danger'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
        } disabled:opacity-50 flex items-center gap-2`}
      >
        {loading && <span className="animate-spin">⏳</span>}
        {loading ? 'Processing...' : confirmText}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Icon */}
        {icon && (
          <div className="flex justify-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                icon === 'warning'
                  ? 'bg-yellow-100'
                  : icon === 'info'
                  ? 'bg-blue-100'
                  : 'bg-gray-100'
              }`}
            >
              {icon === 'warning' && <span className="text-2xl">⚠️</span>}
              {icon === 'info' && <span className="text-2xl">ℹ️</span>}
              {icon === 'question' && <span className="text-2xl">❓</span>}
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-gray-700 text-center">{message}</p>

        {/* Helper text (reactivation instructions) */}
        {helperText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">{helperText}</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
