'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';
import { RightsModal } from '@/components/users/RightsModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { ResetPasswordModal } from '@/components/users/ResetPasswordModal';
import { AddUserModal } from '@/components/users/AddUserModal';
import { toggleBlockUserAction } from '@/app/actions/auth';
import type { UserAccount, UserRole } from '@/lib/types';

interface UserManagementViewProps {
  initialUsers: UserAccount[];
  currentUserRole: UserRole;
  currentUserId?: string;
}

export function UserManagementView({ initialUsers, currentUserRole, currentUserId }: UserManagementViewProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [selectedUserForRights, setSelectedUserForRights] = useState<UserAccount | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSuperadmin = currentUserRole === 'Superadmin';

  // Sync state if initialUsers changes from server revalidation
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleToggleBlock = (user: UserAccount) => {
    startTransition(async () => {
      const res = await toggleBlockUserAction(user.userId);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === user.userId
              ? { ...u, isBlocked: !u.isBlocked, status: (u.isBlocked ? 'Active' : 'Inactive') as 'Active' | 'Inactive' }
              : u
          )
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Row with Title and Role Badge (Figures 35 & 36) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            User Management
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Superadmin view: Manage all system administrators, managers, and user access rights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-[#041a24]/10 text-[#041a24] border-[#041a24]/20 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
            {currentUserRole.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Section Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        {/* Section Heading & + Add User button (#001A2B) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              User Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {!isSuperadmin
                ? 'Admin: manage Users only. Superadmin accounts are hidden and cannot be modified.'
                : 'Superadmin: manage all accounts across the organization.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>

        {/* User Table (Figures 35 & 36) */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">NAME</th>
                  <th className="py-2.5 px-4 font-semibold">EMAIL</th>
                  <th className="py-2.5 px-4 font-semibold w-28">ROLE</th>
                  <th className="py-2.5 px-4 font-semibold w-28">STATUS</th>
                  <th className="py-2.5 px-4 font-semibold text-right w-48">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isAccountAdmin = u.role === 'Admin' || u.role === 'Superadmin';
                  const isBlocked = u.isBlocked;

                  return (
                    <tr
                      key={u.userId}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isBlocked ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* NAME */}
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {u.fullName}
                      </td>

                      {/* EMAIL */}
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {u.email}
                      </td>

                      {/* ROLE */}
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            u.role === 'Superadmin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                              : u.role === 'Admin'
                              ? 'bg-[#041a24]/10 text-[#041a24] dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      {/* STATUS (Active / Blocked) */}
                      <td className="py-2.5 px-4">
                        {isBlocked ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2.5 px-4 text-right">
                        {/* For Admins, other Admin rows show "—" (Figure 35 & 36) */}
                        {!isSuperadmin && isAccountAdmin ? (
                          <span className="text-slate-400 font-mono select-none pr-3">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Block / Unblock Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(u)}
                              disabled={isPending}
                              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border ${
                                isBlocked
                                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {isBlocked ? 'Unblock' : 'Block'}
                            </button>

                            {/* Rights Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForRights(u)}
                              className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              Rights
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForEdit(u)}
                              className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              Edit
                            </button>

                            {/* Reset Password Button */}
                            {u.userId !== currentUserId && (isSuperadmin || u.role === 'User') && (
                              <button
                                type="button"
                                onClick={() => setSelectedUserForReset(u)}
                                className="px-2.5 py-1 rounded text-xs font-medium text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer transition-colors"
                              >
                                Reset Password
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rights Modal (Figures 37-40) */}
      <RightsModal
        user={selectedUserForRights}
        isOpen={Boolean(selectedUserForRights)}
        onClose={() => setSelectedUserForRights(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUserForEdit}
        isOpen={Boolean(selectedUserForEdit)}
        onClose={() => setSelectedUserForEdit(null)}
        onSuccess={() => {
          router.refresh();
        }}
        currentUserRole={currentUserRole}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={selectedUserForReset}
        isOpen={Boolean(selectedUserForReset)}
        onClose={() => setSelectedUserForReset(null)}
        currentUserRole={currentUserRole}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
