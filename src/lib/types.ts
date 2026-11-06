// ========================================================================
// HOPE Group4: DATABASE ENTITY & VIEW INTERFACES
// 100% Faithful to Hope ERD Schema and PostgreSQL Analytical Views
// ========================================================================

export type UserRole = 'Superadmin' | 'Admin' | 'User' | 'admin' | 'sales' | 'cashier';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  isBlocked?: boolean;
  rights?: string[];
}

export interface UserAccount {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'Superadmin' | 'Admin' | 'User';
  isBlocked: boolean;
  status: 'Active' | 'Inactive' | 'Blocked';
  stamp: string;
  createdAt?: string;
  rights?: string[];
}

export interface RightItem {
  rightCode: string;
  module: 'Customer' | 'Product' | 'Human Resources' | 'Sales' | 'Reports';
  label: string;
}

export const CANONICAL_RIGHTS: RightItem[] = [
  // Customer (3)
  { rightCode: 'add_customer', module: 'Customer', label: 'Add Customer' },
  { rightCode: 'edit_customer', module: 'Customer', label: 'Edit Customer' },
  { rightCode: 'delete_customer', module: 'Customer', label: 'Delete Customer' },

  // Product (6)
  { rightCode: 'add_product', module: 'Product', label: 'Add Product' },
  { rightCode: 'edit_product', module: 'Product', label: 'Edit Product' },
  { rightCode: 'delete_product', module: 'Product', label: 'Delete Product' },
  { rightCode: 'add_price', module: 'Product', label: 'Add Price' },
  { rightCode: 'edit_price', module: 'Product', label: 'Edit Price' },
  { rightCode: 'delete_price', module: 'Product', label: 'Delete Price' },

  // Human Resources (13)
  { rightCode: 'add_job', module: 'Human Resources', label: 'Add Job' },
  { rightCode: 'edit_job', module: 'Human Resources', label: 'Edit Job' },
  { rightCode: 'delete_job', module: 'Human Resources', label: 'Delete Job' },
  { rightCode: 'add_department', module: 'Human Resources', label: 'Add Department' },
  { rightCode: 'edit_department', module: 'Human Resources', label: 'Edit Department' },
  { rightCode: 'delete_department', module: 'Human Resources', label: 'Delete Department' },
  { rightCode: 'add_employee', module: 'Human Resources', label: 'Add Employee' },
  { rightCode: 'edit_employee', module: 'Human Resources', label: 'Edit Employee' },
  { rightCode: 'delete_employee', module: 'Human Resources', label: 'Delete Employee' },
  { rightCode: 'view_job_history', module: 'Human Resources', label: 'View Job History' },
  { rightCode: 'add_job_history', module: 'Human Resources', label: 'Add Job History' },
  { rightCode: 'edit_job_history', module: 'Human Resources', label: 'Edit Job History' },
  { rightCode: 'delete_job_history', module: 'Human Resources', label: 'Delete Job History' },

  // Sales (7)
  { rightCode: 'add_sale', module: 'Sales', label: 'Add Sale' },
  { rightCode: 'edit_sale', module: 'Sales', label: 'Edit Sale' },
  { rightCode: 'delete_sale', module: 'Sales', label: 'Delete Sale' },
  { rightCode: 'view_sale_details', module: 'Sales', label: 'View Sale Details' },
  { rightCode: 'add_sale_detail', module: 'Sales', label: 'Add Sale Detail' },
  { rightCode: 'edit_sale_detail', module: 'Sales', label: 'Edit Sale Detail' },
  { rightCode: 'delete_sale_detail', module: 'Sales', label: 'Delete Sale Detail' },

  // Reports (7)
  { rightCode: 'report_top_customers', module: 'Reports', label: 'Top Customers' },
  { rightCode: 'report_product_master', module: 'Reports', label: 'Product Master List' },
  { rightCode: 'report_top_products', module: 'Reports', label: 'Top Products' },
  { rightCode: 'report_active_employees', module: 'Reports', label: 'Active Employees' },
  { rightCode: 'report_all_employees', module: 'Reports', label: 'All Employees' },
  { rightCode: 'report_employee_job_history', module: 'Reports', label: 'Employee Job History' },
  { rightCode: 'report_top_sales', module: 'Reports', label: 'Top Sales' },
];

// ------------------------------------------------------------------------
// 10 CORE HOPE ERD TABLES
// ------------------------------------------------------------------------

export interface Department {
  deptCode: string;
  deptName: string;
}

export interface Job {
  jobCode: string;
  jobDesc: string;
}

export interface Employee {
  empNo: number;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F' | 'm' | 'f';
  birthDate: string;
  hireDate: string;
  sepDate: string | null;
}

export interface JobHistory {
  empNo: number;
  jobCode: string;
  effDate: string;
  salary: number;
  deptCode: string;
}

export interface Customer {
  custNo: number;
  custName: string;
  address: string;
  payTerms: string;
}

export interface Product {
  prodCode: string;
  description: string;
  unit: string;
}

export interface PriceHist {
  prodCode: string;
  effDate: string;
  unitPrice: number;
}

export interface Sale {
  transNo: number;
  salesDate: string;
  custNo: number;
  empNo: number;
}

export interface SaleDetail {
  transNo: number;
  prodCode: string;
  quantity: number;
}

export interface Payment {
  orNo: number;
  payDate: string;
  amount: number;
  transNo: number;
}

// ------------------------------------------------------------------------
// SQL ANALYTICAL VIEWS
// ------------------------------------------------------------------------

export interface SaleDetailPriced {
  transNo: number;
  salesDate: string;
  prodCode: string;
  productDescription: string;
  unit: string;
  quantity: number;
  priceEffDate: string;
  unitPrice: number;
  lineTotal: number;
}

export interface SaleWithDept {
  transNo: number;
  salesDate: string;
  custNo: number;
  empNo: number;
  empName: string;
  jobEffDate: string;
  deptCode: string;
  deptName: string;
  jobCode: string;
  jobDesc: string;
}

export interface SaleSummary {
  transNo: number;
  salesDate: string;
  custNo: number;
  custName: string;
  custAddress: string;
  empNo: number;
  empName: string;
  deptCode: string;
  deptName: string;
  jobDesc: string;
  itemCount: number;
  totalAmount: number;
}

export interface DepartmentPerformance {
  deptCode: string;
  deptName: string;
  transactionCount: number;
  totalRevenueGenerated: number;
}

export interface EmployeeCurrentStatus {
  empNo: number;
  fullName: string;
  gender: string;
  hireDate: string;
  sepDate: string | null;
  employmentStatus: 'Active' | 'Separated';
  tenureDays: number;
  jobCode: string;
  jobDesc: string;
  deptCode: string;
  deptName: string;
  salary: number | null; // Masked if not admin
  currentJobEffDate: string;
}

export interface ProductSalesAnalytics {
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number;
  currentPriceEffDate: string;
  previousPrice: number | null;
  priceTrend: 'UP' | 'DOWN' | 'STABLE';
  totalUnitsSold: number;
  totalRevenue: number;
}
