'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { addJobHistoryAction } from '@/app/actions/employees';
import type { JobItem, DepartmentItem } from '@/lib/data/employees';

interface AddJobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  empNo: string;
  empName: string;
  jobs: JobItem[];
  departments: DepartmentItem[];
}

export function AddJobHistoryModal({
  isOpen,
  onClose,
  empNo,
  empName,
  jobs,
  departments,
}: AddJobHistoryModalProps) {
  const router = useRouter();

  const [jobCode, setJobCode] = useState(jobs[0]?.jobCode || '');
  const [deptCode, setDeptCode] = useState(departments[0]?.deptCode || '');
  const [effDate, setEffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salary, setSalary] = useState('50000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const salNum = parseFloat(salary);
    if (isNaN(salNum) || salNum <= 0) {
      setError('Salary must be greater than zero.');
      return;
    }

    if (!jobCode) {
      setError('Job position is required.');
      return;
    }

    if (!deptCode) {
      setError('Department is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addJobHistoryAction({
        empNo,
        jobCode,
        deptCode,
        effDate,
        salary: salNum,
      });

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError('Failed to record job history.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Add Job History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {empNo} — {empName}
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
              Effective Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={effDate}
              onChange={(e) => setEffDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Position <span className="text-rose-500">*</span>
            </label>
            <select
              value={jobCode}
              onChange={(e) => setJobCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {jobs.filter((j) => !j.isDeleted).map((j) => (
                <option key={j.jobCode} value={j.jobCode}>
                  {j.jobCode} — {j.jobDesc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {departments.filter((d) => !d.isDeleted).map((d) => (
                <option key={d.deptCode} value={d.deptCode}>
                  {d.deptCode} — {d.deptName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Salary (PHP) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>
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
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
