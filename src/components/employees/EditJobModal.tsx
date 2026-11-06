'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { updateJobAction } from '@/app/actions/employees';
import type { JobItem } from '@/lib/data/employees';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobItem;
}

export function EditJobModal({
  isOpen,
  onClose,
  job,
}: EditJobModalProps) {
  const router = useRouter();

  const [jobDesc, setJobDesc] = useState(job.jobDesc);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDesc = jobDesc.trim();
    if (!cleanDesc) {
      setError('Job description is required.');
      return;
    }

    if (cleanDesc.length > 20) {
      setError('Job description cannot exceed 20 characters (VARCHAR(20)).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateJobAction(job.jobCode, cleanDesc);
      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError('Failed to update job.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Edit Job — {job.jobCode}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update description
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
              Job Code
            </label>
            <input
              type="text"
              disabled
              value={job.jobCode}
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
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
              <span>Update Job</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
