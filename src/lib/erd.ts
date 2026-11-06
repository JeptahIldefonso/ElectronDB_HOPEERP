// ========================================================================
// HOPE Group4: CANONICAL ERD METADATA & RENDERING SPECIFICATION
// File: src/lib/erd.ts
//
// RENDERING NOTES FOR SVG GENERATION:
// 1. Table Boxes:
//    - Rendered at coordinates from ERD_GEOMETRY.
//    - Header fill derived from module tint token:
//      - employees: var(--module-employees, #e6eef4)
//      - products:  var(--module-products, #e8f2ea)
//      - customers: var(--module-customers, #faf0e6)
//      - sales:     var(--module-sales, #f4e8ee)
//    - Border: 1px solid #041a24 (dark ink border).
//    - Header contains table name (font-bold 12px) and a live row-count chip.
//    - Columns list: PK columns are underlined with bold font, followed by '[PK]' tag.
//    - FK columns include '[FK]' tag. Non-key columns rendered in normal weight.
// 2. Relationships & Lines:
//    - Straight / orthogonal SVG paths connecting parent and child tables.
//    - Crow's foot notation on endings:
//      - Exactly one (1): Two parallel ticks ||
//      - Zero or many (0..*): Circle 'O' + crow's foot forks '<'
//      - One or many (1..*): Tick '|' + crow's foot forks '<'
//    - Each line displays an italic action label along its path midpoint.
// 3. Interactivity & Access:
//    - Hover or keyboard focus on a table highlights that table and all incident
//      relationship lines while softly dimming unrelated elements.
//    - Click or Enter on a table navigates to the associated module href.
//    - Role restriction: If table belongs to Employees and user is not admin,
//      navigation is prevented and an 'Admin only' tooltip is presented.
// ========================================================================

import type { UserRole } from '@/lib/types';

export type ErdModuleId = 'employees' | 'products' | 'customers' | 'sales';

export interface ErdColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  nullable?: boolean;
}

export interface ErdTable {
  name: string;
  moduleId: ErdModuleId;
  description: string;
  columns: ErdColumn[];
}

export interface ErdRelationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromCardinality: '1' | '0..1';
  toCardinality: '0..*' | '1..*';
  label: string;
  fkColumns: string[];
}

export interface ErdTableGeometry {
  tableName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ErdModule {
  id: ErdModuleId;
  order: number;
  name: string;
  tintVar: string;
  tintBg: string;
  tintBorder: string;
  href: string;
  roles: UserRole[];
  tables: string[];
  mainList: string;
  detail: string;
}

// ------------------------------------------------------------------------
// STRICT 10 TABLES (Total: 37 Columns)
// ------------------------------------------------------------------------
export const ERD_TABLES: Record<string, ErdTable> = {
  DEPARTMENT: {
    name: 'DEPARTMENT',
    moduleId: 'employees',
    description: 'Internal company organizational departments.',
    columns: [
      { name: 'deptCode', type: 'VARCHAR(10)', isPk: true },
      { name: 'deptName', type: 'VARCHAR(100)' },
    ],
  },
  JOB: {
    name: 'JOB',
    moduleId: 'employees',
    description: 'Job titles and organizational roles.',
    columns: [
      { name: 'jobCode', type: 'VARCHAR(10)', isPk: true },
      { name: 'jobDesc', type: 'VARCHAR(100)' },
    ],
  },
  EMPLOYEE: {
    name: 'EMPLOYEE',
    moduleId: 'employees',
    description: 'Staff member directory and employment lifecycle.',
    columns: [
      { name: 'empNo', type: 'INT', isPk: true },
      { name: 'lastName', type: 'VARCHAR(50)' },
      { name: 'firstName', type: 'VARCHAR(50)' },
      { name: 'gender', type: 'CHAR(1)' },
      { name: 'birthDate', type: 'DATE' },
      { name: 'hireDate', type: 'DATE' },
      { name: 'sepDate', type: 'DATE', nullable: true },
    ],
  },
  JOBHISTORY: {
    name: 'JOBHISTORY',
    moduleId: 'employees',
    description: 'Historical appointments, promotions, departments and salaries.',
    columns: [
      { name: 'empNo', type: 'INT', isPk: true, isFk: true },
      { name: 'jobCode', type: 'VARCHAR(10)', isPk: true, isFk: true },
      { name: 'effDate', type: 'DATE', isPk: true },
      { name: 'salary', type: 'NUMERIC(12,2)' },
      { name: 'deptCode', type: 'VARCHAR(10)', isFk: true },
    ],
  },
  CUSTOMER: {
    name: 'CUSTOMER',
    moduleId: 'customers',
    description: 'Customer profiles and agreed payment terms.',
    columns: [
      { name: 'custNo', type: 'INT', isPk: true },
      { name: 'custName', type: 'VARCHAR(120)' },
      { name: 'address', type: 'VARCHAR(255)' },
      { name: 'payTerms', type: 'VARCHAR(50)' },
    ],
  },
  PRODUCT: {
    name: 'PRODUCT',
    moduleId: 'products',
    description: 'Hardware component catalog and packaging units.',
    columns: [
      { name: 'prodCode', type: 'VARCHAR(20)', isPk: true },
      { name: 'description', type: 'VARCHAR(255)' },
      { name: 'unit', type: 'VARCHAR(30)' },
    ],
  },
  PRICEHIST: {
    name: 'PRICEHIST',
    moduleId: 'products',
    description: 'Effective unit prices over time for point-in-time calculation.',
    columns: [
      { name: 'effDate', type: 'DATE', isPk: true },
      { name: 'prodCode', type: 'VARCHAR(20)', isPk: true, isFk: true },
      { name: 'unitPrice', type: 'NUMERIC(12,2)' },
    ],
  },
  SALES: {
    name: 'SALES',
    moduleId: 'sales',
    description: 'Sales transactions linking date, customer, and representative.',
    columns: [
      { name: 'transNo', type: 'INT', isPk: true },
      { name: 'salesDate', type: 'DATE' },
      { name: 'custNo', type: 'INT', isFk: true },
      { name: 'empNo', type: 'INT', isFk: true },
    ],
  },
  SALESDETAIL: {
    name: 'SALESDETAIL',
    moduleId: 'sales',
    description: 'Itemized line items recording dispatched products and quantities.',
    columns: [
      { name: 'transNo', type: 'INT', isPk: true, isFk: true },
      { name: 'prodCode', type: 'VARCHAR(20)', isPk: true, isFk: true },
      { name: 'quantity', type: 'INT' },
    ],
  },
  PAYMENT: {
    name: 'PAYMENT',
    moduleId: 'customers',
    description: 'Official receipts issued against sales invoices.',
    columns: [
      { name: 'ORNo', type: 'INT', isPk: true },
      { name: 'payDate', type: 'DATE' },
      { name: 'amount', type: 'NUMERIC(12,2)' },
      { name: 'transNo', type: 'INT', isFk: true },
    ],
  },
};

// ------------------------------------------------------------------------
// STRICT 9 RELATIONSHIPS
// ------------------------------------------------------------------------
export const ERD_RELATIONSHIPS: ErdRelationship[] = [
  {
    id: 'rel_dept_jobhistory',
    fromTable: 'DEPARTMENT',
    toTable: 'JOBHISTORY',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'placed in',
    fkColumns: ['deptCode'],
  },
  {
    id: 'rel_job_jobhistory',
    fromTable: 'JOB',
    toTable: 'JOBHISTORY',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'appointed to',
    fkColumns: ['jobCode'],
  },
  {
    id: 'rel_emp_jobhistory',
    fromTable: 'EMPLOYEE',
    toTable: 'JOBHISTORY',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'career history',
    fkColumns: ['empNo'],
  },
  {
    id: 'rel_emp_sales',
    fromTable: 'EMPLOYEE',
    toTable: 'SALES',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'handled by',
    fkColumns: ['empNo'],
  },
  {
    id: 'rel_cust_sales',
    fromTable: 'CUSTOMER',
    toTable: 'SALES',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'makes sales',
    fkColumns: ['custNo'],
  },
  {
    id: 'rel_sales_payment',
    fromTable: 'SALES',
    toTable: 'PAYMENT',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'has receipts',
    fkColumns: ['transNo'],
  },
  {
    id: 'rel_sales_salesdetail',
    fromTable: 'SALES',
    toTable: 'SALESDETAIL',
    fromCardinality: '1',
    toCardinality: '1..*',
    label: 'contains item',
    fkColumns: ['transNo'],
  },
  {
    id: 'rel_prod_salesdetail',
    fromTable: 'PRODUCT',
    toTable: 'SALESDETAIL',
    fromCardinality: '1',
    toCardinality: '0..*',
    label: 'ordered SKU',
    fkColumns: ['prodCode'],
  },
  {
    id: 'rel_prod_pricehist',
    fromTable: 'PRODUCT',
    toTable: 'PRICEHIST',
    fromCardinality: '1',
    toCardinality: '1..*',
    label: 'price history',
    fkColumns: ['prodCode'],
  },
];

// ------------------------------------------------------------------------
// DIAGRAM GEOMETRY (Layout in 1335 x 600 Canvas)
// Clean orthogonal alignment with spacious clearance preventing text clipping
// ------------------------------------------------------------------------
export const ERD_GEOMETRY: Record<string, ErdTableGeometry> = {
  DEPARTMENT: { tableName: 'DEPARTMENT', x: 30, y: 30, width: 185, height: 86 },
  JOB: { tableName: 'JOB', x: 30, y: 145, width: 185, height: 86 },
  EMPLOYEE: { tableName: 'EMPLOYEE', x: 30, y: 260, width: 185, height: 194 },
  JOBHISTORY: { tableName: 'JOBHISTORY', x: 280, y: 65, width: 205, height: 152 },
  PAYMENT: { tableName: 'PAYMENT', x: 550, y: 45, width: 195, height: 128 },
  SALES: { tableName: 'SALES', x: 550, y: 270, width: 195, height: 128 },
  CUSTOMER: { tableName: 'CUSTOMER', x: 550, y: 450, width: 195, height: 128 },
  SALESDETAIL: { tableName: 'SALESDETAIL', x: 840, y: 270, width: 195, height: 106 },
  PRICEHIST: { tableName: 'PRICEHIST', x: 1125, y: 55, width: 180, height: 106 },
  PRODUCT: { tableName: 'PRODUCT', x: 1125, y: 270, width: 180, height: 106 },
};

// ------------------------------------------------------------------------
// FOUR CORE BUSINESS MODULES
// ------------------------------------------------------------------------
export const ERD_MODULES: ErdModule[] = [
  {
    id: 'employees',
    order: 1,
    name: 'Employees',
    tintVar: '--module-employees',
    tintBg: '#BFDBFE',
    tintBorder: '#3B82F6',
    href: '/employees',
    roles: ['admin'],
    tables: ['DEPARTMENT', 'JOB', 'EMPLOYEE', 'JOBHISTORY'],
    mainList: 'Staff directory with active status and tenure',
    detail: 'Staff, jobs & departments',
  },
  {
    id: 'products',
    order: 2,
    name: 'Products & Pricing',
    tintVar: '--module-products',
    tintBg: '#BBF7D0',
    tintBorder: '#16A34A',
    href: '/products',
    roles: ['admin', 'sales', 'cashier'],
    tables: ['PRODUCT', 'PRICEHIST'],
    mainList: 'Product catalog with current unit prices',
    detail: 'Catalog & price history',
  },
  {
    id: 'customers',
    order: 3,
    name: 'Customers & Payments',
    tintVar: '--module-customers',
    tintBg: '#FEF08A',
    tintBorder: '#CA8A04',
    href: '/customers',
    roles: ['admin', 'sales', 'cashier'],
    tables: ['CUSTOMER', 'PAYMENT'],
    mainList: 'Searchable customer list with payment terms',
    detail: 'Accounts & payment records',
  },
  {
    id: 'sales',
    order: 4,
    name: 'Sales',
    tintVar: '--module-sales',
    tintBg: '#FECACA',
    tintBorder: '#DC2626',
    href: '/sales',
    roles: ['admin', 'sales', 'cashier'],
    tables: ['SALES', 'SALESDETAIL'],
    mainList: 'Sales transactions with sellers and departments',
    detail: 'Transactions & line items',
  },
];
