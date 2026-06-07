'use client';

import React, { useState } from 'react';
import { BaseModal } from './BaseModal';

interface EditFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  title: string;
  children: React.ReactNode;
  submitText?: string;
  isEditing?: boolean;
}

export function EditFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText,
  isEditing = false,
}: EditFormModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(e);
      // onSubmit should handle closing the modal if successful
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg transition-colors"
        disabled={loading}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="edit-form"
        disabled={loading}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <span className="animate-spin">⏳</span>}
        {loading ? 'Saving...' : (submitText || (isEditing ? 'Update' : 'Create'))}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="2xl"
    >
      <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </BaseModal>
  );
}
