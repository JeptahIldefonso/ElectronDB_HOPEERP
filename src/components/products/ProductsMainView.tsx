'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RightSideKpiPanel, type KpiCardItem } from '@/components/ui/RightSideKpiPanel';
import { PriceHistoryModal } from './PriceHistoryModal';
import { AddProductModal } from './AddProductModal';
import { EditProductModal } from './EditProductModal';
import { deleteProductAction, restoreProductAction } from '@/app/actions/products';
import { formatPHP } from '@/lib/utils';
import type { ProductItem, PriceRecordItem, ProductsMetrics, ProductAuditLogItem } from '@/lib/data/products';
import {
  Search,
  Plus,
  Package,
  RotateCcw,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  DollarSign,
} from 'lucide-react';

interface ProductsMainViewProps {
  initialProducts: ProductItem[];
  initialPriceHistory: PriceRecordItem[];
  metrics: ProductsMetrics;
  recentAudits?: ProductAuditLogItem[];
  userRole?: string;
  userRights?: string[];
}

export function ProductsMainView({
  initialProducts,
  initialPriceHistory,
  metrics,
  recentAudits = [],
  userRole = 'admin',
  userRights = [],
}: ProductsMainViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const roleUpper = userRole.toUpperCase();
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(roleUpper);
  const canAddProduct = isAdmin || userRights.includes('add_product');
  const canEditProduct = isAdmin || userRights.includes('edit_product');
  const canDeleteProduct = isAdmin || userRights.includes('delete_product');

  // Status Filter: 'active' | 'inactive' | 'all'
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [pricingProduct, setPricingProduct] = useState<ProductItem | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditTab, setAuditTab] = useState<'roster' | 'logs'>('roster');

  // Action status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let result = initialProducts;

    // 1. Status Filter
    if (isAdmin) {
      if (statusFilter === 'active') {
        result = result.filter((p) => !p.isDeleted);
      } else if (statusFilter === 'inactive') {
        result = result.filter((p) => p.isDeleted);
      }
    } else {
      // In standard user view, only active products are visible
      result = result.filter((p) => !p.isDeleted);
    }

    // 2. Search Query Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((p) => {
        const codeMatch = p.prodCode.toLowerCase().includes(q);
        const descMatch = p.description.toLowerCase().includes(q);
        const unitMatch = p.unit.toLowerCase().includes(q);
        const priceMatch = p.currentPrice != null ? String(p.currentPrice).includes(q) : false;
        const stampMatch = p.stamp ? p.stamp.toLowerCase().includes(q) : false;
        return codeMatch || descMatch || unitMatch || priceMatch || stampMatch;
      });
    }

    return result;
  }, [initialProducts, statusFilter, searchQuery, isAdmin]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedProducts = useMemo(() => {
    if (pageSize === 0) return filteredProducts;
    const start = (safePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safePage, pageSize]);

  // Handle Soft Delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteProductAction(deletingProduct.prodCode);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingProduct(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to soft-delete product.');
      setIsSubmitting(false);
    }
  };

  // Handle Restore
  const handleRestore = async (product: ProductItem) => {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await restoreProductAction(product.prodCode);
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
      setActionError('Failed to restore product.');
      setIsSubmitting(false);
    }
  };

  // Right-Side Dashboard Stat Bar (matching Image 2 style)
  // strictly showing "TOTAL PRODUCTS" w/ audit similar to Customer module
  const statBarCards: KpiCardItem[] = useMemo(() => [
    {
      id: 'total-products',
      title: 'TOTAL PRODUCTS',
      value: metrics.totalProducts,
      subtext: `${metrics.activeCount} active · ${metrics.inactiveCount} inactive`,
      icon: Package,
      onClick: () => setIsAuditModalOpen(true),
      clickable: true,
    },
  ], [metrics.totalProducts, metrics.activeCount, metrics.inactiveCount]);

  return (
    <div className="space-y-6">
      {/* Top Header Row with Title and Role */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Product Management
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Canonical 3NF module managing product catalog entities and historical unit price schedules (Figure 3.4).
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

      {/* Main Content Area: Left Table & Right Stat Bar */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Product CRUD Table */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controls Bar (Filter Tabs, Search, Add Button) matching Figure 3.4 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status Filter Tabs (Figure 3.4) */}
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
                  All ({metrics.totalProducts})
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Right Controls: Search Input & Add Button */}
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
                  placeholder="Search products..."
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
                />
              </div>

              {canAddProduct && (
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Product</span>
                </button>
              )}
            </div>
          </div>

          {/* Product Table Container */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th scope="col" className="px-4 py-3 font-mono">PROD CODE</th>
                    <th scope="col" className="px-4 py-3">DESCRIPTION</th>
                    <th scope="col" className="px-4 py-3 font-mono">UNIT</th>
                    <th scope="col" className="px-4 py-3 font-mono">CURRENT PRICE</th>
                    {isAdmin && <th scope="col" className="px-4 py-3">STATUS</th>}
                    {isAdmin && <th scope="col" className="px-4 py-3">STAMP</th>}
                    <th scope="col" className="px-4 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className="px-4 py-12 text-center text-slate-400">
                        <Package className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-medium text-slate-600 dark:text-slate-300">No products found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {searchQuery ? 'Try clearing your search query.' : 'No products exist in this category.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((prod) => {
                      const isDeleted = prod.isDeleted;
                      return (
                        <tr
                          key={prod.prodCode}
                          className={`transition-colors ${
                            isDeleted
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* PROD CODE */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {prod.prodCode}
                          </td>

                          {/* DESCRIPTION */}
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                            <span className={isDeleted ? 'line-through text-slate-500' : ''}>
                              {prod.description}
                            </span>
                          </td>

                          {/* UNIT */}
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {prod.unit}
                          </td>

                          {/* CURRENT PRICE (Section 3.4) */}
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {prod.currentPrice != null ? formatPHP(prod.currentPrice) : '—'}
                          </td>

                          {/* STATUS (Figure 3.4) */}
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

                          {/* STAMP (Figure 3.4) */}
                          {isAdmin && (
                            <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {prod.stamp || '—'}
                            </td>
                          )}

                          {/* ACTIONS */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Prices button (Figure 12 & 13) */}
                              <button
                                type="button"
                                onClick={() => setPricingProduct(prod)}
                                className="px-2.5 py-1 text-xs rounded border border-[#041a24]/20 dark:border-slate-700 bg-[#041a24]/5 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 hover:bg-[#041a24]/10 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer font-medium"
                              >
                                Prices
                              </button>

                              {!isDeleted ? (
                                <>
                                  {canEditProduct && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingProduct(prod)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDeleteProduct && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingProduct(prod)}
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
                                    onClick={() => handleRestore(prod)}
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

        {/* Right Column: Stat Bar Dashboard looking box (Image 2 style) */}
        {/* Strictly showing "TOTAL PRODUCTS" w/ audit similar to Customer module */}
        <aside className="w-full xl:w-[248px] shrink-0">
          <RightSideKpiPanel
            title="Product Stats Bar"
            subtitle="LIVE"
            cards={statBarCards}
          />
        </aside>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        nextSuggestedProdCode={metrics.nextSuggestedProdCode}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
        />
      )}

      {/* Price History Modal (Figure 12 & 13) */}
      {pricingProduct && (
        <PriceHistoryModal
          isOpen={Boolean(pricingProduct)}
          onClose={() => setPricingProduct(null)}
          product={pricingProduct}
          priceRecords={initialPriceHistory}
          userRole={userRole}
        />
      )}

      {/* Soft Delete Confirmation Modal */}
      {deletingProduct && (
        <Modal
          isOpen={Boolean(deletingProduct)}
          onClose={() => setDeletingProduct(null)}
          title="Soft-Delete Product"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Soft Deletion & Relational Integrity</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                In compliance with Hope ERP relational architecture (Section 3.4), this will flag product{' '}
                <span className="font-mono font-bold">#{deletingProduct.prodCode}</span> as{' '}
                <span className="font-bold">Inactive</span> (<code>is_deleted = 1</code>).
              </p>
              <p className="text-[11px] leading-relaxed">
                Zero data loss: Historical sales line items and previous price entries remain 100% intact. You can restore this catalog item at any time.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p><span className="text-slate-500">Code:</span> <span className="font-semibold font-mono">{deletingProduct.prodCode}</span></p>
              <p><span className="text-slate-500">Description:</span> <span>{deletingProduct.description}</span></p>
              <p><span className="text-slate-500">Unit:</span> <span>{deletingProduct.unit}</span></p>
              <p><span className="text-slate-500">Current Price:</span> <span>{deletingProduct.currentPrice != null ? formatPHP(deletingProduct.currentPrice) : '—'}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingProduct(null)}
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

      {/* Total Registered Products Audit Modal */}
      {isAuditModalOpen && (
        <Modal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          title="Total Registered Products Audit"
          maxWidth="3xl"
        >
          <div className="space-y-4 font-sans text-xs">
            {/* Top Summary Card */}
            <div className="p-4 rounded-lg bg-[#041a24] dark:bg-surface-2 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Registered Catalog Items
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {metrics.totalProducts} Catalog Products
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">{metrics.activeCount} Active</span>
                  <span>&bull;</span>
                  <span className="text-rose-400 font-semibold">{metrics.inactiveCount} Inactive</span>
                </div>
              </div>
              <div className="text-left sm:text-right sm:border-l sm:border-white/10 sm:pl-4">
                <div className="text-[11px] font-mono text-slate-300">Total Price Records</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {metrics.totalPriceRecords} Schedules
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {Object.entries(metrics.unitCounts).map(([u, cnt]) => `${u}: ${cnt}`).join(' · ')}
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
                  Catalog Roster ({initialProducts.length})
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
                Next Suggested: {metrics.nextSuggestedProdCode}
              </span>
            </div>

            {/* Tab 1: Catalog Roster */}
            {auditTab === 'roster' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-[10px] font-mono text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">PROD CODE</th>
                        <th className="py-2 px-3">DESCRIPTION</th>
                        <th className="py-2 px-3">UNIT</th>
                        <th className="py-2 px-3">CURRENT PRICE</th>
                        <th className="py-2 px-3">STATUS</th>
                        <th className="py-2 px-3">STAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {initialProducts.map((p) => (
                        <tr key={p.prodCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold">{p.prodCode}</td>
                          <td className="py-2 px-3 font-medium">{p.description}</td>
                          <td className="py-2 px-3 font-mono">{p.unit}</td>
                          <td className="py-2 px-3 font-mono">
                            {p.currentPrice != null ? formatPHP(p.currentPrice) : '—'}
                          </td>
                          <td className="py-2 px-3">
                            {p.isDeleted ? (
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
                            {p.stamp || '—'}
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
                    No recent mutation log entries found in <code>audit_log</code> table for products or pricing.
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
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {a.tableName}
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
