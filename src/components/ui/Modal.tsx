'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#041a24]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative w-full rounded-[4px] bg-white dark:bg-surface-1 shadow-xl border border-black/10 dark:border-border z-10 overflow-hidden font-sans',
          maxWidths[maxWidth]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-border bg-white dark:bg-surface-1 px-5 py-4">
          <div>
            <h2 className="font-editorial text-lg sm:text-xl font-normal text-[#041a24] dark:text-white tracking-tight">{title}</h2>
            {description && (
              <p className="font-sans text-xs text-[#41555f] dark:text-slate-300 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[2px] p-1 text-black/40 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-surface-2 hover:text-[#041a24] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[82vh] overflow-y-auto bg-white dark:bg-surface-1 text-[#041a24] dark:text-white">{children}</div>
      </div>
    </div>
  );
}
