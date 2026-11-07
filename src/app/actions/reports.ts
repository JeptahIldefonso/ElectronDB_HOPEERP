'use server';

import { getCurrentUser } from '@/app/actions/auth';
import {
  getTopCustomers,
  getTopProducts,
  getTopSales,
  getEmployeeJobHistoryReport,
  type TopCustomerRow,
  type TopProductRow,
  type TopSaleRow,
  type EmployeeJobHistoryRow,
} from '@/lib/data/reports';

async function checkReportPermission(rightCode: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'superadmin' || role === 'admin') return true;
  return Boolean(user.rights && user.rights.includes(rightCode));
}

export async function fetchTopCustomersAction(
  fromDate: string,
  toDate: string,
  topN: number
): Promise<{ data?: TopCustomerRow[]; error?: string }> {
  try {
    const hasAccess = await checkReportPermission('report_top_customers');
    if (!hasAccess) {
      return { error: 'Access denied: You do not have permission to view Top Customers report.' };
    }
    const data = await getTopCustomers(fromDate, toDate, topN);
    return { data };
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch Top Customers report.' };
  }
}

export async function fetchTopProductsAction(
  fromDate: string,
  toDate: string,
  topN: number
): Promise<{ data?: TopProductRow[]; error?: string }> {
  try {
    const hasAccess = await checkReportPermission('report_top_products');
    if (!hasAccess) {
      return { error: 'Access denied: You do not have permission to view Top Products report.' };
    }
    const data = await getTopProducts(fromDate, toDate, topN);
    return { data };
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch Top Products report.' };
  }
}

export async function fetchTopSalesAction(
  fromDate: string,
  toDate: string,
  topN: number
): Promise<{ data?: TopSaleRow[]; error?: string }> {
  try {
    const hasAccess = await checkReportPermission('report_top_sales');
    if (!hasAccess) {
      return { error: 'Access denied: You do not have permission to view Top Sales report.' };
    }
    const data = await getTopSales(fromDate, toDate, topN);
    return { data };
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch Top Sales report.' };
  }
}

export async function fetchEmployeeJobHistoryAction(
  empNo: string
): Promise<{ data?: EmployeeJobHistoryRow[]; error?: string }> {
  try {
    const hasAccess = await checkReportPermission('report_employee_job_history');
    if (!hasAccess) {
      return { error: 'Access denied: You do not have permission to view Employee Job History report.' };
    }
    const data = await getEmployeeJobHistoryReport(empNo);
    return { data };
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch Employee Job History report.' };
  }
}
