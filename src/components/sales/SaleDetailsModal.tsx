'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { deleteLineItemAction, restoreLineItemAction } from '@/app/actions/sales';
import { AddLineItemModal } from './AddLineItemModal';
import { EditLineItemModal } from './EditLineItemModal';
import { formatPHP } from '@/lib/utils';
import type {
  SaleItem,
  SaleDetailLineItem,
  ProductLookupItem,
} from '@/lib/data/sales';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleItem;
  lines: SaleDetailLineItem[];
  products: ProductLookupItem[];
  userRole?: string;
}

export function SaleDetailsModal({
  isOpen,
  onClose,
  sale,
  lines,
  products,
  userRole = 'sales',
}: SaleDetailsModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';
  const canModify = !sale.isDeleted; // Cannot edit lines if entire sale is deleted

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<SaleDetailLineItem | null>(null);
  const [deletingLine, setDeletingLine] = useState<SaleDetailLineItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter lines belonging to this transaction
  const saleLines = useMemo(() => {
    return lines.filter((l) => l.transNo === sale.transNo);
  }, [lines, sale.transNo]);

  const activeCount = useMemo(() => saleLines.filter((l) => !l.isDeleted).length, [saleLines]);
  const inactiveCount = useMemo(() => saleLines.filter((l) => l.isDeleted).length, [saleLines]);
  const totalCount = saleLines.length;

  const filteredLines = useMemo(() => {
    let list = saleLines;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((l) => !l.isDeleted);
      } else if (statusFilter === 'inactive') {
        list = list.filter((l) => l.isDeleted);
      }
    } else {
      list = list.filter((l) => !l.isDeleted);
    }
    return list;
  }, [saleLines, statusFilter, isAdmin]);

  // Total calculated dynamically from active lines
  const calculatedTotal = useMemo(() => {
    return saleLines
      .filter((l) => !l.isDeleted)
      .reduce((sum, l) => sum + l.lineTotal, 0);
  }, [saleLines]);

  if (!isOpen) return null;

  const handleDeleteLine = async () => {
    if (!deletingLine) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteLineItemAction(deletingLine.transNo, deletingLine.prodCode);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingLine(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to soft-delete line item.');
      setIsSubmitting(false);
    }
  };

  const handleRestoreLine = async (line: SaleDetailLineItem) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await restoreLineItemAction(line.transNo, line.prodCode);
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
      setActionError('Failed to restore line item.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Header matching Figures 25 & 26 */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sale Details &mdash; {sale.transNo}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {sale.salesDate} &bull; {sale.custNo} &mdash; {sale.custName}
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

        {/* Controls Row: Status Filters (Admin only) + Add Line Button */}
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
              onClick={() => setIsAddLineOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#001A2B] hover:bg-[#00263E] text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Line</span>
            </button>
          )}
        </div>

        {/* Lines Table matching Figures 25 & 26 */}
        <div className="px-6 pb-4 overflow-x-auto">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">PRODUCT</th>
                  <th className="px-4 py-3">QTY</th>
                  <th className="px-4 py-3">UNIT PRICE</th>
                  <th className="px-4 py-3">LINE TOTAL</th>
                  {isAdmin && <th className="px-4 py-3">STATUS</th>}
                  {isAdmin && <th className="px-4 py-3">STAMP</th>}
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 5}
                      className="px-4 py-8 text-center text-xs text-slate-400"
                    >
                      No line items found for this sale. Click &quot;+ Add Line&quot; to add products.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line) => {
                    const isDeleted = line.isDeleted;
                    return (
                      <tr
                        key={`${line.transNo}-${line.prodCode}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isDeleted ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-70' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-400 mr-1.5">
                            {line.prodCode}
                          </span>
                          &mdash; {line.prodDesc}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {formatPHP(line.unitPrice)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatPHP(line.lineTotal)}
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
                            {line.stamp || '—'}
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
                                      onClick={() => setEditingLine(line)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingLine(line)}
                                      className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreLine(line)}
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

        {/* Footer with calculated Total matching Figures 25 & 26 */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          <div className="text-xs text-slate-500">
            {activeCount} active item{activeCount === 1 ? '' : 's'} on this sale
          </div>

          <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
            Total:{' '}
            <span className="text-[#041a24] dark:text-slate-100">
              {formatPHP(sale.isDeleted ? 0 : calculatedTotal)}
            </span>
          </div>
        </div>

        {/* Delete Line Item Confirmation */}
        {deletingLine && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-5 shadow-2xl font-sans">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Confirm Soft Delete
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Remove{' '}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {deletingLine.prodDesc}
                </span>{' '}
                from this transaction? The line will be marked Inactive and subtracted from the sale total.
              </p>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDeletingLine(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLine}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Line Modal */}
        <AddLineItemModal
          isOpen={isAddLineOpen}
          onClose={() => setIsAddLineOpen(false)}
          transNo={sale.transNo}
          salesDate={sale.salesDate}
          products={products}
        />

        {/* Edit Line Modal */}
        {editingLine && (
          <EditLineItemModal
            isOpen={Boolean(editingLine)}
            onClose={() => setEditingLine(null)}
            line={editingLine}
          />
        )}
      </div>
    </div>
  );
}
