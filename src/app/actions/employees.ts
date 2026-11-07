'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb, sanitizeDbError, isDatabaseReadOnly, type HopeDatabase } from '@/lib/hope-db';
import { getCurrentUser, checkUserPermission } from './auth';

function getSqliteDb(): HopeDatabase {
  return getHopeDb();
}

function getStampString(action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED', byUser = 'system'): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  return `${action} ${byUser} ${dateStr} ${timeStr}`;
}

function getManilaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

async function ensureAdmin() {
  const user = await getCurrentUser();
  const role = (user?.role || '').toLowerCase();
  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    throw new Error('Access denied. Administrator privileges required.');
  }
  return user?.fullName || user?.email?.split('@')[0] || 'admin';
}

async function ensurePermission(rightCode: string) {
  const auth = await checkUserPermission(rightCode);
  if (!auth.authorized) {
    throw new Error(auth.error || `Access denied. Missing right '${rightCode}'.`);
  }
  return auth.user?.fullName || auth.user?.email?.split('@')[0] || 'staff';
}

async function logAudit(db: HopeDatabase, tableName: string, action: string, recordKey: string, oldValues: any, newValues: any, actionBy: string) {
  try {
    await db.run(`
      INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      tableName,
      action,
      recordKey,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      actionBy
    ]);
  } catch {
    // Non-blocking
  }
}

// ========================================================================
// SCHEMAS
// ========================================================================

const addEmployeeSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required').max(15, 'Last name max 15 chars (VARCHAR(15))'),
  firstName: z.string().trim().min(1, 'First name is required').max(15, 'First name max 15 chars (VARCHAR(15))'),
  gender: z.enum(['M', 'F', 'm', 'f']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid birth date (YYYY-MM-DD) is required'),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid hire date (YYYY-MM-DD) is required'),
  jobCode: z.string().trim().min(1, 'Job position is required').max(4),
  deptCode: z.string().trim().min(1, 'Department is required').max(4),
  salary: z.number().positive('Starting salary must be greater than zero'),
  effDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid effective date is required').optional(),
});

const updateEmployeeSchema = z.object({
  empNo: z.string().trim().min(1, 'Employee number is required').max(5),
  lastName: z.string().trim().min(1, 'Last name is required').max(15),
  firstName: z.string().trim().min(1, 'First name is required').max(15),
  gender: z.enum(['M', 'F', 'm', 'f']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid birth date is required'),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid hire date is required'),
  sepDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid separation date is required').optional().nullable(),
});

const jobSchema = z.object({
  jobCode: z.string().trim().min(1, 'Job code is required').max(4, 'Job code max 4 chars (VARCHAR(4))'),
  jobDesc: z.string().trim().min(1, 'Job description is required').max(20, 'Job description max 20 chars (VARCHAR(20))'),
});

const departmentSchema = z.object({
  deptCode: z.string().trim().min(1, 'Dept code is required').max(3, 'Dept code max 3 chars (VARCHAR(3))'),
  deptName: z.string().trim().min(1, 'Department name is required').max(20, 'Department name max 20 chars (VARCHAR(20))'),
});

const jobHistorySchema = z.object({
  empNo: z.string().trim().min(1, 'Employee number is required').max(5),
  jobCode: z.string().trim().min(1, 'Job position is required').max(4),
  deptCode: z.string().trim().min(1, 'Department is required').max(4),
  effDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid effective date (YYYY-MM-DD) is required'),
  salary: z.number().positive('Salary must be greater than zero'),
});

export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type AddJobInput = z.infer<typeof jobSchema>;
export type AddDepartmentInput = z.infer<typeof departmentSchema>;
export type JobHistoryInput = z.infer<typeof jobHistorySchema>;

// Backwards compatibility types
export type AddJobRecordInput = {
  empNo: number | string;
  jobCode: string;
  deptCode: string;
  effDate: string;
  salary: number;
};
export type SeparateEmployeeInput = {
  empNo: number | string;
  sepDate: string;
};

// ========================================================================
// EMPLOYEE ACTIONS
// ========================================================================

/**
 * 1. Add Employee (Atomic creation of EMPLOYEE + first JOBHISTORY row)
 */
export async function addEmployeeAction(input: AddEmployeeInput) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('add_employee');
    const validated = addEmployeeSchema.parse(input);
    const manilaToday = getManilaToday();

    if (validated.hireDate > manilaToday) {
      return { error: 'Hire date cannot be in the future.' };
    }

    // Age >= 18 on hire date
    const bDate = new Date(validated.birthDate);
    const hDate = new Date(validated.hireDate);
    const minHireDate = new Date(bDate.getFullYear() + 18, bDate.getMonth(), bDate.getDate());
    if (hDate < minHireDate) {
      return { error: 'Employee must be at least 18 years old on hire date.' };
    }

    const effDate = validated.effDate || validated.hireDate;
    if (effDate < validated.hireDate) {
      return { error: `Initial effective date (${effDate}) cannot be earlier than hire date (${validated.hireDate}).` };
    }

    const db = getSqliteDb();

    // Verify Job exists
    const jobExists = await db.get('SELECT 1 FROM JOB WHERE jobCode = ? AND is_deleted = 0', [validated.jobCode]);
    if (!jobExists) return { error: `Job code "${validated.jobCode}" is not active or does not exist.` };

    // Verify Department exists
    const deptExists = await db.get('SELECT 1 FROM DEPARTMENT WHERE deptCode = ? AND is_deleted = 0', [validated.deptCode]);
    if (!deptExists) return { error: `Department code "${validated.deptCode}" is not active or does not exist.` };

    await db.exec('BEGIN TRANSACTION');
    try {
      const maxRow = await db.get<any>(`
        SELECT COALESCE(MAX(CAST(empNo AS INTEGER)), 0) + 2 AS nextNum FROM EMPLOYEE
      `);
      const nextNum = Number(maxRow?.nextNum || 65);
      const nextEmpNo = String(nextNum).padStart(5, '0');
      const stampStr = getStampString('CREATED', userName);

      await db.run(`
        INSERT INTO EMPLOYEE (empNo, lastName, firstName, gender, birthDate, hireDate, sepDate, is_deleted, stamp)
        VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)
      `, [
        nextEmpNo,
        validated.lastName,
        validated.firstName,
        validated.gender.toUpperCase(),
        validated.birthDate,
        validated.hireDate,
        stampStr
      ]);

      await db.run(`
        INSERT INTO JOBHISTORY (empNo, jobCode, effDate, salary, deptCode, is_deleted, stamp)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `, [
        nextEmpNo,
        validated.jobCode,
        effDate,
        validated.salary,
        validated.deptCode,
        stampStr
      ]);

      await logAudit(db, 'EMPLOYEE', 'ADD', nextEmpNo, null, {
        empNo: nextEmpNo,
        lastName: validated.lastName,
        firstName: validated.firstName,
        gender: validated.gender.toUpperCase(),
        birthDate: validated.birthDate,
        hireDate: validated.hireDate,
      }, userName);

      await logAudit(db, 'JOBHISTORY', 'ADD', `${nextEmpNo}:${validated.jobCode}:${effDate}`, null, {
        empNo: nextEmpNo,
        jobCode: validated.jobCode,
        effDate,
        salary: validated.salary,
        deptCode: validated.deptCode,
      }, userName);

      await db.exec('COMMIT');
      revalidatePath('/employees');
      return { success: true, empNo: nextEmpNo };
    } catch (dbErr: any) {
      await db.exec('ROLLBACK').catch(() => {});
      return { error: sanitizeDbError(dbErr, 'Database error creating employee.') };
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid employee details' };
    }
    return { error: sanitizeDbError(err, 'Failed to add employee.') };
  }
}

/**
 * 2. Update Employee Personal Details
 */
export async function updateEmployeeAction(input: UpdateEmployeeInput) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('edit_employee');
    const validated = updateEmployeeSchema.parse(input);
    const manilaToday = getManilaToday();

    if (validated.hireDate > manilaToday) {
      return { error: 'Hire date cannot be in the future.' };
    }

    const bDate = new Date(validated.birthDate);
    const hDate = new Date(validated.hireDate);
    const minHireDate = new Date(bDate.getFullYear() + 18, bDate.getMonth(), bDate.getDate());
    if (hDate < minHireDate) {
      return { error: 'Employee must be at least 18 years old on hire date.' };
    }

    const cleanEmpNo = String(validated.empNo).trim().padStart(5, '0');
    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT * FROM EMPLOYEE WHERE empNo = ?', [cleanEmpNo]);
    if (!existing) return { error: `Employee ${cleanEmpNo} not found.` };

    const earliestJh = await db.get<any>(`
      SELECT MIN(effDate) AS earliestEffDate
      FROM JOBHISTORY
      WHERE empNo = ?
    `, [cleanEmpNo]);

    if (earliestJh?.earliestEffDate && validated.hireDate > earliestJh.earliestEffDate) {
      return { error: `Hire date cannot be later than earliest job history record (${earliestJh.earliestEffDate}).` };
    }

    const stampStr = getStampString('EDITED', userName);
    const sepVal = validated.sepDate && validated.sepDate.trim() !== '' ? validated.sepDate.trim() : null;

    await db.run(`
      UPDATE EMPLOYEE
      SET lastName = ?,
          firstName = ?,
          gender = ?,
          birthDate = ?,
          hireDate = ?,
          sepDate = ?,
          stamp = ?
      WHERE empNo = ?
    `, [
      validated.lastName,
      validated.firstName,
      validated.gender.toUpperCase(),
      validated.birthDate,
      validated.hireDate,
      sepVal,
      stampStr,
      cleanEmpNo
    ]);

    await logAudit(db, 'EMPLOYEE', 'EDIT', cleanEmpNo, {
      lastName: existing.lastName,
      firstName: existing.firstName,
      gender: existing.gender,
      birthDate: existing.birthDate,
      hireDate: existing.hireDate,
      sepDate: existing.sepDate,
    }, {
      lastName: validated.lastName,
      firstName: validated.firstName,
      gender: validated.gender.toUpperCase(),
      birthDate: validated.birthDate,
      hireDate: validated.hireDate,
      sepDate: sepVal,
    }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid employee details' };
    }
    return { error: sanitizeDbError(err, 'Failed to update employee.') };
  }
}

/**
 * 3. Soft-delete Employee
 */
export async function deleteEmployeeAction(empNo: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('delete_employee');
    const cleanEmpNo = String(empNo).trim().padStart(5, '0');
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted, sepDate FROM EMPLOYEE WHERE empNo = ?', [cleanEmpNo]);
    if (!existing) return { error: `Employee ${cleanEmpNo} not found.` };

    await db.run(`
      UPDATE EMPLOYEE
      SET is_deleted = 1, stamp = ?
      WHERE empNo = ?
    `, [stampStr, cleanEmpNo]);

    await logAudit(db, 'EMPLOYEE', 'DELETE', cleanEmpNo, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete employee.') };
  }
}

/**
 * 4. Restore Soft-deleted Employee
 */
export async function restoreEmployeeAction(empNo: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensureAdmin();
    const cleanEmpNo = String(empNo).trim().padStart(5, '0');
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM EMPLOYEE WHERE empNo = ?', [cleanEmpNo]);
    if (!existing) return { error: `Employee ${cleanEmpNo} not found.` };

    await db.run(`
      UPDATE EMPLOYEE
      SET is_deleted = 0, stamp = ?
      WHERE empNo = ?
    `, [stampStr, cleanEmpNo]);

    await logAudit(db, 'EMPLOYEE', 'RESTORE', cleanEmpNo, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore employee.') };
  }
}

// ========================================================================
// JOB ACTIONS
// ========================================================================

/**
 * 5. Add Job
 */
export async function addJobAction(jobCode: string, jobDesc: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('add_job');
    const validated = jobSchema.parse({ jobCode, jobDesc });
    const code = validated.jobCode.toUpperCase();
    const desc = validated.jobDesc.trim();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT jobCode, is_deleted FROM JOB WHERE jobCode = ?', [code]);
    if (existing) {
      if (existing.is_deleted === 1) {
        // If previously soft-deleted, reactivate
        await db.run('UPDATE JOB SET jobDesc = ?, is_deleted = 0, stamp = ? WHERE jobCode = ?', [desc, stampStr, code]);
        await logAudit(db, 'JOB', 'RESTORE', code, { is_deleted: 1 }, { is_deleted: 0, jobDesc: desc }, userName);
        revalidatePath('/employees');
        return { success: true };
      }
      return { error: `Job code "${code}" already exists.` };
    }

    await db.run(`
      INSERT INTO JOB (jobCode, jobDesc, is_deleted, stamp)
      VALUES (?, ?, 0, ?)
    `, [code, desc, stampStr]);

    await logAudit(db, 'JOB', 'ADD', code, null, { jobCode: code, jobDesc: desc }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: sanitizeDbError(err, 'Failed to add job.') };
  }
}

/**
 * 6. Update Job Description
 */
export async function updateJobAction(jobCode: string, jobDesc: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('edit_job');
    const code = String(jobCode).trim().toUpperCase();
    const desc = String(jobDesc).trim();
    if (desc.length < 1 || desc.length > 20) {
      return { error: 'Job description must be 1 to 20 characters (VARCHAR(20)).' };
    }

    const stampStr = getStampString('EDITED', userName);
    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT jobDesc FROM JOB WHERE jobCode = ?', [code]);
    if (!existing) return { error: `Job ${code} not found.` };

    await db.run('UPDATE JOB SET jobDesc = ?, stamp = ? WHERE jobCode = ?', [desc, stampStr, code]);

    await logAudit(db, 'JOB', 'EDIT', code, { jobDesc: existing.jobDesc }, { jobDesc: desc }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update job.') };
  }
}

/**
 * 7. Soft-delete Job
 */
export async function deleteJobAction(jobCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('delete_job');
    const code = String(jobCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM JOB WHERE jobCode = ?', [code]);
    if (!existing) return { error: `Job ${code} not found.` };

    await db.run('UPDATE JOB SET is_deleted = 1, stamp = ? WHERE jobCode = ?', [stampStr, code]);

    await logAudit(db, 'JOB', 'DELETE', code, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete job.') };
  }
}

/**
 * 8. Restore Job
 */
export async function restoreJobAction(jobCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensureAdmin();
    const code = String(jobCode).trim().toUpperCase();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM JOB WHERE jobCode = ?', [code]);
    if (!existing) return { error: `Job ${code} not found.` };

    await db.run('UPDATE JOB SET is_deleted = 0, stamp = ? WHERE jobCode = ?', [stampStr, code]);

    await logAudit(db, 'JOB', 'RESTORE', code, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore job.') };
  }
}

// ========================================================================
// DEPARTMENT ACTIONS
// ========================================================================

/**
 * 9. Add Department
 */
export async function addDepartmentAction(deptCode: string, deptName: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('add_department');
    const validated = departmentSchema.parse({ deptCode, deptName });
    const code = validated.deptCode.toUpperCase();
    const name = validated.deptName.trim();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT deptCode, is_deleted FROM DEPARTMENT WHERE deptCode = ?', [code]);
    if (existing) {
      if (existing.is_deleted === 1) {
        await db.run('UPDATE DEPARTMENT SET deptName = ?, is_deleted = 0, stamp = ? WHERE deptCode = ?', [name, stampStr, code]);
        await logAudit(db, 'DEPARTMENT', 'RESTORE', code, { is_deleted: 1 }, { is_deleted: 0, deptName: name }, userName);
        revalidatePath('/employees');
        return { success: true };
      }
      return { error: `Department code "${code}" already exists.` };
    }

    await db.run(`
      INSERT INTO DEPARTMENT (deptCode, deptName, is_deleted, stamp)
      VALUES (?, ?, 0, ?)
    `, [code, name, stampStr]);

    await logAudit(db, 'DEPARTMENT', 'ADD', code, null, { deptCode: code, deptName: name }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: sanitizeDbError(err, 'Failed to add department.') };
  }
}

/**
 * 10. Update Department
 */
export async function updateDepartmentAction(deptCode: string, deptName: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('edit_department');
    const code = String(deptCode).trim().toUpperCase();
    const name = String(deptName).trim();
    if (name.length < 1 || name.length > 20) {
      return { error: 'Department name must be 1 to 20 characters (VARCHAR(20)).' };
    }

    const stampStr = getStampString('EDITED', userName);
    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT deptName FROM DEPARTMENT WHERE deptCode = ?', [code]);
    if (!existing) return { error: `Department ${code} not found.` };

    await db.run('UPDATE DEPARTMENT SET deptName = ?, stamp = ? WHERE deptCode = ?', [name, stampStr, code]);

    await logAudit(db, 'DEPARTMENT', 'EDIT', code, { deptName: existing.deptName }, { deptName: name }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update department.') };
  }
}

/**
 * 11. Soft-delete Department
 */
export async function deleteDepartmentAction(deptCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('delete_department');
    const code = String(deptCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM DEPARTMENT WHERE deptCode = ?', [code]);
    if (!existing) return { error: `Department ${code} not found.` };

    await db.run('UPDATE DEPARTMENT SET is_deleted = 1, stamp = ? WHERE deptCode = ?', [stampStr, code]);

    await logAudit(db, 'DEPARTMENT', 'DELETE', code, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete department.') };
  }
}

/**
 * 12. Restore Department
 */
export async function restoreDepartmentAction(deptCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensureAdmin();
    const code = String(deptCode).trim().toUpperCase();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM DEPARTMENT WHERE deptCode = ?', [code]);
    if (!existing) return { error: `Department ${code} not found.` };

    await db.run('UPDATE DEPARTMENT SET is_deleted = 0, stamp = ? WHERE deptCode = ?', [stampStr, code]);

    await logAudit(db, 'DEPARTMENT', 'RESTORE', code, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore department.') };
  }
}

// ========================================================================
// JOB HISTORY ACTIONS (Figures 16 & 17)
// ========================================================================

/**
 * 13. Add Job History Record
 */
export async function addJobHistoryAction(input: JobHistoryInput) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('add_job_history');
    const validated = jobHistorySchema.parse(input);
    const cleanEmpNo = String(validated.empNo).trim().padStart(5, '0');
    const cleanJobCode = validated.jobCode.toUpperCase();
    const cleanDeptCode = validated.deptCode.toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();
    // Verify employee
    const emp = await db.get<any>('SELECT empNo, hireDate, sepDate FROM EMPLOYEE WHERE empNo = ?', [cleanEmpNo]);
    if (!emp) return { error: `Employee ${cleanEmpNo} not found.` };
    if (emp.sepDate != null && emp.sepDate !== '') {
      return { error: `Employee ${cleanEmpNo} is separated and cannot receive new job history records.` };
    }

    if (validated.effDate < emp.hireDate) {
      return { error: `Effective date (${validated.effDate}) cannot be earlier than hire date (${emp.hireDate}).` };
    }

    // Check composite primary key (empNo, jobCode, effDate)
    const existing = await db.get<any>(`
      SELECT is_deleted FROM JOBHISTORY 
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [cleanEmpNo, cleanJobCode, validated.effDate]);

    if (existing) {
      if (existing.is_deleted === 1) {
        await db.run(`
          UPDATE JOBHISTORY 
          SET salary = ?, deptCode = ?, is_deleted = 0, stamp = ?
          WHERE empNo = ? AND jobCode = ? AND effDate = ?
        `, [validated.salary, cleanDeptCode, stampStr, cleanEmpNo, cleanJobCode, validated.effDate]);

        await logAudit(db, 'JOBHISTORY', 'RESTORE', `${cleanEmpNo}:${cleanJobCode}:${validated.effDate}`, null, {
          salary: validated.salary,
          deptCode: cleanDeptCode,
        }, userName);

        revalidatePath('/employees');
        return { success: true };
      }
      return { error: `A job history record for ${cleanJobCode} on ${validated.effDate} already exists for this employee.` };
    }

    await db.run(`
      INSERT INTO JOBHISTORY (empNo, jobCode, effDate, salary, deptCode, is_deleted, stamp)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `, [cleanEmpNo, cleanJobCode, validated.effDate, validated.salary, cleanDeptCode, stampStr]);

    await logAudit(db, 'JOBHISTORY', 'ADD', `${cleanEmpNo}:${cleanJobCode}:${validated.effDate}`, null, {
      empNo: cleanEmpNo,
      jobCode: cleanJobCode,
      effDate: validated.effDate,
      salary: validated.salary,
      deptCode: cleanDeptCode,
    }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: sanitizeDbError(err, 'Failed to add job history record.') };
  }
}

/**
 * 14. Update Job History Record
 */
export async function updateJobHistoryAction(input: {
  empNo: string;
  jobCode: string;
  effDate: string;
  salary: number;
  deptCode: string;
}) {
  try {
    const userName = await ensurePermission('edit_job_history');
    const cleanEmpNo = String(input.empNo).trim().padStart(5, '0');
    const cleanJobCode = String(input.jobCode).trim().toUpperCase();
    const cleanEffDate = String(input.effDate).trim();
    const cleanDeptCode = String(input.deptCode).trim().toUpperCase();

    if (input.salary <= 0) {
      return { error: 'Salary must be greater than zero.' };
    }

    const stampStr = getStampString('EDITED', userName);
    const db = getSqliteDb();

    const existing = await db.get<any>(`
      SELECT salary, deptCode FROM JOBHISTORY
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [cleanEmpNo, cleanJobCode, cleanEffDate]);

    if (!existing) {
      return { error: 'Job history record not found.' };
    }

    await db.run(`
      UPDATE JOBHISTORY
      SET salary = ?, deptCode = ?, stamp = ?
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [input.salary, cleanDeptCode, stampStr, cleanEmpNo, cleanJobCode, cleanEffDate]);

    await logAudit(db, 'JOBHISTORY', 'EDIT', `${cleanEmpNo}:${cleanJobCode}:${cleanEffDate}`, {
      salary: existing.salary,
      deptCode: existing.deptCode,
    }, {
      salary: input.salary,
      deptCode: cleanDeptCode,
    }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update job history record.') };
  }
}

/**
 * 15. Soft-delete Job History Record
 */
export async function deleteJobHistoryAction(empNo: string, jobCode: string, effDate: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensurePermission('delete_job_history');
    const cleanEmpNo = String(empNo).trim().padStart(5, '0');
    const cleanJobCode = String(jobCode).trim().toUpperCase();
    const cleanEffDate = String(effDate).trim();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>(`
      SELECT is_deleted FROM JOBHISTORY
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [cleanEmpNo, cleanJobCode, cleanEffDate]);

    if (!existing) return { error: 'Job history record not found.' };

    await db.run(`
      UPDATE JOBHISTORY
      SET is_deleted = 1, stamp = ?
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [stampStr, cleanEmpNo, cleanJobCode, cleanEffDate]);

    await logAudit(db, 'JOBHISTORY', 'DELETE', `${cleanEmpNo}:${cleanJobCode}:${cleanEffDate}`, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete job history record.') };
  }
}

/**
 * 16. Restore Job History Record
 */
export async function restoreJobHistoryAction(empNo: string, jobCode: string, effDate: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development." };

    const userName = await ensureAdmin();
    const cleanEmpNo = String(empNo).trim().padStart(5, '0');
    const cleanJobCode = String(jobCode).trim().toUpperCase();
    const cleanEffDate = String(effDate).trim();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>(`
      SELECT is_deleted FROM JOBHISTORY
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [cleanEmpNo, cleanJobCode, cleanEffDate]);

    if (!existing) return { error: 'Job history record not found.' };

    await db.run(`
      UPDATE JOBHISTORY
      SET is_deleted = 0, stamp = ?
      WHERE empNo = ? AND jobCode = ? AND effDate = ?
    `, [stampStr, cleanEmpNo, cleanJobCode, cleanEffDate]);

    await logAudit(db, 'JOBHISTORY', 'RESTORE', `${cleanEmpNo}:${cleanJobCode}:${cleanEffDate}`, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/employees');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore job history record.') };
  }
}

// ========================================================================
// BACKWARD COMPATIBILITY ALIASES
// ========================================================================

export async function addJobRecordAction(input: AddJobRecordInput) {
  return addJobHistoryAction({
    empNo: String(input.empNo),
    jobCode: input.jobCode,
    deptCode: input.deptCode,
    effDate: input.effDate,
    salary: input.salary,
  });
}

export async function separateEmployeeAction(input: SeparateEmployeeInput) {
  const db = getSqliteDb();
  const cleanEmpNo = String(input.empNo).trim().padStart(5, '0');
  const existing = await db.get<any>('SELECT * FROM EMPLOYEE WHERE empNo = ?', [cleanEmpNo]);
  if (!existing) return { error: `Employee ${cleanEmpNo} not found.` };

  return updateEmployeeAction({
    empNo: cleanEmpNo,
    lastName: existing.lastName,
    firstName: existing.firstName,
    gender: existing.gender,
    birthDate: existing.birthDate,
    hireDate: existing.hireDate,
    sepDate: input.sepDate,
  });
}

export async function renameJobAction(jobCode: string, newJobDesc: string) {
  return updateJobAction(jobCode, newJobDesc);
}

export async function renameDepartmentAction(deptCode: string, newDeptName: string) {
  return updateDepartmentAction(deptCode, newDeptName);
}
