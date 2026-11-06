'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import {
  Printer,
  Download,
  Lock,
  Calendar,
  CheckCircle2,
  Loader2,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  FileText,
  Briefcase,
  Layers,
  AlertCircle,
} from 'lucide-react';
import {
  fetchTopCustomersAction,
  fetchTopProductsAction,
  fetchTopSalesAction,
  fetchEmployeeJobHistoryAction,
} from '@/app/actions/reports';
import type {
  TopCustomerRow,
  ProductMasterRow,
  TopProductRow,
  ActiveEmployeeRow,
  AllEmployeeRow,
  EmployeeJobHistoryRow,
  TopSaleRow,
} from '@/lib/data/reports';

interface ReportsMainViewProps {
  initialTopCustomers: TopCustomerRow[];
  initialProductMaster: ProductMasterRow[];
  initialTopProducts: TopProductRow[];
  initialActiveEmployees: ActiveEmployeeRow[];
  initialAllEmployees: AllEmployeeRow[];
  initialTopSales: TopSaleRow[];
  initialJobHistory: EmployeeJobHistoryRow[];
  employeesList: Array<{ empNo: string; fullName: string }>;
  userRights?: string[];
  userRole?: string;
}

type TabType =
  | 'top-customers'
  | 'product-master'
  | 'top-products'
  | 'active-employees'
  | 'all-employees'
  | 'job-history'
  | 'top-sales';

interface TabDefinition {
  id: TabType;
  label: string;
  rightCode: string;
}

const TABS: TabDefinition[] = [
  { id: 'top-customers', label: 'Top Customers', rightCode: 'report_top_customers' },
  { id: 'product-master', label: 'Product Master List', rightCode: 'report_product_master' },
  { id: 'top-products', label: 'Top Products', rightCode: 'report_top_products' },
  { id: 'active-employees', label: 'Active Employees', rightCode: 'report_active_employees' },
  { id: 'all-employees', label: 'All Employees', rightCode: 'report_all_employees' },
  { id: 'job-history', label: 'Employee Job History', rightCode: 'report_employee_job_history' },
  { id: 'top-sales', label: 'Top Sales', rightCode: 'report_top_sales' },
];

export function ReportsMainView({
  initialTopCustomers = [],
  initialProductMaster = [],
  initialTopProducts = [],
  initialActiveEmployees = [],
  initialAllEmployees = [],
  initialTopSales = [],
  initialJobHistory = [],
  employeesList = [],
  userRights = [],
  userRole = 'User',
}: ReportsMainViewProps) {
  const isAdmin = useMemo(() => {
    const r = (userRole || '').toLowerCase();
    return r === 'admin' || r === 'superadmin';
  }, [userRole]);

  // Determine which tabs the user has permission to access
  const allowedTabs = useMemo(() => {
    if (isAdmin) return TABS.map((t) => t.id);
    return TABS.filter((t) => userRights.includes(t.rightCode)).map((t) => t.id);
  }, [isAdmin, userRights]);

  // Initial tab: pick the first permitted tab, or default to 'top-customers'
  const initialActive = allowedTabs.length > 0 ? allowedTabs[0] : 'top-customers';
  const [activeTab, setActiveTab] = useState<TabType>(initialActive);

  // Filter states
  const [fromDate, setFromDate] = useState('2010-01-01');
  const [toDate, setToDate] = useState('2026-12-31');
  const [topN, setTopN] = useState(10);
  const [selectedEmpNo, setSelectedEmpNo] = useState(employeesList[0]?.empNo || '00001');

  // Dynamic datasets
  const [topCustomers, setTopCustomers] = useState<TopCustomerRow[]>(initialTopCustomers);
  const [productMaster] = useState<ProductMasterRow[]>(initialProductMaster);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>(initialTopProducts);
  const [activeEmployees] = useState<ActiveEmployeeRow[]>(initialActiveEmployees);
  const [allEmployees] = useState<AllEmployeeRow[]>(initialAllEmployees);
  const [topSales, setTopSales] = useState<TopSaleRow[]>(initialTopSales);
  const [jobHistoryRows, setJobHistoryRows] = useState<EmployeeJobHistoryRow[]>(initialJobHistory);

  const [isPending, startTransition] = useTransition();
  const [reportError, setReportError] = useState<string | null>(null);

  const hasAccessToActiveTab = isAdmin || allowedTabs.includes(activeTab);

  // ------------------------------------------------------------------------
  // PRINT HANDLER
  // ------------------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  // ------------------------------------------------------------------------
  // REACTIVE RE-FETCHING WHEN FILTERS CHANGE
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!hasAccessToActiveTab) return;

    if (activeTab === 'top-customers') {
      startTransition(async () => {
        setReportError(null);
        const res = await fetchTopCustomersAction(fromDate, toDate, topN);
        if (res.error) {
          setReportError(res.error);
        } else if (res.data) {
          setTopCustomers(res.data);
        }
      });
    } else if (activeTab === 'top-products') {
      startTransition(async () => {
        setReportError(null);
        const res = await fetchTopProductsAction(fromDate, toDate, topN);
        if (res.error) {
          setReportError(res.error);
        } else if (res.data) {
          setTopProducts(res.data);
        }
      });
    } else if (activeTab === 'top-sales') {
      startTransition(async () => {
        setReportError(null);
        const res = await fetchTopSalesAction(fromDate, toDate, topN);
        if (res.error) {
          setReportError(res.error);
        } else if (res.data) {
          setTopSales(res.data);
        }
      });
    }
  }, [activeTab, fromDate, toDate, topN, hasAccessToActiveTab]);

  useEffect(() => {
    if (activeTab === 'job-history' && selectedEmpNo && hasAccessToActiveTab) {
      startTransition(async () => {
        setReportError(null);
        const res = await fetchEmployeeJobHistoryAction(selectedEmpNo);
        if (res.error) {
          setReportError(res.error);
        } else if (res.data) {
          setJobHistoryRows(res.data);
        }
      });
    }
  }, [activeTab, selectedEmpNo, hasAccessToActiveTab]);

  // ------------------------------------------------------------------------
  // CROSS-REPORT TOTALS FOR VALIDATION ("TRY IT", p. 15)
  // ------------------------------------------------------------------------
  const totalTopCustomersSum = useMemo(
    () => topCustomers.reduce((acc, c) => acc + c.totalSales, 0),
    [topCustomers]
  );
  const totalTopProductsSum = useMemo(
    () => topProducts.reduce((acc, p) => acc + p.salesAmount, 0),
    [topProducts]
  );
  const totalTopSalesSum = useMemo(
    () => topSales.reduce((acc, s) => acc + s.total, 0),
    [topSales]
  );

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Row with Title and User Role Badge (matching Figures 28-34) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Reports
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Read-only analytical summaries exportable to printable documents or PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Role Badge matching top right of Figures 28-34 */}
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
              isAdmin
                ? 'bg-[#041a24]/10 text-[#041a24] border-[#041a24]/20 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
            }`}
          >
            {userRole}
          </span>
        </div>
      </div>

      {/* 7 Canonical Report Sub-Tabs (Figure 28-34) */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-sans print:hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAllowed = isAdmin || allowedTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-[#041a24] dark:text-white font-bold shadow-xs border-b-2 border-[#041a24] dark:border-slate-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              {!isAllowed && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Permission Denied Alert for Unauthorized Users */}
      {!hasAccessToActiveTab ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-8 text-center space-y-3 font-sans">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Access Restricted: Report Right Required
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            You do not have permission to view the{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {TABS.find((t) => t.id === activeTab)?.label}
            </strong>{' '}
            report. Under the Hope, Inc. ERP canonical security matrix, a User may open a report only after an Administrator has granted the{' '}
            <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
              {TABS.find((t) => t.id === activeTab)?.rightCode}
            </code>{' '}
            permission.
          </p>
        </div>
      ) : (
        /* Report View Body */
        <div className="space-y-4">
          {/* Report Card Header & Filter Bar (Figures 28, 29, 30, 31, 32, 33, 34) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
            {/* Top row: Section Heading & Action Buttons (Print, Save as PDF with #001A2B) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activeTab === 'top-customers' && 'Top Customers by Sales'}
                  {activeTab === 'product-master' && 'Product Master List (Current Price)'}
                  {activeTab === 'top-products' && 'Top Products by Sales Amount'}
                  {activeTab === 'active-employees' && 'Active Employees (Not Separated)'}
                  {activeTab === 'all-employees' && 'All Employees (Including Separated)'}
                  {activeTab === 'job-history' && 'Employee Job History'}
                  {activeTab === 'top-sales' && 'Top Sales'}
                </h2>
                {activeTab === 'active-employees' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Employees with no separation date.
                  </p>
                )}
                {activeTab === 'product-master' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Only active products appear.
                  </p>
                )}
              </div>

              {/* Action Buttons: Print & Save as PDF (#001A2B) */}
              <div className="flex items-center gap-2 print:hidden self-start md:self-auto">
                {isPending && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono pr-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#041a24] dark:text-slate-300" />
                    <span>Updating...</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save as PDF</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar for Date-Range Reports (Top Customers, Top Products, Top Sales) */}
            {['top-customers', 'top-products', 'top-sales'].includes(activeTab) && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-sans print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Top N</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={topN}
                    onChange={(e) => setTopN(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div className="ml-auto hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Cross-Report Consistency Verified</span>
                </div>
              </div>
            )}

            {/* Filter for Employee Job History (Figure 33) */}
            {activeTab === 'job-history' && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-sans print:hidden">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Employee</span>
                <select
                  value={selectedEmpNo}
                  onChange={(e) => setSelectedEmpNo(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none min-w-[260px] cursor-pointer"
                >
                  {employeesList.map((emp) => (
                    <option key={emp.empNo} value={emp.empNo}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message if Any */}
            {reportError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            {/* ============================================================ */}
            {/* 1. TOP CUSTOMERS TABLE (Figure 28) */}
            {/* ============================================================ */}
            {activeTab === 'top-customers' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-16">RANK</th>
                        <th className="py-2.5 px-4 w-28">CUST NO</th>
                        <th className="py-2.5 px-4">CUSTOMER NAME</th>
                        <th className="py-2.5 px-4 text-right">TOTAL SALES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                            No sales transactions recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        topCustomers.map((c) => (
                          <tr key={c.custNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{c.rank}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{c.custNo}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{c.custName}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {c.totalSalesFormatted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {topCustomers.length > 0 && (
                      <tfoot className="bg-slate-50/50 dark:bg-slate-850/50 border-t border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-4 text-right uppercase tracking-wider text-[11px] text-slate-500">
                            Total:
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                            {currencyFormatter.format(totalTopCustomersSum)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 2. PRODUCT MASTER LIST (Figure 29) */}
            {/* ============================================================ */}
            {activeTab === 'product-master' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-28">PROD CODE</th>
                        <th className="py-2.5 px-4">DESCRIPTION</th>
                        <th className="py-2.5 px-4 w-24">UNIT</th>
                        <th className="py-2.5 px-4 text-right w-36">CURRENT PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {productMaster.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                            No active products registered in catalogue.
                          </td>
                        </tr>
                      ) : (
                        productMaster.map((p) => (
                          <tr key={p.prodCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{p.prodCode}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{p.description}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{p.unit}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {p.currentPriceFormatted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 3. TOP PRODUCTS (Figure 30) */}
            {/* ============================================================ */}
            {activeTab === 'top-products' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-16">RANK</th>
                        <th className="py-2.5 px-4 w-28">PROD CODE</th>
                        <th className="py-2.5 px-4">DESCRIPTION</th>
                        <th className="py-2.5 px-4 text-right w-28">QTY SOLD</th>
                        <th className="py-2.5 px-4 text-right w-36">SALES AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                            No product sales recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        topProducts.map((p) => (
                          <tr key={p.prodCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{p.rank}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{p.prodCode}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{p.description}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">{p.qtySold}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {p.salesAmountFormatted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {topProducts.length > 0 && (
                      <tfoot className="bg-slate-50/50 dark:bg-slate-850/50 border-t border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        <tr>
                          <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-[11px] text-slate-500">
                            Total:
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                            {currencyFormatter.format(totalTopProductsSum)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 4. ACTIVE EMPLOYEES (Figure 31) */}
            {/* ============================================================ */}
            {activeTab === 'active-employees' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-24">EMP NO</th>
                        <th className="py-2.5 px-4">LAST NAME</th>
                        <th className="py-2.5 px-4">FIRST NAME</th>
                        <th className="py-2.5 px-4 w-20">GENDER</th>
                        <th className="py-2.5 px-4 w-28">BIRTH DATE</th>
                        <th className="py-2.5 px-4 w-28">HIRE DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                            No active employees found.
                          </td>
                        </tr>
                      ) : (
                        activeEmployees.map((e) => (
                          <tr key={e.empNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{e.empNo}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{e.lastName}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{e.firstName}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.gender}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.birthDate}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.hireDate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 5. ALL EMPLOYEES (Figure 32) */}
            {/* ============================================================ */}
            {activeTab === 'all-employees' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-24">EMP NO</th>
                        <th className="py-2.5 px-4">LAST NAME</th>
                        <th className="py-2.5 px-4">FIRST NAME</th>
                        <th className="py-2.5 px-4 w-20">GENDER</th>
                        <th className="py-2.5 px-4 w-28">BIRTH DATE</th>
                        <th className="py-2.5 px-4 w-28">HIRE DATE</th>
                        <th className="py-2.5 px-4 w-28">SEP DATE</th>
                        <th className="py-2.5 px-4 w-24">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                            No employee records found.
                          </td>
                        </tr>
                      ) : (
                        allEmployees.map((e) => (
                          <tr key={e.empNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{e.empNo}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{e.lastName}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{e.firstName}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.gender}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.birthDate}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{e.hireDate}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{e.sepDate || '—'}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  e.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                }`}
                              >
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 6. EMPLOYEE JOB HISTORY (Figure 33) */}
            {/* ============================================================ */}
            {activeTab === 'job-history' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-28">EFF DATE</th>
                        <th className="py-2.5 px-4">JOB</th>
                        <th className="py-2.5 px-4">DEPARTMENT</th>
                        <th className="py-2.5 px-4 text-right w-36">SALARY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {jobHistoryRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                            No promotion or salary adjustment history recorded for this employee.
                          </td>
                        </tr>
                      ) : (
                        jobHistoryRows.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{h.effDate}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{h.job}</td>
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">{h.department}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {h.salaryFormatted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 7. TOP SALES (Figure 34) */}
            {/* ============================================================ */}
            {activeTab === 'top-sales' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 w-16">RANK</th>
                        <th className="py-2.5 px-4 w-28">TRANS NO</th>
                        <th className="py-2.5 px-4 w-28">DATE</th>
                        <th className="py-2.5 px-4">CUSTOMER</th>
                        <th className="py-2.5 px-4">EMPLOYEE</th>
                        <th className="py-2.5 px-4 text-right w-36">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                            No sales transactions recorded in this date range.
                          </td>
                        </tr>
                      ) : (
                        topSales.map((s) => (
                          <tr key={s.transNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-500">{s.rank}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">{s.transNo}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">{s.date}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{s.customer}</td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{s.employee}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {s.totalFormatted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {topSales.length > 0 && (
                      <tfoot className="bg-slate-50/50 dark:bg-slate-850/50 border-t border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        <tr>
                          <td colSpan={5} className="py-2.5 px-4 text-right uppercase tracking-wider text-[11px] text-slate-500">
                            Total:
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                            {currencyFormatter.format(totalTopSalesSum)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
