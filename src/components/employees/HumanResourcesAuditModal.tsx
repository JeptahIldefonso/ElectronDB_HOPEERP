'use client';

import React from 'react';
import { X, History, ShieldCheck } from 'lucide-react';
import type { HumanResourcesAuditItem } from '@/lib/data/employees';

interface HumanResourcesAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audits: HumanResourcesAuditItem[];
}

export function HumanResourcesAuditModal({
  isOpen,
  onClose,
  audits,
}: HumanResourcesAuditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#041a24]/10 dark:bg-slate-800 flex items-center justify-center text-[#041a24] dark:text-slate-200">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Human Resources Audit Trail</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase">
                  3NF Security Log
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Idempotent mutation history for EMPLOYEE, JOB, DEPARTMENT, and JOBHISTORY
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {audits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No recent audit trail entries logged for Human Resources entities.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">LOG #</th>
                    <th className="px-3.5 py-2.5">ACTION</th>
                    <th className="px-3.5 py-2.5">ENTITY</th>
                    <th className="px-3.5 py-2.5">KEY</th>
                    <th className="px-3.5 py-2.5">ACTOR</th>
                    <th className="px-3.5 py-2.5">TIMESTAMP</th>
                    <th className="px-3.5 py-2.5">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {audits.map((a) => {
                    const isAdd = a.action === 'ADD';
                    const isEdit = a.action === 'EDIT';
                    const isDelete = a.action === 'DELETE';
                    const isRestore = a.action === 'RESTORE';

                    return (
                      <tr key={a.auditId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-400">
                          #{a.auditId}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                              isAdd
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isEdit
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : isDelete
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : isRestore
                                ? 'bg-[#041a24]/10 text-[#041a24] dark:bg-slate-800 dark:text-slate-200'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {a.action}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {a.tableName}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-slate-100">
                          {a.recordKey}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          {a.actionBy}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {a.actionAt}
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500 max-w-xs truncate">
                          {a.newValues || a.oldValues || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-slate-50/50 dark:bg-slate-850/50 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Tamper-evident audit trail permanently logged in database</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
