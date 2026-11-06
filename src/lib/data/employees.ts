import { getHopeDb, type DatabaseSync } from '@/lib/hope-db';

// ========================================================================
// TYPES & CONTRACTS
// ========================================================================

export interface EmployeeItem {
  empNo: string;
  lastName: string;
  firstName: string;
  fullName: string;
  gender: string;
  birthDate: string;
  hireDate: string;
  sepDate: string | null;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
  currentJobCode: string | null;
  currentJobDesc: string | null;
  currentDeptCode: string | null;
  currentDeptName: string | null;
  currentSalary: number | null;
  currentEffDate: string | null;
}

export interface JobItem {
  jobCode: string;
  jobDesc: string;
  isDeleted?: boolean;
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
  activeStaffCount?: number;
}

export interface DepartmentItem {
  deptCode: string;
  deptName: string;
  isDeleted?: boolean;
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
  activeStaffCount?: number;
}

export interface JobHistoryRecord {
  empNo: string;
  jobCode: string;
  jobDesc: string;
  deptCode: string;
  deptName: string;
  effDate: string;
  salary: number | null;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface HumanResourcesMetrics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  deptDistribution: Record<string, number>;
  nextSuggestedEmpNo: string;
  nextSuggestedJobCode: string;
  nextSuggestedDeptCode: string;
}

export interface HumanResourcesAuditItem {
  auditId: number;
  tableName: 'EMPLOYEE' | 'JOB' | 'DEPARTMENT' | 'JOBHISTORY' | string;
  action: 'ADD' | 'EDIT' | 'DELETE' | 'RESTORE' | string;
  recordKey: string;
  oldValues: string | null;
  newValues: string | null;
  actionBy: string;
  actionAt: string;
}

export interface HumanResourcesPageData {
  employees: EmployeeItem[];
  jobs: JobItem[];
  departments: DepartmentItem[];
  jobHistory: JobHistoryRecord[];
  metrics: HumanResourcesMetrics;
  recentAudits: HumanResourcesAuditItem[];
}

// Backwards compatibility interfaces
export interface EmployeeDirectoryItem {
  empNo: number;
  lastName: string;
  firstName: string;
  fullName: string;
  gender: string;
  genderDisplay: string;
  birthDate: string;
  hireDate: string;
  sepDate: string | null;
  employmentStatus: 'Active' | 'Separated';
  tenureDays: number;
  tenureText: string;
  jobCode: string;
  jobDesc: string;
  deptCode: string;
  deptName: string;
  salary: number | null;
  currentJobEffDate: string;
}

export interface DepartmentStat {
  deptCode: string;
  deptName: string;
  activeCount: number;
  separatedCount: number;
  totalCount: number;
}

export interface JobHistoryItem {
  empNo: number;
  jobCode: string;
  jobDesc: string;
  effDate: string;
  deptCode: string;
  deptName: string;
  salary: number | null;
  isCurrent: boolean;
}

export interface EmployeeDetailPageData {
  employee: EmployeeDirectoryItem;
  currentAssignment: {
    jobCode: string;
    jobDesc: string;
    deptCode: string;
    deptName: string;
    salary: number | null;
    effDate: string;
  };
  history: JobHistoryItem[];
  latestSaleDate: string | null;
}

export function calculateTenureText(hireDateStr: string, sepDateStr?: string | null): string {
  if (!hireDateStr) return '-';
  const start = new Date(hireDateStr);
  const end = sepDateStr ? new Date(sepDateStr) : new Date();
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0 && months > 0) return `${years} yr${years > 1 ? 's' : ''}, ${months} mo${months > 1 ? 's' : ''}`;
  if (years > 0) return `${years} yr${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} mo${months > 1 ? 's' : ''}`;
  return 'Less than 1 month';
}

function getSqliteDb(): DatabaseSync {
  return getHopeDb();
}

/**
 * Main Data Fetcher for Human Resources (Section 3.5: Employees, Jobs, Departments, Job History)
 */
export async function getHumanResourcesPageData(
  userRole: string = 'admin'
): Promise<HumanResourcesPageData> {
  const db = getSqliteDb();
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';

  // 1. Query all employees with derived current job assignment
  const empRows = db.prepare(`
    SELECT 
      e.empNo, 
      e.lastName, 
      e.firstName, 
      e.gender, 
      e.birthDate, 
      e.hireDate, 
      e.sepDate, 
      e.is_deleted, 
      e.stamp,
      (
        SELECT jh.jobCode 
        FROM JOBHISTORY jh 
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentJobCode,
      (
        SELECT j.jobDesc 
        FROM JOBHISTORY jh 
        JOIN JOB j ON j.jobCode = jh.jobCode
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentJobDesc,
      (
        SELECT jh.deptCode 
        FROM JOBHISTORY jh 
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentDeptCode,
      (
        SELECT d.deptName 
        FROM JOBHISTORY jh 
        JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentDeptName,
      (
        SELECT jh.salary 
        FROM JOBHISTORY jh 
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentSalary,
      (
        SELECT jh.effDate 
        FROM JOBHISTORY jh 
        WHERE jh.empNo = e.empNo 
          AND jh.is_deleted = 0
          AND jh.effDate <= date('now', '+8 hours')
        ORDER BY jh.effDate DESC 
        LIMIT 1
      ) AS currentEffDate
    FROM EMPLOYEE e
    ORDER BY e.empNo ASC
  `).all() as any[];

  const employees: EmployeeItem[] = empRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    const isSeparated = r.sepDate != null && String(r.sepDate).trim() !== '';
    const isInactive = isDeleted || isSeparated;

    return {
      empNo: String(r.empNo),
      lastName: String(r.lastName || ''),
      firstName: String(r.firstName || ''),
      fullName: `${String(r.firstName || '')} ${String(r.lastName || '')}`.trim(),
      gender: String(r.gender || 'M').toUpperCase(),
      birthDate: String(r.birthDate || ''),
      hireDate: String(r.hireDate || ''),
      sepDate: r.sepDate ? String(r.sepDate) : null,
      isDeleted,
      status: isInactive ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
      currentJobCode: r.currentJobCode ? String(r.currentJobCode) : null,
      currentJobDesc: r.currentJobDesc ? String(r.currentJobDesc) : null,
      currentDeptCode: r.currentDeptCode ? String(r.currentDeptCode) : null,
      currentDeptName: r.currentDeptName ? String(r.currentDeptName) : null,
      currentSalary: isAdmin ? (r.currentSalary != null ? Number(r.currentSalary) : null) : null,
      currentEffDate: r.currentEffDate ? String(r.currentEffDate) : null,
    };
  });

  // 2. Query all Jobs
  const jobRows = db.prepare(`
    SELECT j.jobCode, j.jobDesc, j.is_deleted, j.stamp,
      (
        SELECT COUNT(DISTINCT jh.empNo)
        FROM JOBHISTORY jh
        JOIN EMPLOYEE e ON e.empNo = jh.empNo
        WHERE jh.jobCode = j.jobCode 
          AND jh.is_deleted = 0 
          AND e.is_deleted = 0 
          AND e.sepDate IS NULL
          AND jh.effDate = (
            SELECT MAX(jh2.effDate) 
            FROM JOBHISTORY jh2 
            WHERE jh2.empNo = jh.empNo 
              AND jh2.is_deleted = 0
              AND jh2.effDate <= date('now', '+8 hours')
          )
      ) AS activeStaffCount
    FROM JOB j
    ORDER BY j.jobCode ASC
  `).all() as any[];

  const jobs: JobItem[] = jobRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      jobCode: String(r.jobCode),
      jobDesc: String(r.jobDesc || ''),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
      activeStaffCount: Number(r.activeStaffCount || 0),
    };
  });

  // 3. Query all Departments
  const deptRows = db.prepare(`
    SELECT d.deptCode, d.deptName, d.is_deleted, d.stamp,
      (
        SELECT COUNT(DISTINCT jh.empNo)
        FROM JOBHISTORY jh
        JOIN EMPLOYEE e ON e.empNo = jh.empNo
        WHERE jh.deptCode = d.deptCode 
          AND jh.is_deleted = 0 
          AND e.is_deleted = 0 
          AND e.sepDate IS NULL
          AND jh.effDate = (
            SELECT MAX(jh2.effDate) 
            FROM JOBHISTORY jh2 
            WHERE jh2.empNo = jh.empNo 
              AND jh2.is_deleted = 0
              AND jh2.effDate <= date('now', '+8 hours')
          )
      ) AS activeStaffCount
    FROM DEPARTMENT d
    ORDER BY d.deptCode ASC
  `).all() as any[];

  const departments: DepartmentItem[] = deptRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      deptCode: String(r.deptCode),
      deptName: String(r.deptName || ''),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
      activeStaffCount: Number(r.activeStaffCount || 0),
    };
  });

  // 4. Query all Job History records
  const jhRows = db.prepare(`
    SELECT 
      jh.empNo, 
      jh.jobCode, 
      j.jobDesc, 
      jh.deptCode, 
      d.deptName, 
      jh.effDate, 
      jh.salary, 
      jh.is_deleted, 
      jh.stamp
    FROM JOBHISTORY jh
    LEFT JOIN JOB j ON j.jobCode = jh.jobCode
    LEFT JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
    ORDER BY jh.effDate DESC, jh.empNo ASC
  `).all() as any[];

  const jobHistory: JobHistoryRecord[] = jhRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      empNo: String(r.empNo),
      jobCode: String(r.jobCode),
      jobDesc: String(r.jobDesc || r.jobCode),
      deptCode: String(r.deptCode || ''),
      deptName: String(r.deptName || r.deptCode || ''),
      effDate: String(r.effDate),
      salary: isAdmin ? (r.salary != null ? Number(r.salary) : null) : null,
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  // 5. Compute Metrics
  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const inactiveEmployees = employees.filter((e) => e.status === 'Inactive').length;

  const activeJobs = jobs.filter((j) => !j.isDeleted).length;
  const inactiveJobs = jobs.filter((j) => j.isDeleted).length;

  const activeDepartments = departments.filter((d) => !d.isDeleted).length;
  const inactiveDepartments = departments.filter((d) => d.isDeleted).length;

  const deptDistribution: Record<string, number> = {};
  for (const emp of employees) {
    if (emp.status === 'Active' && emp.currentDeptName) {
      deptDistribution[emp.currentDeptName] = (deptDistribution[emp.currentDeptName] || 0) + 1;
    }
  }

  // Calculate next suggested EmpNo (VARCHAR(5))
  let maxEmpInt = 0;
  for (const emp of employees) {
    const num = parseInt(emp.empNo, 10);
    if (!isNaN(num) && num > maxEmpInt) {
      maxEmpInt = num;
    }
  }
  const nextSuggestedEmpNo = String(maxEmpInt + 2).padStart(5, '0');

  // Next suggested job code and dept code
  const nextSuggestedJobCode = `J${String(jobs.length + 1).padStart(3, '0')}`;
  const nextSuggestedDeptCode = `D${String(departments.length + 1).padStart(2, '0')}`;

  // 6. Query recent audit records for HR entities
  let recentAudits: HumanResourcesAuditItem[] = [];
  try {
    const auditRows = db.prepare(`
      SELECT audit_id, table_name, action, record_key, old_values, new_values, action_by, action_at
      FROM audit_log
      WHERE table_name IN ('EMPLOYEE', 'JOB', 'DEPARTMENT', 'JOBHISTORY')
      ORDER BY audit_id DESC
      LIMIT 30
    `).all() as any[];

    recentAudits = auditRows.map((a) => ({
      auditId: Number(a.audit_id),
      tableName: String(a.table_name),
      action: a.action,
      recordKey: String(a.record_key || ''),
      oldValues: a.old_values ? String(a.old_values) : null,
      newValues: a.new_values ? String(a.new_values) : null,
      actionBy: String(a.action_by || 'system'),
      actionAt: String(a.action_at || ''),
    }));
  } catch {
    // Audit table may be empty or inaccessible
  }

  return {
    employees,
    jobs,
    departments,
    jobHistory,
    metrics: {
      totalEmployees: employees.length,
      activeEmployees,
      inactiveEmployees,
      totalJobs: jobs.length,
      activeJobs,
      inactiveJobs,
      totalDepartments: departments.length,
      activeDepartments,
      inactiveDepartments,
      deptDistribution,
      nextSuggestedEmpNo,
      nextSuggestedJobCode,
      nextSuggestedDeptCode,
    },
    recentAudits,
  };
}

// ========================================================================
// LEGACY COMPATIBILITY HELPERS
// ========================================================================

export async function getEmployeesDirectory(userRole: string = 'admin') {
  const data = await getHumanResourcesPageData(userRole);
  const items: EmployeeDirectoryItem[] = data.employees.map((emp) => ({
    empNo: Number(emp.empNo),
    lastName: emp.lastName,
    firstName: emp.firstName,
    fullName: emp.fullName,
    gender: emp.gender,
    genderDisplay: emp.gender === 'M' ? 'Male' : emp.gender === 'F' ? 'Female' : emp.gender,
    birthDate: emp.birthDate,
    hireDate: emp.hireDate,
    sepDate: emp.sepDate,
    employmentStatus: emp.status === 'Active' ? 'Active' : 'Separated',
    tenureDays: 0,
    tenureText: calculateTenureText(emp.hireDate, emp.sepDate),
    jobCode: emp.currentJobCode || 'N/A',
    jobDesc: emp.currentJobDesc || 'Unassigned',
    deptCode: emp.currentDeptCode || 'N/A',
    deptName: emp.currentDeptName || 'Unassigned',
    salary: emp.currentSalary,
    currentJobEffDate: emp.currentEffDate || emp.hireDate,
  }));

  const deptStats: DepartmentStat[] = data.departments.map((d) => ({
    deptCode: d.deptCode,
    deptName: d.deptName,
    activeCount: d.activeStaffCount ?? 0,
    separatedCount: 0,
    totalCount: d.activeStaffCount ?? 0,
  }));

  return {
    items,
    departments: deptStats,
    totalActiveCount: data.metrics.activeEmployees,
  };
}

export async function getEmployeeDetailPageData(
  empNo: number | string,
  userRole: string = 'admin'
): Promise<EmployeeDetailPageData | null> {
  const db = getSqliteDb();
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';
  const rawStr = String(empNo).trim();
  const formattedEmpNo = rawStr.padStart(5, '0');

  const empRow = db.prepare('SELECT * FROM EMPLOYEE WHERE empNo = ? OR empNo = ?').get(formattedEmpNo, rawStr) as any;
  if (!empRow) return null;

  const hireDate = String(empRow.hireDate || '');
  const sepDate = empRow.sepDate ? String(empRow.sepDate) : null;
  const genderRaw = String(empRow.gender || 'M').toUpperCase();
  const genderDisplay = genderRaw === 'M' ? 'Male' : genderRaw === 'F' ? 'Female' : genderRaw;

  const rawHistory = db.prepare(`
    SELECT 
      jh.empNo,
      jh.jobCode,
      j.jobDesc,
      jh.deptCode,
      d.deptName,
      jh.salary,
      jh.effDate
    FROM JOBHISTORY jh
    LEFT JOIN JOB j ON j.jobCode = jh.jobCode
    LEFT JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
    WHERE (jh.empNo = ? OR jh.empNo = ?) AND jh.is_deleted = 0
    ORDER BY jh.effDate DESC
  `).all(formattedEmpNo, rawStr) as any[];

  const todayStr = new Date().toISOString().slice(0, 10);
  let currentFound = false;

  const history: JobHistoryItem[] = rawHistory.map((row) => {
    const isCurrent = !currentFound && row.effDate <= todayStr;
    if (isCurrent) currentFound = true;

    return {
      empNo: Number(row.empNo),
      jobCode: String(row.jobCode),
      jobDesc: String(row.jobDesc || row.jobCode),
      effDate: String(row.effDate),
      deptCode: String(row.deptCode || ''),
      deptName: String(row.deptName || ''),
      salary: isAdmin ? (row.salary != null ? Number(row.salary) : null) : null,
      isCurrent,
    };
  });

  const currentAss = history.find((h) => h.isCurrent) || history[0] || {
    jobCode: 'N/A',
    jobDesc: 'Unassigned',
    deptCode: 'N/A',
    deptName: 'Unassigned',
    salary: null,
    effDate: hireDate,
  };

  const latestSale = db.prepare(`
    SELECT MAX(salesDate) AS latestSaleDate
    FROM SALES
    WHERE empNo = ? OR empNo = ?
  `).get(formattedEmpNo, rawStr) as any;

  return {
    employee: {
      empNo: Number(empRow.empNo),
      lastName: String(empRow.lastName || ''),
      firstName: String(empRow.firstName || ''),
      fullName: `${String(empRow.firstName || '')} ${String(empRow.lastName || '')}`.trim(),
      gender: genderRaw,
      genderDisplay,
      birthDate: String(empRow.birthDate || ''),
      hireDate,
      sepDate,
      employmentStatus: (empRow.is_deleted === 1 || sepDate != null) ? 'Separated' : 'Active',
      tenureDays: 0,
      tenureText: calculateTenureText(hireDate, sepDate),
      jobCode: currentAss.jobCode,
      jobDesc: currentAss.jobDesc,
      deptCode: currentAss.deptCode,
      deptName: currentAss.deptName,
      salary: isAdmin ? currentAss.salary : null,
      currentJobEffDate: currentAss.effDate,
    },
    currentAssignment: {
      jobCode: currentAss.jobCode,
      jobDesc: currentAss.jobDesc,
      deptCode: currentAss.deptCode,
      deptName: currentAss.deptName,
      salary: currentAss.salary,
      effDate: currentAss.effDate,
    },
    history,
    latestSaleDate: latestSale?.latestSaleDate ? String(latestSale.latestSaleDate) : null,
  };
}

export async function getDepartmentsAndJobsLookups() {
  const db = getSqliteDb();

  const departments = db.prepare(`
    SELECT d.deptCode, d.deptName
    FROM DEPARTMENT d
    WHERE d.is_deleted = 0
    ORDER BY d.deptName ASC
  `).all() as any[];

  const jobs = db.prepare(`
    SELECT j.jobCode, j.jobDesc
    FROM JOB j
    WHERE j.is_deleted = 0
    ORDER BY j.jobDesc ASC
  `).all() as any[];

  return {
    departments: departments.map((d) => ({
      deptCode: String(d.deptCode),
      deptName: String(d.deptName),
    })),
    jobs: jobs.map((j) => ({
      jobCode: String(j.jobCode),
      jobDesc: String(j.jobDesc),
    })),
  };
}
