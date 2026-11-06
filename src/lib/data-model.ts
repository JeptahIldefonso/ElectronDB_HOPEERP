// ========================================================================
// HOPE, Inc. ERP — Canonical Relational Data Model (Single Source of Truth)
// Verified strictly against hope.db (10 tables, 9 relationships, 3NF compliance)
// ========================================================================

export type ModuleKey = 'hr' | 'sales' | 'customer' | 'products' | 'payments';

export interface ModuleTheme {
  key: ModuleKey;
  name: string;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  accent: string;
  headerBg: string;
  hex: string;
  iconName: 'Users' | 'ShoppingCart' | 'UserCheck' | 'Package' | 'Receipt';
}

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  hr: {
    key: 'hr',
    name: 'Human Resources',
    colorName: 'violet',
    badgeBg: 'bg-violet-100 dark:bg-violet-950/60',
    badgeText: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-500/40 dark:border-violet-400/40',
    accent: '#8b5cf6',
    headerBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    hex: '#8b5cf6',
    iconName: 'Users',
  },
  sales: {
    key: 'sales',
    name: 'Sales',
    colorName: 'blue',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/40 dark:border-blue-400/40',
    accent: '#3b82f6',
    headerBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    hex: '#3b82f6',
    iconName: 'ShoppingCart',
  },
  customer: {
    key: 'customer',
    name: 'Customer',
    colorName: 'teal',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60',
    badgeText: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/40 dark:border-teal-400/40',
    accent: '#0d9488',
    headerBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    hex: '#0d9488', // Deep teal (clearly distinct from Indigo Home Stats)
    iconName: 'UserCheck',
  },
  products: {
    key: 'products',
    name: 'Products',
    colorName: 'amber',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-500/40 dark:border-amber-400/40',
    accent: '#f59e0b',
    headerBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    hex: '#f59e0b',
    iconName: 'Package',
  },
  payments: {
    key: 'payments',
    name: 'Payments',
    colorName: 'green',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/40 dark:border-emerald-400/40',
    accent: '#10b981',
    headerBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    hex: '#10b981',
    iconName: 'Receipt',
  },
};

export interface ColumnDefinition {
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  isCompositePk?: boolean;
  fkTarget?: string;
  description: string;
}

export interface TableDefinition {
  name: string;
  module: ModuleKey;
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: ColumnDefinition[];
  fallbackRowCount: number;
  sampleScreenView: string;
  usedByPages: Array<{
    title: string;
    href: string;
    moduleKey: string;
    mode: 'read' | 'write' | 'read-write';
  }>;
}

export const DATA_MODEL_TABLES: Record<string, TableDefinition> = {
  EMPLOYEE: {
    name: 'EMPLOYEE',
    module: 'hr',
    label: 'Employees',
    description: 'Lists all company staff, whether they still work here, and which staff member handled each sale.',
    x: 40,
    y: 50,
    width: 210,
    height: 215,
    fallbackRowCount: 32,
    sampleScreenView: 'Human Resources list: empNo, fullName, gender, hireDate, sepDate (Active / Separated pill)',
    usedByPages: [
      { title: 'Human Resources Directory', href: '/employees', moduleKey: 'human-resources', mode: 'read-write' },
      { title: 'Employee Profile', href: '/employees/1', moduleKey: 'human-resources', mode: 'read-write' },
      { title: 'Home Executive KPIs', href: '/', moduleKey: 'home', mode: 'read' },
      { title: 'Active & All Employees Reports', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'empNo', type: 'VARCHAR(5)', isPk: true, isFk: false, description: 'Primary key identifying employee' },
      { name: 'lastName', type: 'VARCHAR(15)', isPk: false, isFk: false, description: 'Staff family name' },
      { name: 'firstName', type: 'VARCHAR(15)', isPk: false, isFk: false, description: 'Staff given name' },
      { name: 'gender', type: 'CHAR(1)', isPk: false, isFk: false, description: "Gender classification ('M'/'F')" },
      { name: 'birthDate', type: 'DATE', isPk: false, isFk: false, description: 'Date of birth' },
      { name: 'hireDate', type: 'DATE', isPk: false, isFk: false, description: 'Official corporate onboarding date' },
      { name: 'sepDate', type: 'DATE', isPk: false, isFk: false, description: 'Separation date (NULL indicates active staff)' },
    ],
  },

  JOBHISTORY: {
    name: 'JOBHISTORY',
    module: 'hr',
    label: 'Job History',
    description: "Keeps each employee's work record over time: jobs held, salary and department.",
    x: 350,
    y: 50,
    width: 210,
    height: 185,
    fallbackRowCount: 54,
    sampleScreenView: 'Staff career timeline modal: effDate, jobDesc, deptName, salary (₱ formatted)',
    usedByPages: [
      { title: 'Staff Career History', href: '/employees', moduleKey: 'human-resources', mode: 'read-write' },
      { title: 'Employee Job History Report', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'empNo', type: 'VARCHAR(5)', isPk: true, isFk: true, isCompositePk: true, fkTarget: 'EMPLOYEE(empNo)', description: 'Target employee' },
      { name: 'jobCode', type: 'VARCHAR(4)', isPk: true, isFk: true, isCompositePk: true, fkTarget: 'JOB(jobCode)', description: 'Assigned job title' },
      { name: 'effDate', type: 'DATE', isPk: true, isFk: false, isCompositePk: true, description: 'Effective start date of contract' },
      { name: 'salary', type: 'DECIMAL(10,2)', isPk: false, isFk: false, description: 'Monthly base compensation (CHECK >= 0)' },
      { name: 'deptCode', type: 'VARCHAR(4)', isPk: false, isFk: true, fkTarget: 'DEPARTMENT(deptCode)', description: 'Assigned organizational unit' },
    ],
  },

  JOB: {
    name: 'JOB',
    module: 'hr',
    label: 'Jobs',
    description: 'The list of job titles staff can be given.',
    x: 660,
    y: 50,
    width: 200,
    height: 95,
    fallbackRowCount: 14,
    sampleScreenView: 'Job classifications modal: jobCode (e.g. ACCT, ENGR), jobDesc',
    usedByPages: [
      { title: 'Job Titles Catalog', href: '/employees', moduleKey: 'human-resources', mode: 'read-write' },
      { title: 'HR Employee Modals', href: '/employees', moduleKey: 'human-resources', mode: 'read' },
    ],
    columns: [
      { name: 'jobCode', type: 'VARCHAR(4)', isPk: true, isFk: false, description: 'Primary job code abbreviation' },
      { name: 'jobDesc', type: 'VARCHAR(20)', isPk: false, isFk: false, description: 'Official designation title' },
    ],
  },

  DEPARTMENT: {
    name: 'DEPARTMENT',
    module: 'hr',
    label: 'Departments',
    description: 'The list of departments where staff work.',
    x: 660,
    y: 170,
    width: 200,
    height: 95,
    fallbackRowCount: 8,
    sampleScreenView: 'Department directory modal: deptCode (e.g. ADM, SLS), deptName',
    usedByPages: [
      { title: 'Departments Directory', href: '/employees', moduleKey: 'human-resources', mode: 'read-write' },
      { title: 'Employee Profile Posting', href: '/employees', moduleKey: 'human-resources', mode: 'read' },
    ],
    columns: [
      { name: 'deptCode', type: 'VARCHAR(3)', isPk: true, isFk: false, description: 'Unique department code' },
      { name: 'deptName', type: 'VARCHAR(20)', isPk: false, isFk: false, description: 'Division / organizational unit name' },
    ],
  },

  SALES: {
    name: 'SALES',
    module: 'sales',
    label: 'Sales Invoices',
    description: 'One entry per sale: who bought, which staff member sold it, and when.',
    x: 40,
    y: 330,
    width: 210,
    height: 160,
    fallbackRowCount: 124,
    sampleScreenView: 'Sales ledger: transNo, salesDate, custName, repName, computed totalAmount, status pill',
    usedByPages: [
      { title: 'Sales Order Ledger', href: '/sales', moduleKey: 'sales', mode: 'read-write' },
      { title: 'New Sale Modal', href: '/sales?action=new', moduleKey: 'sales', mode: 'write' },
      { title: 'Sale Invoice Details', href: '/sales/TR000001', moduleKey: 'sales', mode: 'read-write' },
      { title: 'Top Sales Report', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'transNo', type: 'VARCHAR(8)', isPk: true, isFk: false, description: 'Master invoice transaction number' },
      { name: 'salesDate', type: 'DATE', isPk: false, isFk: false, description: 'Date of order issuance' },
      { name: 'custNo', type: 'VARCHAR(5)', isPk: false, isFk: true, fkTarget: 'CUSTOMER(custNo)', description: 'Debtor customer reference' },
      { name: 'empNo', type: 'VARCHAR(5)', isPk: false, isFk: true, fkTarget: 'EMPLOYEE(empNo)', description: 'Servicing employee sales rep' },
    ],
  },

  SALESDETAIL: {
    name: 'SALESDETAIL',
    module: 'sales',
    label: 'Sale Line Items',
    description: 'The items and quantities listed on each sale.',
    x: 350,
    y: 330,
    width: 210,
    height: 145,
    fallbackRowCount: 313,
    sampleScreenView: 'Line items grid: prodCode, description, quantity, dynamic unitPrice, lineTotal',
    usedByPages: [
      { title: 'Sale Line Items Drawer', href: '/sales/TR000001', moduleKey: 'sales', mode: 'read-write' },
      { title: 'Sales & Inventory Reports', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'transNo', type: 'VARCHAR(8)', isPk: true, isFk: true, isCompositePk: true, fkTarget: 'SALES(transNo)', description: 'Invoice number' },
      { name: 'prodCode', type: 'VARCHAR(6)', isPk: true, isFk: true, isCompositePk: true, fkTarget: 'PRODUCT(prodCode)', description: 'Inventory product item' },
      { name: 'quantity', type: 'DECIMAL(10,2)', isPk: false, isFk: false, description: 'Quantity billed (CHECK >= 0.0)' },
    ],
  },

  PRODUCT: {
    name: 'PRODUCT',
    module: 'products',
    label: 'Product Catalog',
    description: 'The catalog of computer parts the company sells.',
    x: 660,
    y: 330,
    width: 200,
    height: 145,
    fallbackRowCount: 57,
    sampleScreenView: 'Product catalog: prodCode, description, unit, latest effective price, unitsSold',
    usedByPages: [
      { title: 'Product Catalog', href: '/products', moduleKey: 'products', mode: 'read-write' },
      { title: 'Product Detail & History', href: '/products/P00001', moduleKey: 'products', mode: 'read-write' },
      { title: 'Product Master List Report', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'prodCode', type: 'VARCHAR(6)', isPk: true, isFk: false, description: 'Unique product SKU code' },
      { name: 'description', type: 'VARCHAR(30)', isPk: false, isFk: false, description: 'Item name / specifications' },
      { name: 'unit', type: 'VARCHAR(3)', isPk: false, isFk: false, description: "Unit of measure ('pc','ea','mtr','pkg','ltr')" },
    ],
  },

  PAYMENT: {
    name: 'PAYMENT',
    module: 'payments',
    label: 'Payments & Receipts',
    description: 'Money received from customers, with an official receipt for each payment, matched to the sale it pays for.',
    x: 40,
    y: 560,
    width: 210,
    height: 160,
    fallbackRowCount: 165,
    sampleScreenView: 'Payments ledger: ORNo, payDate, amount (₱), transNo, customer name, link to official receipt',
    usedByPages: [
      { title: 'Collections & Receipts', href: '/payments', moduleKey: 'payments', mode: 'read-write' },
      { title: 'Printable Official Receipt', href: '/receipts/OR000001', moduleKey: 'payments', mode: 'read' },
      { title: 'Home KPI Collections', href: '/', moduleKey: 'home', mode: 'read' },
    ],
    columns: [
      { name: 'ORNo', type: 'VARCHAR(8)', isPk: true, isFk: false, description: 'Official Receipt number' },
      { name: 'payDate', type: 'DATE', isPk: false, isFk: false, description: 'Payment receipt transaction date' },
      { name: 'amount', type: 'DECIMAL(10,2)', isPk: false, isFk: false, description: 'Collected cash/check amount' },
      { name: 'transNo', type: 'VARCHAR(8)', isPk: false, isFk: true, fkTarget: 'SALES(transNo)', description: 'Invoice being settled' },
    ],
  },

  CUSTOMER: {
    name: 'CUSTOMER',
    module: 'customer',
    label: 'Customer Accounts',
    description: 'The list of customers with their addresses and how long they have to pay.',
    x: 350,
    y: 560,
    width: 210,
    height: 160,
    fallbackRowCount: 82,
    sampleScreenView: 'Customer directory: custNo, custName, address, payTerms (COD, 30D, 45D), ordersPlaced, totalPaid',
    usedByPages: [
      { title: 'Customer Directory', href: '/customers', moduleKey: 'customer', mode: 'read-write' },
      { title: 'Customer Account Profile', href: '/customers/C0001', moduleKey: 'customer', mode: 'read-write' },
      { title: 'Top Customers Report', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'custNo', type: 'VARCHAR(5)', isPk: true, isFk: false, description: 'Unique customer client number' },
      { name: 'custName', type: 'VARCHAR(20)', isPk: false, isFk: false, description: 'Corporate entity or contact name' },
      { name: 'address', type: 'VARCHAR(50)', isPk: false, isFk: false, description: 'Official billing/shipping address' },
      { name: 'payTerms', type: 'VARCHAR(3)', isPk: false, isFk: false, description: "Credit terms: 'COD', '30D', or '45D' (maps to payterm)" },
    ],
  },

  PRICEHIST: {
    name: 'PRICEHIST',
    module: 'products',
    label: 'Price Schedules',
    description: "Each product's price over time, so old sales keep the price they were sold at.",
    x: 660,
    y: 560,
    width: 200,
    height: 145,
    fallbackRowCount: 79,
    sampleScreenView: 'Price audit modal: effDate, unitPrice (₱), active indicator, price history timeline',
    usedByPages: [
      { title: 'Product Pricing Schedule', href: '/products', moduleKey: 'products', mode: 'read-write' },
      { title: 'Dynamic Sales Calculations', href: '/sales', moduleKey: 'sales', mode: 'read' },
      { title: 'Reports Price Resolution', href: '/reports', moduleKey: 'reports', mode: 'read' },
    ],
    columns: [
      { name: 'effDate', type: 'DATE', isPk: true, isFk: false, isCompositePk: true, description: 'Price effective start date' },
      { name: 'prodCode', type: 'VARCHAR(6)', isPk: true, isFk: true, isCompositePk: true, fkTarget: 'PRODUCT(prodCode)', description: 'Catalog item SKU' },
      { name: 'unitPrice', type: 'DECIMAL(10,2)', isPk: false, isFk: false, description: 'Price per unit in PHP (CHECK > 0)' },
    ],
  },
};

export interface RelationshipDefinition {
  id: string;
  parent: string;
  child: string;
  verb: string;
  label: string;
  plainSentence: string;
  cardinalityText: string;
  parentCardinality: '1' | '0..1';
  childCardinality: '0..*' | '1..*';
  fkCols: string;
  codeCitation: string;
  joinSQL: string;
  usedByPages: string[];
  functionKeys: string[];
  pathD: string;
  labelPos: { x: number; y: number };
  parentSide: 'top' | 'bottom' | 'left' | 'right';
  childSide: 'top' | 'bottom' | 'left' | 'right';
}

export const DATA_MODEL_RELATIONSHIPS: RelationshipDefinition[] = [
  // 1. EMPLOYEE has JOBHISTORY (Horizontal Row 1)
  {
    id: 'rel-emp-jobhistory',
    parent: 'EMPLOYEE',
    child: 'JOBHISTORY',
    verb: 'has',
    label: 'EMPLOYEE has JOBHISTORY',
    plainSentence: 'One employee can have many job history records over time.',
    cardinalityText: 'One employee has zero or many job history records',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'JOBHISTORY.empNo -> EMPLOYEE.empNo',
    codeCitation: 'getEmployeesPageData() in src/lib/data/employees.ts',
    joinSQL: 'FROM EMPLOYEE e LEFT JOIN ... JOBHISTORY jh ON jh.empNo = e.empNo',
    usedByPages: ['/employees', '/employees/[empNo]', '/reports'],
    functionKeys: ['hr-lifecycle', 'executive-reports'],
    pathD: 'M 250 140 L 350 140',
    labelPos: { x: 300, y: 128 },
    parentSide: 'right',
    childSide: 'left',
  },

  // 2. JOB includes JOBHISTORY (Horizontal Row 1)
  {
    id: 'rel-job-jobhistory',
    parent: 'JOB',
    child: 'JOBHISTORY',
    verb: 'includes',
    label: 'JOB includes JOBHISTORY',
    plainSentence: 'One job title can be held by many employees.',
    cardinalityText: 'One job title includes zero or many job history assignments',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'JOBHISTORY.jobCode -> JOB.jobCode',
    codeCitation: 'getEmployeesPageData() / getEmployeeJobHistory() in src/lib/data/employees.ts',
    joinSQL: 'JOBHISTORY jh JOIN JOB j ON j.jobCode = jh.jobCode',
    usedByPages: ['/employees', '/employees/[empNo]', '/reports'],
    functionKeys: ['hr-lifecycle', 'executive-reports'],
    pathD: 'M 660 95 L 560 95',
    labelPos: { x: 610, y: 83 },
    parentSide: 'left',
    childSide: 'right',
  },

  // 3. DEPARTMENT works at JOBHISTORY (Stepped Row 1)
  {
    id: 'rel-dept-jobhistory',
    parent: 'DEPARTMENT',
    child: 'JOBHISTORY',
    verb: 'works at',
    label: 'DEPARTMENT works at JOBHISTORY',
    plainSentence: 'One department can have many employee assignments over time.',
    cardinalityText: 'One department is the workplace for zero or many job history assignments',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'JOBHISTORY.deptCode -> DEPARTMENT.deptCode',
    codeCitation: 'getEmployeesPageData() / getEmployeeJobHistory() in src/lib/data/employees.ts',
    joinSQL: 'JOBHISTORY jh JOIN DEPARTMENT d ON d.deptCode = jh.deptCode',
    usedByPages: ['/employees', '/employees/[empNo]', '/reports'],
    functionKeys: ['hr-lifecycle', 'executive-reports'],
    pathD: 'M 660 215 L 610 215 L 610 160 L 560 160',
    labelPos: { x: 615, y: 198 },
    parentSide: 'left',
    childSide: 'right',
  },

  // 4. EMPLOYEE generates SALES (Vertical Col 1)
  {
    id: 'rel-emp-sales',
    parent: 'EMPLOYEE',
    child: 'SALES',
    verb: 'generates',
    label: 'EMPLOYEE generates SALES',
    plainSentence: 'One staff member can make many customer sales.',
    cardinalityText: 'One sales representative generates zero or many sales orders',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'SALES.empNo -> EMPLOYEE.empNo',
    codeCitation: 'getSalesPageData() in src/lib/data/sales.ts',
    joinSQL: 'SALES s LEFT JOIN EMPLOYEE e ON e.empNo = s.empNo',
    usedByPages: ['/sales', '/sales/new', '/sales/[transNo]', '/', '/reports'],
    functionKeys: ['record-sale', 'home-stats', 'executive-reports'],
    pathD: 'M 145 265 L 145 330',
    labelPos: { x: 100, y: 298 },
    parentSide: 'bottom',
    childSide: 'top',
  },

  // 5. CUSTOMER pays SALES (Stepped Col 2 -> Col 1)
  {
    id: 'rel-cust-sales',
    parent: 'CUSTOMER',
    child: 'SALES',
    verb: 'pays',
    label: 'CUSTOMER pays SALES',
    plainSentence: 'One customer can have many sales.',
    cardinalityText: 'One customer pays for zero or many sales transactions',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'SALES.custNo -> CUSTOMER.custNo',
    codeCitation: 'getSalesPageData() in src/lib/data/sales.ts',
    joinSQL: 'SALES s LEFT JOIN CUSTOMER c ON c.custNo = s.custNo',
    usedByPages: ['/sales', '/customers', '/customers/[custNo]', '/', '/reports'],
    functionKeys: ['record-sale', 'issue-payment', 'home-stats', 'executive-reports'],
    pathD: 'M 350 640 L 285 640 L 285 435 L 250 435',
    labelPos: { x: 275, y: 535 },
    parentSide: 'left',
    childSide: 'right',
  },

  // 6. SALES contains SALESDETAIL (Horizontal Row 2)
  {
    id: 'rel-sales-detail',
    parent: 'SALES',
    child: 'SALESDETAIL',
    verb: 'contains',
    label: 'SALES contains SALESDETAIL',
    plainSentence: 'One sale can contain many items.',
    cardinalityText: 'One sale invoice contains one or many line item details',
    parentCardinality: '1',
    childCardinality: '1..*',
    fkCols: 'SALESDETAIL.transNo -> SALES.transNo',
    codeCitation: 'getSaleDetail() in src/lib/data/sales.ts',
    joinSQL: 'SALESDETAIL sd JOIN SALES s ON s.transNo = sd.transNo',
    usedByPages: ['/sales/[transNo]', '/', '/reports'],
    functionKeys: ['record-sale', 'home-stats', 'executive-reports'],
    pathD: 'M 250 410 L 350 410',
    labelPos: { x: 300, y: 398 },
    parentSide: 'right',
    childSide: 'left',
  },

  // 7. PRODUCT specifies SALESDETAIL (Horizontal Row 2)
  {
    id: 'rel-prod-salesdetail',
    parent: 'PRODUCT',
    child: 'SALESDETAIL',
    verb: 'specifies',
    label: 'PRODUCT specifies SALESDETAIL',
    plainSentence: 'One product can be ordered in many sales.',
    cardinalityText: 'One product item is specified in zero or many sales detail line items',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'SALESDETAIL.prodCode -> PRODUCT.prodCode',
    codeCitation: 'getSaleDetail() in src/lib/data/sales.ts',
    joinSQL: 'SALESDETAIL sd LEFT JOIN PRODUCT p ON p.prodCode = sd.prodCode',
    usedByPages: ['/sales', '/sales/[transNo]', '/products', '/reports'],
    functionKeys: ['record-sale', 'home-stats', 'executive-reports'],
    pathD: 'M 660 410 L 560 410',
    labelPos: { x: 610, y: 398 },
    parentSide: 'left',
    childSide: 'right',
  },

  // 8. SALES makes PAYMENT (Vertical Col 1)
  {
    id: 'rel-sales-payment',
    parent: 'SALES',
    child: 'PAYMENT',
    verb: 'makes',
    label: 'SALES makes PAYMENT',
    plainSentence: 'One sale can receive many payments.',
    cardinalityText: 'One sale transaction receives zero, one, or multiple payment installments',
    parentCardinality: '1',
    childCardinality: '0..*',
    fkCols: 'PAYMENT.transNo -> SALES.transNo',
    codeCitation: 'getPaymentsPageData() in src/lib/data/payments.ts',
    joinSQL: 'PAYMENT p JOIN SALES s ON s.transNo = p.transNo',
    usedByPages: ['/payments', '/payments/[orNo]', '/receipts/[orNo]', '/'],
    functionKeys: ['issue-payment', 'home-stats'],
    pathD: 'M 145 490 L 145 560',
    labelPos: { x: 100, y: 525 },
    parentSide: 'bottom',
    childSide: 'top',
  },

  // 9. PRODUCT lists PRICEHIST (Vertical Col 3)
  {
    id: 'rel-prod-pricehist',
    parent: 'PRODUCT',
    child: 'PRICEHIST',
    verb: 'lists',
    label: 'PRODUCT lists PRICEHIST',
    plainSentence: 'One product can have many scheduled prices over time.',
    cardinalityText: 'One product item lists one or many historical effective prices',
    parentCardinality: '1',
    childCardinality: '1..*',
    fkCols: 'PRICEHIST.prodCode -> PRODUCT.prodCode',
    codeCitation: 'getProductsPageData() in src/lib/data/products.ts',
    joinSQL: 'PRICEHIST ph JOIN PRODUCT p ON p.prodCode = ph.prodCode',
    usedByPages: ['/products', '/products/[prodCode]', '/sales', '/', '/reports'],
    functionKeys: ['record-sale', 'product-pricing', 'home-stats', 'executive-reports'],
    pathD: 'M 760 475 L 760 560',
    labelPos: { x: 785, y: 518 },
    parentSide: 'bottom',
    childSide: 'top',
  },
];

export interface WebsiteFunction {
  id: string;
  name: string;
  tagline: string;
  color: string;
  dashArray: string;
  involvedTableNames: string[];
  involvedRelationshipIds: string[];
  steps: Array<{
    step: number;
    title: string;
    description: string;
    table: string;
  }>;
}

export const WEBSITE_FUNCTIONS: WebsiteFunction[] = [
  {
    id: 'record-sale',
    name: 'Record a Sale',
    tagline: 'Complete 3NF sales checkout flow verified against NewSaleModal.tsx',
    color: '#2563eb', // Royal Blue
    dashArray: 'none', // solid line
    involvedTableNames: ['CUSTOMER', 'EMPLOYEE', 'SALES', 'SALESDETAIL', 'PRODUCT', 'PRICEHIST'],
    involvedRelationshipIds: ['rel-cust-sales', 'rel-emp-sales', 'rel-sales-detail', 'rel-prod-salesdetail', 'rel-prod-pricehist'],
    steps: [
      { step: 1, title: 'Pick Customer in Modal', table: 'CUSTOMER', description: 'Select client debtor entity from the customer dropdown; checks credit terms (COD, 30D, 45D).' },
      { step: 2, title: 'Select Salesperson', table: 'EMPLOYEE', description: 'Select the active sales representative from the salesperson dropdown inside NewSaleModal.' },
      { step: 3, title: 'Create Sales Header', table: 'SALES', description: 'Set order date and submit form to generate unique transNo (TR000125) via createSaleHeaderAction.' },
      { step: 4, title: 'Select Line Product', table: 'PRODUCT', description: 'In Sale Details drawer, pick item SKU and unit of measure.' },
      { step: 5, title: 'Resolve Effective Price', table: 'PRICEHIST', description: 'Query latest unitPrice where effDate <= salesDate at checkout time.' },
      { step: 6, title: 'Commit Detail Line', table: 'SALESDETAIL', description: 'Specify quantity; multiply by resolved price and insert detail line via addLineItemAction.' },
    ],
  },
  {
    id: 'issue-payment',
    name: 'Issue Payment / Receipt',
    tagline: 'Customer billing settlement & official collection issuance',
    color: '#10b981', // Emerald Green
    dashArray: '8 4', // dashed line
    involvedTableNames: ['CUSTOMER', 'SALES', 'PAYMENT'],
    involvedRelationshipIds: ['rel-cust-sales', 'rel-sales-payment'],
    steps: [
      { step: 1, title: 'Locate Outstanding Sale', table: 'SALES', description: 'Look up customer invoice with uncollected open balance.' },
      { step: 2, title: 'Verify Ledger Balance', table: 'PAYMENT', description: 'Sum existing payments against computed invoice total in getPaymentsPageData().' },
      { step: 3, title: 'Issue Official Receipt', table: 'PAYMENT', description: 'Record ORNo, payment date, and collected amount via recordPaymentAction().' },
    ],
  },
  {
    id: 'product-pricing',
    name: 'Product Pricing & Catalog',
    tagline: 'Item master management & temporal price scheduling',
    color: '#f59e0b', // Amber
    dashArray: '2 4', // dotted line
    involvedTableNames: ['PRODUCT', 'PRICEHIST'],
    involvedRelationshipIds: ['rel-prod-pricehist'],
    steps: [
      { step: 1, title: 'Register Catalog Item', table: 'PRODUCT', description: 'Create SKU prodCode, item description, and unit via addProductAction.' },
      { step: 2, title: 'Schedule Initial Price', table: 'PRICEHIST', description: 'Set mandatory starting effective price for day 1.' },
      { step: 3, title: 'Future Price Adjustments', table: 'PRICEHIST', description: 'Append future effective price points without altering past sale records.' },
    ],
  },
  {
    id: 'hr-lifecycle',
    name: 'HR & Job History',
    tagline: 'Personnel onboarding, promotions, and departmental postings',
    color: '#8b5cf6', // Violet
    dashArray: '10 3 2 3', // dash-dot line
    involvedTableNames: ['EMPLOYEE', 'JOBHISTORY', 'JOB', 'DEPARTMENT'],
    involvedRelationshipIds: ['rel-emp-jobhistory', 'rel-job-jobhistory', 'rel-dept-jobhistory'],
    steps: [
      { step: 1, title: 'Onboard Employee', table: 'EMPLOYEE', description: 'Record biographical profile, gender, birth date, and hire date via addEmployeeAction.' },
      { step: 2, title: 'Assign Job Title', table: 'JOB', description: 'Select corporate occupational classification (e.g. ACCT, ENGR, SLSREP).' },
      { step: 3, title: 'Assign Department', table: 'DEPARTMENT', description: 'Attach corporate division and cost center.' },
      { step: 4, title: 'Record History Contract', table: 'JOBHISTORY', description: 'Set base compensation and effective start date in addJobHistoryAction.' },
    ],
  },
  {
    id: 'executive-reports',
    name: 'Executive Reports',
    tagline: '7 reports reading 9 tables (PAYMENT is not read by any report)',
    color: '#ec4899', // Pink
    dashArray: '12 5', // long-dash line
    involvedTableNames: ['CUSTOMER', 'PRODUCT', 'PRICEHIST', 'SALES', 'SALESDETAIL', 'EMPLOYEE', 'JOBHISTORY', 'JOB', 'DEPARTMENT'],
    involvedRelationshipIds: [
      'rel-emp-jobhistory', 'rel-job-jobhistory', 'rel-dept-jobhistory',
      'rel-emp-sales', 'rel-cust-sales', 'rel-sales-detail',
      'rel-prod-salesdetail', 'rel-prod-pricehist'
    ],
    steps: [
      { step: 1, title: 'Top Customers (4 tables)', table: 'CUSTOMER, SALES, SALESDETAIL, PRICEHIST', description: 'Calculates purchases per client using ordered quantities and scheduled prices (getTopCustomers).' },
      { step: 2, title: 'Product Master List (2 tables)', table: 'PRODUCT, PRICEHIST', description: 'Lists active products with their latest scheduled unit price (getProductMasterList).' },
      { step: 3, title: 'Top Products (4 tables)', table: 'PRODUCT, SALESDETAIL, SALES, PRICEHIST', description: 'Ranks products by sales amount using line item quantities and scheduled prices (getTopProducts).' },
      { step: 4, title: 'Active & All Staff (1 table)', table: 'EMPLOYEE', description: 'Lists staff with no separation date, plus complete historical staff roster (getActiveEmployees, getAllEmployeesReport).' },
      { step: 5, title: 'Job History (4 tables)', table: 'JOBHISTORY, JOB, DEPARTMENT, EMPLOYEE', description: 'Shows job progression, salary changes, and department postings for selected staff (getEmployeeJobHistoryReport).' },
      { step: 6, title: 'Top Sales (5 tables)', table: 'SALES, CUSTOMER, EMPLOYEE, SALESDETAIL, PRICEHIST', description: 'Ranks sales transactions by total value linking customer, salesperson, and line items (getTopSales).' },
      { step: 7, title: 'Report Note (PAYMENT excluded)', table: 'PAYMENT EXCLUDED', description: 'PAYMENT is not read by any of the 7 executive reports. Sales reports measure billed amounts, not cash collected.' },
    ],
  },
  {
    id: 'home-stats',
    name: 'Home Monitoring Stats',
    tagline: '4 stat cards reading 7 tables (the full 10-table check is a separate database probe)',
    color: '#6366f1', // Indigo
    dashArray: '6 3 6 3 2 3', // dual-dash-dot
    involvedTableNames: ['SALES', 'SALESDETAIL', 'PRODUCT', 'PRICEHIST', 'CUSTOMER', 'PAYMENT', 'EMPLOYEE'],
    involvedRelationshipIds: [
      'rel-emp-sales', 'rel-cust-sales', 'rel-sales-detail',
      'rel-prod-salesdetail', 'rel-sales-payment', 'rel-prod-pricehist'
    ],
    steps: [
      { step: 1, title: 'Total Sales (4 tables)', table: 'SALESDETAIL, PRICEHIST, SALES, PRODUCT', description: 'Computes total sales (₱688,935.47) by multiplying line quantities (SALESDETAIL) by prices scheduled on sale dates (PRICEHIST).' },
      { step: 2, title: 'Transactions & Customers (2 tables)', table: 'SALES, CUSTOMER', description: 'Counts 124 completed sales orders (SALES) and links the 82 customer accounts (CUSTOMER).' },
      { step: 3, title: 'Total Payments (1 table)', table: 'PAYMENT', description: 'Sums cash and check collections from 165 official receipts (₱665,326.58).' },
      { step: 4, title: 'Active Staff (1 table)', table: 'EMPLOYEE', description: 'Counts current employees who have no separation date (27 active of 32 staff).' },
      { step: 5, title: 'Health Check Note (Separate Probe)', table: 'ALL 10 TABLES', description: 'The all-10-table scan is a separate database integrity probe via /api/health/db, not part of the 4 KPI cards.' },
    ],
  },
];

// ========================================================================
// NON-TECHNICAL PLAIN-ENGLISH SUMMARIES & SIDEBAR LOCATION MAPPING
// Verified against real codebase routes, queries, and reports (Step 1 audit)
// ========================================================================

export interface TablePlainEnglishInfo {
  name: string;
  howItIsUsed: string;
  whereToFind: Array<{
    label: string;
    href: string;
  }>;
}

export const TABLE_PLAIN_ENGLISH: Record<string, TablePlainEnglishInfo> = {
  EMPLOYEE: {
    name: 'EMPLOYEE',
    howItIsUsed:
      'Lists all company staff, whether they still work here, and which staff member handled each sale.',
    whereToFind: [
      { label: 'Human Resources', href: '/employees' },
      { label: 'Sales (Cashier/Handler)', href: '/sales' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  JOBHISTORY: {
    name: 'JOBHISTORY',
    howItIsUsed:
      "Keeps each employee's work record over time: jobs held, salary and department.",
    whereToFind: [
      { label: 'Human Resources', href: '/employees' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  JOB: {
    name: 'JOB',
    howItIsUsed:
      'The list of job titles staff can be given.',
    whereToFind: [
      { label: 'Human Resources', href: '/employees' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  DEPARTMENT: {
    name: 'DEPARTMENT',
    howItIsUsed:
      'The list of departments where staff work.',
    whereToFind: [
      { label: 'Human Resources', href: '/employees' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  SALES: {
    name: 'SALES',
    howItIsUsed:
      'One entry per sale: who bought, which staff member sold it, and when.',
    whereToFind: [
      { label: 'Sales', href: '/sales' },
      { label: 'Customer', href: '/customers' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  SALESDETAIL: {
    name: 'SALESDETAIL',
    howItIsUsed:
      'The items and quantities listed on each sale.',
    whereToFind: [
      { label: 'Sales', href: '/sales' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  PRODUCT: {
    name: 'PRODUCT',
    howItIsUsed:
      'The catalog of computer parts the company sells.',
    whereToFind: [
      { label: 'Products', href: '/products' },
      { label: 'Sales', href: '/sales' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  PRICEHIST: {
    name: 'PRICEHIST',
    howItIsUsed:
      "Each product's price over time, so old sales keep the price they were sold at.",
    whereToFind: [
      { label: 'Products', href: '/products' },
      { label: 'Sales', href: '/sales' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
  PAYMENT: {
    name: 'PAYMENT',
    howItIsUsed:
      'Money received from customers, with an official receipt for each payment, matched to the sale it pays for.',
    whereToFind: [
      { label: 'Payments', href: '/payments' },
      { label: 'Home', href: '/' },
    ],
  },
  CUSTOMER: {
    name: 'CUSTOMER',
    howItIsUsed:
      'The list of customers with their addresses and how long they have to pay.',
    whereToFind: [
      { label: 'Customer', href: '/customers' },
      { label: 'Sales', href: '/sales' },
      { label: 'Home', href: '/' },
      { label: 'Reports', href: '/reports' },
    ],
  },
};

