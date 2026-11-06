'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { deleteJobHistoryAction, restoreJobHistoryAction } from '@/app/actions/employees';
import { AddJobHistoryModal } from './AddJobHistoryModal';
import { EditJobHistoryModal } from './EditJobHistoryModal';
import { formatPHP } from '@/lib/utils';
import type {
  EmployeeItem,
  JobHistoryRecord,
  JobItem,
  DepartmentItem,
} from '@/lib/data/employees';

interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeItem;
  historyRecords: JobHistoryRecord[];
  jobs: JobItem[];
  departments: DepartmentItem[];
  userRole?: string;
}

export function JobHistoryModal({
  isOpen,
  onClose,
  employee,
  historyRecords,
  jobs,
  departments,
  userRole = 'admin',
}: JobHistoryModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';
  const canModify = isAdmin;

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<JobHistoryRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<JobHistoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter history rows belonging to this employee
  const empHistory = useMemo(() => {
    return historyRecords.filter((h) => h.empNo === employee.empNo);
  }, [historyRecords, employee.empNo]);

  const activeCount = useMemo(() => empHistory.filter((h) => !h.isDeleted).length, [empHistory]);
  const inactiveCount = useMemo(() => empHistory.filter((h) => h.isDeleted).length, [empHistory]);
  const totalCount = empHistory.length;

  const filteredHistory = useMemo(() => {
    let list = empHistory;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((h) => !h.isDeleted);
      } else if (statusFilter === 'inactive') {
        list = list.filter((h) => h.isDeleted);
      }
    } else {
      list = list.filter((h) => !h.isDeleted);
    }
    return list;
  }, [empHistory, statusFilter, isAdmin]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteJobHistoryAction(
        deletingRecord.empNo,
        deletingRecord.jobCode,
        deletingRecord.effDate
      );

      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingRecord(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to soft-delete job history record.');
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (record: JobHistoryRecord) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await restoreJobHistoryAction(record.empNo, record.jobCode, record.effDate);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to restore job history record.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Top Header matching Figure 16/17 */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Job History &mdash; {employee.empNo}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {employee.fullName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification */}
        {actionError && (
          <div className="mx-6 mb-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Controls Row: Status Filters (Admin) + Add History Button */}
        <div className="flex items-center justify-between px-6 pb-4 pt-1">
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-[#041a24] dark:text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({totalCount})
              </button>
            </div>
          ) : (
            <div />
          )}

          {canModify && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#001A2B] hover:bg-[#00263E] text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add History</span>
            </button>
          )}
        </div>

        {/* Table Area (Figures 16 & 17) */}
        <div className="px-6 pb-6 overflow-x-auto">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">EFF DATE</th>
                  <th className="px-4 py-3">JOB</th>
                  <th className="px-4 py-3">DEPARTMENT</th>
                  <th className="px-4 py-3">SALARY</th>
                  {isAdmin && <th className="px-4 py-3">STATUS</th>}
                  {isAdmin && <th className="px-4 py-3">STAMP</th>}
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 5}
                      className="px-4 py-8 text-center text-xs text-slate-400"
                    >
                      No job history records found for this employee.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec) => {
                    const isDeleted = rec.isDeleted;
                    return (
                      <tr
                        key={`${rec.empNo}-${rec.jobCode}-${rec.effDate}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isDeleted ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-70' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {rec.effDate}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          <span className="font-mono font-medium text-slate-500 mr-1.5">
                            {rec.jobCode}
                          </span>
                          &mdash; {rec.jobDesc}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          <span className="font-mono font-medium text-slate-500 mr-1.5">
                            {rec.deptCode}
                          </span>
                          &mdash; {rec.deptName}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {rec.salary != null ? formatPHP(rec.salary) : '—'}
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium font-sans ${
                                isDeleted
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {isDeleted ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                        )}

                        {isAdmin && (
                          <td className="px-4 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {rec.stamp || '—'}
                          </td>
                        )}

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canModify && (
                              <>
                                {!isDeleted ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord(rec)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingRecord(rec)}
                                      className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestore(rec)}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1 text-xs rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Restore</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Sub-modal */}
        {deletingRecord && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-5 shadow-2xl font-sans">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Confirm Soft Delete
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Are you sure you want to mark the job record for{' '}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {deletingRecord.jobDesc}
                </span>{' '}
                on{' '}
                <span className="font-mono font-bold">
                  {deletingRecord.effDate}
                </span>{' '}
                as Inactive? It can be restored later.
              </p>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
                >
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add History Modal */}
        <AddJobHistoryModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          empNo={employee.empNo}
          empName={employee.fullName}
          jobs={jobs}
          departments={departments}
        />

        {/* Edit History Modal */}
        {editingRecord && (
          <EditJobHistoryModal
            isOpen={Boolean(editingRecord)}
            onClose={() => setEditingRecord(null)}
            record={editingRecord}
            departments={departments}
          />
        )}
      </div>
    </div>
  );
}
