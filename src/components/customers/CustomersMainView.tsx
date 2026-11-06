'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RightSideKpiPanel, type KpiCardItem } from '@/components/ui/RightSideKpiPanel';
import { AddCustomerModal } from './AddCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { deleteCustomerAction, restoreCustomerAction } from '@/app/actions/customers';
import type { CustomerItem, CustomerMetrics, CustomerAuditLogItem } from '@/lib/data/customers';
import {
  Search,
  UserPlus,
  RotateCcw,
  Users,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
} from 'lucide-react';

interface CustomersMainViewProps {
  initialCustomers: CustomerItem[];
  metrics: CustomerMetrics;
  recentAudits?: CustomerAuditLogItem[];
  userRole?: string;
  userRights?: string[];
}

export function CustomersMainView({
  initialCustomers,
  metrics,
  recentAudits = [],
  userRole = 'admin',
  userRights = [],
}: CustomersMainViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const roleUpper = userRole.toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN';
  const canAdd = isAdmin || userRights.includes('add_customer');
  const canEdit = isAdmin || userRights.includes('edit_customer');
  const canDelete = isAdmin || userRights.includes('delete_customer');
  const canModify = canAdd || canEdit || canDelete;

  // Status Filter: 'active' | 'inactive' | 'all'
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTab, setAuditTab] = useState<'roster' | 'logs'>('roster');

  // Action status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Format display for payment terms (Net 30, Net 45, COD)
  const formatPayTermDisplay = (term: string) => {
    const t = (term || '').trim().toUpperCase();
    if (t === '30D' || t === 'NET 30') return 'Net 30';
    if (t === '45D' || t === 'NET 45') return 'Net 45';
    if (t === 'COD') return 'COD';
    return term || 'COD';
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let result = initialCustomers;

    // For User role, strictly filter to Active records (Figure 10)
    if (!isAdmin) {
      result = result.filter((c) => !c.isDeleted);
    } else {
      // 1. Status Filter (Admin / Superadmin only)
      if (statusFilter === 'active') {
        result = result.filter((c) => !c.isDeleted);
      } else if (statusFilter === 'inactive') {
        result = result.filter((c) => c.isDeleted);
      }
    }

    // 2. Search Query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        const custNoMatch = c.custNo.toLowerCase().includes(q);
        const nameMatch = c.custName.toLowerCase().includes(q);
        const addrMatch = c.address.toLowerCase().includes(q);
        const termMatch = c.payterm.toLowerCase().includes(q) || formatPayTermDisplay(c.payterm).toLowerCase().includes(q);
        const stampMatch = c.stamp ? c.stamp.toLowerCase().includes(q) : false;
        return custNoMatch || nameMatch || addrMatch || termMatch || stampMatch;
      });
    }

    return result;
  }, [initialCustomers, statusFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedCustomers = useMemo(() => {
    if (pageSize === 0) return filteredCustomers;
    const start = (safePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safePage, pageSize]);

  // Handle Soft Delete
  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteCustomerAction(deletingCustomer.custNo);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingCustomer(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to soft-delete customer.');
      setIsSubmitting(false);
    }
  };

  // Handle Restore
  const handleRestore = async (customer: CustomerItem) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await restoreCustomerAction(customer.custNo);
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
      setActionError('Failed to restore customer.');
      setIsSubmitting(false);
    }
  };

  // Right-Side Dashboard Stat Bar KPI Cards (Image 2 style)
  // Strictly showing "TOTAL REGISTERED" w/ audit as requested
  const statBarCards: KpiCardItem[] = useMemo(() => [
    {
      id: 'total-registered',
      title: 'TOTAL REGISTERED',
      value: metrics.totalCustomers,
      subtext: `${metrics.activeCount} active · ${metrics.inactiveCount} inactive`,
      icon: Users,
      onClick: () => setIsAuditModalOpen(true),
      clickable: true,
    },
  ], [metrics.totalCustomers, metrics.activeCount, metrics.inactiveCount]);

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Role */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Customer Management
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Canonical 3NF module managing company client entities, address directory, and credit terms.
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

      {/* Main Content Area: Left Table & Right Stat Bar (Image 2 style) */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Customer CRUD Table */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controls Bar (Filter Tabs, Search, Add Button) strictly following Figure 3.3 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status Filter Tabs (Item 1 in Fig 3.3 - Admin only) */}
            {isAdmin && (
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
                  All ({metrics.totalCustomers})
                </button>
              </div>
            )}

            {/* Right Controls: Search Input & Add Button (Items 2 & 3 in Fig 3.3) */}
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
                  placeholder="Search customers..."
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
                />
              </div>

              {canAdd && (
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Customer</span>
                </button>
              )}
            </div>
          </div>

          {/* Customer Table Container */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th scope="col" className="px-4 py-3 font-mono">CUST NO</th>
                    <th scope="col" className="px-4 py-3">CUSTOMER NAME</th>
                    <th scope="col" className="px-4 py-3">ADDRESS</th>
                    <th scope="col" className="px-4 py-3">PAY TERMS</th>
                    {isAdmin && <th scope="col" className="px-4 py-3">STATUS</th>}
                    {isAdmin && <th scope="col" className="px-4 py-3">STAMP</th>}
                    <th scope="col" className="px-4 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className="px-4 py-12 text-center text-slate-400">
                        <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-medium text-slate-600 dark:text-slate-300">No customers found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {searchQuery ? 'Try clearing your search query.' : 'No customers exist in this category.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((cust) => {
                      const isDeleted = cust.isDeleted;
                      return (
                        <tr
                          key={cust.custNo}
                          className={`transition-colors ${
                            isDeleted
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* CUST NO */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {cust.custNo}
                          </td>

                          {/* CUSTOMER NAME */}
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            <span className={isDeleted ? 'line-through text-slate-500' : ''}>
                              {cust.custName}
                            </span>
                          </td>

                          {/* ADDRESS */}
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={cust.address}>
                            {cust.address}
                          </td>

                          {/* PAY TERMS */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {formatPayTermDisplay(cust.payterm)}
                            </span>
                          </td>

                          {/* STATUS (Item 4 in Fig 3.3 - Admin only) */}
                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap">
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

                          {/* STAMP (Item 5 in Fig 3.3 - Admin only) */}
                          {isAdmin && (
                            <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {cust.stamp || '—'}
                            </td>
                          )}

                          {/* ACTIONS (Figure 9 & Figure 10) */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {!isDeleted ? (
                                <>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingCustomer(cust)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingCustomer(cust)}
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
                                    onClick={() => handleRestore(cust)}
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#041a24]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={0}>All ({totalItems})</option>
                </select>
                <span className="ml-2 font-mono text-[11px]">
                  Showing {totalItems === 0 ? 0 : (safePage - 1) * (pageSize || totalItems) + 1}–
                  {pageSize === 0 ? totalItems : Math.min(safePage * pageSize, totalItems)} of {totalItems}
                </span>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750"
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
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-750"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Stat Bar Dashboard looking boxes (Image 2 style) */}
        {/* Only showing Total Registered w/ audit as explicitly requested */}
        <aside className="w-full xl:w-[248px] shrink-0">
          <RightSideKpiPanel
            title="Customer Stats Bar"
            subtitle="LIVE"
            cards={statBarCards}
          />
        </aside>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        nextSuggestedCustNo={metrics.nextSuggestedCustNo}
      />

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          isOpen={Boolean(editingCustomer)}
          onClose={() => setEditingCustomer(null)}
          customer={editingCustomer}
        />
      )}

      {/* Soft Delete Confirmation Modal */}
      {deletingCustomer && (
        <Modal
          isOpen={Boolean(deletingCustomer)}
          onClose={() => setDeletingCustomer(null)}
          title="Soft-Delete Customer"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Soft Deletion & Referential Integrity</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                In compliance with Hope ERP relational architecture (Section 3.3), this will flag customer{' '}
                <span className="font-mono font-bold">#{deletingCustomer.custNo}</span> as{' '}
                <span className="font-bold">Inactive</span> (<code>is_deleted = 1</code>).
              </p>
              <p className="text-[11px] leading-relaxed">
                Zero data loss: Historical sales and invoices remain 100% intact and will not trigger foreign key constraint errors. You can restore this record at any time.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p><span className="text-slate-500">Customer:</span> <span className="font-semibold">{deletingCustomer.custName}</span></p>
              <p><span className="text-slate-500">Address:</span> <span>{deletingCustomer.address}</span></p>
              <p><span className="text-slate-500">Terms:</span> <span>{formatPayTermDisplay(deletingCustomer.payterm)}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingCustomer(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Soft Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Audit Trail & Total Registered Audit Modal */}
      {isAuditModalOpen && (
        <Modal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          title="Total Registered Customers Audit"
          maxWidth="3xl"
        >
          <div className="space-y-4 font-sans text-xs">
            {/* Top Summary Card */}
            <div className="p-4 rounded-lg bg-[#041a24] dark:bg-surface-2 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Registered Commercial Accounts
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {metrics.totalCustomers} Commercial Clients
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">{metrics.activeCount} Active</span>
                  <span>&bull;</span>
                  <span className="text-rose-400 font-semibold">{metrics.inactiveCount} Inactive</span>
                </div>
              </div>
              <div className="text-left sm:text-right sm:border-l sm:border-white/10 sm:pl-4">
                <div className="text-[11px] font-mono text-slate-300">Credit Terms Breakdown</div>
                <div className="text-xs font-mono text-white mt-1 space-y-0.5">
                  <div>Net 30: <span className="font-bold">{metrics.termCounts['30D'] || 0}</span></div>
                  <div>Net 45: <span className="font-bold">{metrics.termCounts['45D'] || 0}</span></div>
                  <div>COD: <span className="font-bold">{metrics.termCounts['COD'] || 0}</span></div>
                </div>
              </div>
            </div>

            {/* Audit View Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuditTab('roster')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditTab === 'roster'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                  Directory Roster ({initialCustomers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditTab('logs')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditTab === 'logs'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  <History className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                  System Audit Logs ({recentAudits.length})
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Next ID: {metrics.nextSuggestedCustNo}
              </span>
            </div>

            {/* Tab 1: Directory Roster */}
            {auditTab === 'roster' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-[10px] font-mono text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">CUST NO</th>
                        <th className="py-2 px-3">NAME</th>
                        <th className="py-2 px-3">PAY TERM</th>
                        <th className="py-2 px-3">STATUS</th>
                        <th className="py-2 px-3">AUDIT STAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {initialCustomers.map((c) => (
                        <tr key={c.custNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold">{c.custNo}</td>
                          <td className="py-2 px-3 font-medium">{c.custName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {formatPayTermDisplay(c.payterm)}
                          </td>
                          <td className="py-2 px-3">
                            {c.isDeleted ? (
                              <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                Inactive
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                            {c.stamp || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: System Audit Logs */}
            {auditTab === 'logs' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-md p-3">
                {recentAudits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Clock className="h-6 w-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    No recent mutation log entries found in <code>audit_log</code> table.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {recentAudits.map((a) => (
                      <div key={a.auditId} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                a.action === 'ADD'
                                  ? 'bg-[#041a24]/10 text-[#041a24] dark:bg-slate-800 dark:text-slate-200'
                                  : a.action === 'EDIT'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : a.action === 'DELETE'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {a.action}
                            </span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {a.recordKey}
                            </span>
                            <span className="text-slate-400 text-[11px]">by {a.actionBy}</span>
                          </div>
                          {a.newValues && (
                            <p className="text-[10px] text-slate-500 font-mono truncate max-w-lg">
                              {a.newValues}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {a.actionAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAuditModalOpen(false)}
              >
                Close Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
