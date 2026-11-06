'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Receipt,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Clock,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RightSideKpiPanel, type KpiCardItem } from '@/components/ui/RightSideKpiPanel';
import { RecordPaymentModal } from './RecordPaymentModal';
import { formatPHP } from '@/lib/utils';
import type {
  PaymentLedgerItem,
  SaleForPaymentOption,
  PaymentAuditItem,
} from '@/lib/data/payments';

interface PaymentsMainViewProps {
  initialPayments: PaymentLedgerItem[];
  salesList: SaleForPaymentOption[];
  metrics: {
    totalPaymentsAmount: number;
    totalReceiptsCount: number;
    activeCount: number;
    inactiveCount: number;
    totalOutstandingBalance: number;
  };
  recentAudits?: PaymentAuditItem[];
  userRole?: string;
  nextOrPreview?: number;
}

type StatusFilter = 'active' | 'inactive' | 'all';

export function PaymentsMainView({
  initialPayments = [],
  salesList = [],
  metrics,
  recentAudits = [],
  userRole = 'admin',
  nextOrPreview = 166,
}: PaymentsMainViewProps) {
  const router = useRouter();

  const roleUpper = userRole.toUpperCase();
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(roleUpper);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    let result = initialPayments;

    // 1. Status Filter
    if (isAdmin) {
      if (statusFilter === 'active') {
        result = result.filter((p) => !p.isDeleted);
      } else if (statusFilter === 'inactive') {
        result = result.filter((p) => p.isDeleted);
      }
    } else {
      result = result.filter((p) => !p.isDeleted);
    }

    // 2. Search Query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const orMatch = p.orNo.toLowerCase().includes(q);
        const transMatch = p.transNo.toLowerCase().includes(q);
        const custMatch = p.custName.toLowerCase().includes(q);
        const dateMatch = p.payDate.includes(q);
        const stampMatch = p.stamp ? p.stamp.toLowerCase().includes(q) : false;
        return orMatch || transMatch || custMatch || dateMatch || stampMatch;
      });
    }

    return result;
  }, [initialPayments, statusFilter, searchQuery, isAdmin]);

  // Pagination calculation
  const totalItems = filteredPayments.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedPayments = useMemo(() => {
    if (pageSize === 0) return filteredPayments;
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  // Right-side KPI metrics matching KpiCardItem interface
  const kpiCards: KpiCardItem[] = useMemo(() => [
    {
      id: 'total-collections',
      title: 'TOTAL COLLECTIONS',
      value: formatPHP(metrics.totalPaymentsAmount),
      subtext: 'Sum of all received payments',
      icon: DollarSign,
    },
    {
      id: 'total-receipts',
      title: 'OFFICIAL RECEIPTS',
      value: metrics.totalReceiptsCount,
      subtext: `${metrics.activeCount} active · ${metrics.inactiveCount} inactive`,
      icon: Receipt,
    },
    {
      id: 'outstanding-receivables',
      title: 'OUTSTANDING DUE',
      value: formatPHP(metrics.totalOutstandingBalance),
      subtext: 'Uncollected balance on sales',
      icon: TrendingUp,
    },
    {
      id: 'reconciliation',
      title: 'RECONCILIATION',
      value: '100% Synced',
      subtext: 'Balance = Sale Total - Payments',
      icon: FileCheck2,
    },
  ], [metrics.totalPaymentsAmount, metrics.totalReceiptsCount, metrics.activeCount, metrics.inactiveCount, metrics.totalOutstandingBalance]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Row with Title and Role Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Payments Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Section 3.9 &bull; Track customer payments, official receipts, and balance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-[#041a24]/10 text-[#041a24] border-[#041a24]/20 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            {roleUpper}
          </span>
        </div>
      </div>

      {/* Main Dual-Column Layout: Left Table Stream (70%) + Right Stat Bar (30%) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Payments Table */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status Filter Tabs (Admin only) */}
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Active ({metrics.activeCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('inactive');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Inactive ({metrics.inactiveCount})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All ({metrics.totalReceiptsCount})
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Right Controls: Search & Record Payment Button (#001A2B) */}
            <div className="flex items-center gap-2 flex-1 md:justify-end">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search payments (OR#, Trans#, Customer)..."
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsRecordOpen(true)}
                className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Record Payment</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th scope="col" className="px-3.5 py-3 font-mono">OR NO</th>
                    <th scope="col" className="px-3.5 py-3 font-mono">PAY DATE</th>
                    <th scope="col" className="px-3.5 py-3 font-mono">AMOUNT</th>
                    <th scope="col" className="px-3.5 py-3 font-mono">TRANS NO</th>
                    <th scope="col" className="px-3.5 py-3">CUSTOMER</th>
                    <th scope="col" className="px-3.5 py-3 font-mono">SALE TOTAL</th>
                    <th scope="col" className="px-3.5 py-3 font-mono">BALANCE</th>
                    {isAdmin && <th scope="col" className="px-3.5 py-3">STATUS</th>}
                    {isAdmin && <th scope="col" className="px-3.5 py-3">STAMP</th>}
                    <th scope="col" className="px-3.5 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 10 : 8} className="px-4 py-12 text-center text-slate-400">
                        <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-medium text-slate-600 dark:text-slate-300">No payments found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {searchQuery ? 'Try clearing your search query.' : 'No payment records exist.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((item) => {
                      const isDeleted = item.isDeleted;
                      const isSettled = item.balance <= 0.001;

                      return (
                        <tr
                          key={item.orNo}
                          className={`transition-colors ${
                            isDeleted
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* OR NO */}
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.orNo}
                          </td>

                          {/* PAY DATE */}
                          <td className="px-3.5 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {item.payDate}
                          </td>

                          {/* AMOUNT */}
                          <td className="px-3.5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatPHP(item.amount)}
                          </td>

                          {/* TRANS NO */}
                          <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <Link
                              href={`/sales?query=${item.transNo}`}
                              className="text-[#041a24] dark:text-slate-200 hover:text-[#0b2b3b] dark:hover:text-white font-semibold hover:underline inline-flex items-center gap-1"
                            >
                              <span>{item.transNo}</span>
                            </Link>
                          </td>

                          {/* CUSTOMER */}
                          <td className="px-3.5 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={item.custName}>
                            {item.custName}
                          </td>

                          {/* SALE TOTAL */}
                          <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatPHP(item.saleTotal)}
                          </td>

                          {/* OUTSTANDING BALANCE: Balance = Sale Total - Sum(Payments) */}
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                                Settled (₱0.00)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                                Due {formatPHP(item.balance)}
                              </span>
                            )}
                          </td>

                          {/* STATUS (Admin only) */}
                          {isAdmin && (
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {isDeleted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                                  Inactive
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                                  Active
                                </span>
                              )}
                            </td>
                          )}

                          {/* STAMP (Admin only) */}
                          {isAdmin && (
                            <td className="px-3.5 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {item.stamp || '—'}
                            </td>
                          )}

                          {/* ACTIONS */}
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <Link
                              href={`/receipts/${item.orNo}`}
                              target="_blank"
                              className="px-2.5 py-1 text-xs rounded border border-[#041a24]/20 dark:border-slate-700 bg-[#041a24]/5 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 hover:bg-[#041a24]/10 dark:hover:bg-slate-750 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Receipt</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  Showing{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {safePage === 1 ? 1 : (safePage - 1) * effectivePageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {Math.min(safePage * effectivePageSize, totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {totalItems}
                  </span>{' '}
                  receipts
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-mono text-[11px]">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stat Bar w/ Audit (30% width) */}
        <aside className="w-full xl:w-[248px] shrink-0 space-y-4">
          <RightSideKpiPanel
            title="Payments Stats Bar"
            subtitle="LIVE"
            cards={kpiCards}
          />
        </aside>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        salesList={salesList}
        nextOrPreview={nextOrPreview}
      />
    </div>
  );
}
