'use client';

import React, { useState, useMemo, useTransition, useDeferredValue, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  DollarSign,
  Layers,
  Plus,
  History,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
} from 'lucide-react';
import { deleteSaleAction, restoreSaleAction } from '@/app/actions/sales';
import { RightSideKpiPanel, type KpiCardItem } from '@/components/ui/RightSideKpiPanel';
import dynamic from 'next/dynamic';
import { SalesSearchInput } from './SalesSearchInput';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NewSaleModal = dynamic<any>(
  () => import('./NewSaleModal').then((m) => m.NewSaleModal),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditSaleModal = dynamic<any>(
  () => import('./EditSaleModal').then((m) => m.EditSaleModal),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SaleDetailsModal = dynamic<any>(
  () => import('./SaleDetailsModal').then((m) => m.SaleDetailsModal),
  { ssr: false }
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SalesAuditModal = dynamic<any>(
  () => import('./SalesAuditModal').then((m) => m.SalesAuditModal),
  { ssr: false }
);
import { formatPHP } from '@/lib/utils';
import type {
  SaleItem,
  SaleDetailLineItem,
  SalesMetrics,
  SalesLookupData,
  SalesAuditItem,
} from '@/lib/data/sales';

interface SalesMainViewProps {
  initialSales: SaleItem[];
  initialLines: SaleDetailLineItem[];
  metrics: SalesMetrics;
  lookups: SalesLookupData;
  recentAudits?: SalesAuditItem[];
  userRole?: string;
  userRights?: string[];
  initialOpenNewSale?: boolean;
}

type StatusFilter = 'active' | 'inactive' | 'all';

export function SalesMainView({
  initialSales = [],
  initialLines = [],
  metrics,
  lookups,
  recentAudits = [],
  userRole = 'sales',
  userRights = [],
  initialOpenNewSale = false,
}: SalesMainViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const roleUpper = userRole.toUpperCase();
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';
  const canAddSale = isAdmin || userRights.includes('add_sale');
  const canEditSale = isAdmin || userRights.includes('edit_sale');
  const canDeleteSale = isAdmin || userRights.includes('delete_sale');
  const canViewSaleDetails = isAdmin || userRights.includes('view_sale_details');

  // Status Filter: Active, Inactive, All (Admin only per Figures 23 & 27)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(initialOpenNewSale);
  const [editingSale, setEditingSale] = useState<SaleItem | null>(null);
  const [detailsSale, setDetailsSale] = useState<SaleItem | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleItem | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ========================================================================
  // FILTERING
  // ========================================================================
  const filteredSales = useMemo(() => {
    let list = initialSales;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((s) => !s.isDeleted);
      } else if (statusFilter === 'inactive') {
        list = list.filter((s) => s.isDeleted);
      }
    } else {
      // In User view, only active sales are shown (Figure 27)
      list = list.filter((s) => !s.isDeleted);
    }

    const q = deferredQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        return (
          s.transNo.toLowerCase().includes(q) ||
          s.salesDate.toLowerCase().includes(q) ||
          s.custNo.toLowerCase().includes(q) ||
          s.custName.toLowerCase().includes(q) ||
          s.empNo.toLowerCase().includes(q) ||
          s.empName.toLowerCase().includes(q) ||
          (s.stamp && s.stamp.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [initialSales, statusFilter, deferredQuery, isAdmin]);

  // Pagination calculation
  const totalItems = filteredSales.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedSales = useMemo(() => {
    if (pageSize === 0) return filteredSales;
    const start = (safePage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, safePage, pageSize]);

  // Counts for status filter pills
  const activeCount = useMemo(() => initialSales.filter((s) => !s.isDeleted).length, [initialSales]);
  const inactiveCount = useMemo(() => initialSales.filter((s) => s.isDeleted).length, [initialSales]);
  const totalCount = initialSales.length;

  // ========================================================================
  // ACTIONS: SOFT-DELETE & RESTORE
  // ========================================================================
  const handleConfirmDelete = async () => {
    if (!deletingSale) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteSaleAction(deletingSale.transNo);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingSale(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to soft-delete sale.');
      setIsSubmitting(false);
    }
  };

  const handleRestoreSale = async (sale: SaleItem) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await restoreSaleAction(sale.transNo);
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
      setActionError('Failed to restore sale.');
      setIsSubmitting(false);
    }
  };

  // ========================================================================
  // RIGHT-SIDE KPI PANEL DEDICATED TO SALES
  // ========================================================================
  const statBarCards: KpiCardItem[] = useMemo(
    () => [
      {
        id: 'total-sales',
        title: 'TOTAL SALES',
        value: metrics.totalSales,
        subtext: `${metrics.activeSales} active · ${metrics.inactiveSales} inactive`,
        icon: ShoppingBag,
        onClick: () => setIsAuditModalOpen(true),
        clickable: true,
      },
      {
        id: 'total-revenue',
        title: 'TOTAL REVENUE',
        value: formatPHP(metrics.totalRevenue),
        subtext: 'Calculated from lines',
        icon: DollarSign,
        onClick: () => setIsAuditModalOpen(true),
        clickable: true,
      },
      {
        id: 'total-lines',
        title: 'LINE ITEMS',
        value: metrics.totalLines,
        subtext: `${metrics.activeLines} active line items`,
        icon: Layers,
      },
    ],
    [metrics]
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Row with Title and Role */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Sales Management
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Section 3.6: Sales transactions (header) and product line items (detail lines).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>Audit Trail</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold uppercase rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-[#041a24] dark:text-slate-300" />
            <span>{roleUpper}</span>
          </div>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs underline hover:no-underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area: Left Table & Right Stat Bar */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Sales CRUD Table */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controls Bar (Filter Tabs, Search, Add Button) matching Figures 23 & 27 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status Filter Tabs (Figure 23 - Admin only) */}
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-md text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('active');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-white dark:bg-slate-700 text-[#041a24] dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('inactive');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
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

            {/* Right Controls: Search bar + New Sale button */}
            <div className="flex items-center gap-2 flex-1 md:justify-end">
              <SalesSearchInput
                query={searchQuery}
                onQueryChange={setSearchQuery}
                resetPage={() => setCurrentPage(1)}
              />

              {canAddSale && (
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Sale</span>
                </button>
              )}
            </div>
          </div>

          {/* Master Sales Table (Figure 23 & 27) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3">TRANS NO</th>
                    <th className="px-3.5 py-3">SALES DATE</th>
                    <th className="px-3.5 py-3">CUSTOMER</th>
                    <th className="px-3.5 py-3">EMPLOYEE</th>
                    <th className="px-3.5 py-3">TOTAL</th>
                    {isAdmin && <th className="px-3.5 py-3">STATUS</th>}
                    {isAdmin && <th className="px-3.5 py-3">STAMP</th>}
                    <th className="px-3.5 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 8 : 6}
                        className="px-4 py-8 text-center text-xs text-slate-400"
                      >
                        No sales transactions match the current filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale) => {
                      const isDeleted = sale.isDeleted;
                      return (
                        <tr
                          key={sale.transNo}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isDeleted ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75' : ''
                          }`}
                        >
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {sale.transNo}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {sale.salesDate}
                          </td>
                          <td className="px-3.5 py-3 text-slate-800 dark:text-slate-200">
                            <span className="font-mono text-slate-500 mr-1.5">{sale.custNo}</span>
                            &mdash; {sale.custName}
                          </td>
                          <td className="px-3.5 py-3 text-slate-800 dark:text-slate-200">
                            <span className="font-mono text-slate-500 mr-1.5">{sale.empNo}</span>
                            &mdash; {sale.empName}
                          </td>
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {/* Deleted sale shows $0.00 as specified in 3.6 */}
                            {formatPHP(sale.totalAmount)}
                          </td>

                          {isAdmin && (
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium font-sans ${
                                  isDeleted
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {sale.status}
                              </span>
                            </td>
                          )}

                          {isAdmin && (
                            <td className="px-3.5 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {sale.stamp || '—'}
                            </td>
                          )}

                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Details Button opens SaleDetailsModal (Figures 25 & 26) */}
                              {canViewSaleDetails && (
                                <button
                                  type="button"
                                  onClick={() => setDetailsSale(sale)}
                                  className="px-2.5 py-1 text-xs rounded border border-[#041a24]/20 dark:border-slate-700 bg-[#041a24]/5 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 hover:bg-[#041a24]/10 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer font-medium"
                                >
                                  Details
                                </button>
                              )}

                              {!isDeleted ? (
                                <>
                                  {canEditSale && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingSale(sale)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDeleteSale && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingSale(sale)}
                                      className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              ) : (
                                isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreSale(sale)}
                                    disabled={isSubmitting}
                                    className="px-2.5 py-1 text-xs rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Restore</span>
                                  </button>
                                )
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

            {/* Pagination / Table Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={0}>All ({totalItems})</option>
                </select>
                <span className="ml-2 font-mono text-[11px]">
                  Showing {totalItems === 0 ? 0 : (safePage - 1) * (pageSize || totalItems) + 1}&ndash;
                  {pageSize === 0 ? totalItems : Math.min(safePage * pageSize, totalItems)} of {totalItems}
                </span>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-mono">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stat Bar Dashboard dedicated to Sales */}
        <aside className="w-full xl:w-[248px] shrink-0 space-y-3">
          <RightSideKpiPanel
            title="Sales Stats Bar"
            subtitle="LIVE"
            cards={statBarCards}
          />

          {/* Next ID Sequence Card (matching Image 2 bottom box) */}
          <div className="rounded-[12px] border border-[#041a24]/15 dark:border-slate-800 bg-[#041a24]/5 dark:bg-slate-800/50 p-3 text-xs font-sans">
            <div className="flex items-center gap-1.5 text-[#041a24] dark:text-slate-200 font-semibold mb-1">
              <Info className="w-3.5 h-3.5" />
              <span>Next ID Sequence</span>
            </div>
            <div className="font-mono text-sm font-bold text-[#041a24] dark:text-slate-100 mt-1">
              Auto-assigned: {metrics.nextSuggestedTransNo}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Primary key strictly follows the canonical schema pattern (VARCHAR(8)).
            </p>
          </div>
        </aside>
      </div>

      {/* Soft Delete Confirmation Modal */}
      {deletingSale && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-5 shadow-2xl font-sans">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Soft Delete
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Are you sure you want to mark sale transaction{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {deletingSale.transNo}
              </span>{' '}
              as <span className="font-bold text-rose-600">Inactive</span>?
              Its total will show as $0.00 until restored.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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

      {/* New Sale Modal (Figure 24) */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        nextSuggestedTransNo={metrics.nextSuggestedTransNo}
        lookups={lookups}
      />

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          isOpen={Boolean(editingSale)}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
          lookups={lookups}
        />
      )}

      {/* Sale Details Modal (Figures 25 & 26) */}
      {detailsSale && (
        <SaleDetailsModal
          isOpen={Boolean(detailsSale)}
          onClose={() => setDetailsSale(null)}
          sale={detailsSale}
          lines={initialLines}
          products={lookups.products}
          userRole={userRole}
        />
      )}

      {/* Sales Audit Modal */}
      <SalesAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        audits={recentAudits}
      />
    </div>
  );
}
