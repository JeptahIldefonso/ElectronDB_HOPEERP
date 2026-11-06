'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { addDepartmentAction } from '@/app/actions/employees';

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedCode?: string;
}

export function AddDepartmentModal({
  isOpen,
  onClose,
  nextSuggestedCode = 'D09',
}: AddDepartmentModalProps) {
  const router = useRouter();

  const [deptCode, setDeptCode] = useState(nextSuggestedCode);
  const [deptName, setDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = deptCode.trim().toUpperCase();
    const cleanName = deptName.trim();

    if (!cleanCode) {
      setError('Department code is required.');
      return;
    }

    if (cleanCode.length > 3) {
      setError('Department code cannot exceed 3 characters (VARCHAR(3)).');
      return;
    }

    if (!cleanName) {
      setError('Department name is required.');
      return;
    }

    if (cleanName.length > 20) {
      setError('Department name cannot exceed 20 characters (VARCHAR(20)).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addDepartmentAction(cleanCode, cleanName);
      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError('Failed to create department.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Add New Department
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Canonical lookup entity (Figure 19)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={3}
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              placeholder="e.g. IT"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none uppercase"
            />
            <span className="text-[10px] text-slate-400">Up to 3 characters (VARCHAR(3))</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Information Tech"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Max 20 characters (VARCHAR(20))</span>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Department</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
