// ========================================================================
// ElectronDB G4 HopeERD: CENTRALIZED UI LABELS & NAVIGATION
// Clean, non-repeating navigation mapping 1-to-1 with actual system routes.
// ========================================================================

import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Box,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export interface NavigationItem {
  href: string;
  label: string;
  subtitle: string;
  caption: string;
  section: 'OVERVIEW' | 'TRANSACTIONS' | 'CATALOG' | 'ORGANIZATION';
  icon: LucideIcon;
  roles: UserRole[];
}

export const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Home',
    subtitle: 'Overview & metrics',
    caption: 'ERD Overview',
    section: 'OVERVIEW',
    icon: LayoutDashboard,
    roles: ['admin', 'sales', 'cashier'],
  },
  {
    href: '/sales',
    label: 'Sales',
    subtitle: 'Transactions & line items',
    caption: 'Sales Detail',
    section: 'TRANSACTIONS',
    icon: ShoppingCart,
    roles: ['admin', 'sales', 'cashier'],
  },
  {
    href: '/customers',
    label: 'Customer',
    subtitle: 'Client directory & credit terms',
    caption: 'Customers',
    section: 'TRANSACTIONS',
    icon: Users,
    roles: ['admin', 'sales', 'cashier'],
  },
  {
    href: '/products',
    label: 'Products',
    subtitle: 'Catalog & price history',
    caption: 'Products',
    section: 'CATALOG',
    icon: Box,
    roles: ['admin', 'sales', 'cashier'],
  },
  {
    href: '/employees',
    label: 'Human Resources',
    subtitle: 'Employees, jobs & departments',
    caption: 'Job, Department',
    section: 'ORGANIZATION',
    icon: User,
    roles: ['admin'],
  },
];

export const LABELS = {
  // Brand Header
  brandName: 'ElectronDB G4 HopeERD',
  brandSubtitle: 'Information Management Monitoring System',

  // Navigation Items
  nav: navigationItems.map((item) => ({
    name: item.label,
    ...item,
  })),

  // Role Display Badges
  roles: {
    admin: 'Administrator',
    sales: 'Sales Representative',
    cashier: 'Cashier / Billing',
  } as Record<UserRole, string>,

  // Page Titles and Subtitles
  pages: {
    home: {
      title: 'Overview',
      subtitle: '',
    },
    sales: {
      title: 'Sales',
      subtitle: 'Transactions & line items',
    },
    payments: {
      title: 'Payments',
      subtitle: 'Payment records',
    },
    customers: {
      title: 'Customers',
      subtitle: 'Customer accounts, payment terms, and official receipts ledger.',
    },
    products: {
      title: 'Products',
      subtitle: 'Product catalog, unit prices and price history.',
    },
    employees: {
      title: 'Human Resources',
      subtitle: 'Employees, job titles, departments and job history.',
    },
  },

  // Action Buttons
  buttons: {
    newSale: '+ New Sale',
    recordPayment: 'Record Payment',
    addProduct: 'Add Product',
    addCustomer: 'Add Customer',
    viewErd: 'View ERD →',
    viewAll: 'View All →',
    view: 'View',
    receipt: 'Receipt',
    exportCsv: 'Export CSV',
    print: 'Print Document',
    filterAll: 'All time',
    signOut: 'Sign out',
  },

  // Table Column Headers
  table: {
    transNo: 'Transaction No.',
    date: 'Date',
    customer: 'Customer',
    employee: 'Employee',
    amount: 'Amount',
    status: 'Status',
    actions: 'Actions',
  },

  // Empty State Fallbacks
  empty: {
    sales: 'No sales records match your search criteria.',
    payments: 'No payments recorded matching the selected filter.',
    customers: 'No customers found matching your search.',
  },
} as const;
