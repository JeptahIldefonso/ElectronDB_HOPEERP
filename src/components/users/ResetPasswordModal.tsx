'use client';

import React, { useState, useTransition } from 'react';
import { X, KeyRound, Copy, Check, Loader2, ShieldAlert } from 'lucide-react';
import type { UserAccount, UserRole } from '@/lib/types';
import { adminResetPasswordAction } from '@/app/actions/auth';

interface ResetPasswordModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  onSuccess: () => void;
}

export function ResetPasswordModal({
  user,
  isOpen,
  onClose,
  currentUserRole,
  onSuccess,
}: ResetPasswordModalProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setTempPassword(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  const handleReset = () => {
    setError(null);
    startTransition(async () => {
      const res = await adminResetPasswordAction(user.userId);
      if (res.error) {
        setError(res.error);
      } else if (res.tempPassword) {
        setTempPassword(res.tempPassword);
        onSuccess();
      }
    });
  };

  const handleCopy = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const el = document.createElement('textarea');
      el.value = tempPassword;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50 duration-150"
    >
      <div className="bg-surface-1 border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden text-text font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 id="reset-password-modal-title" className="font-editorial text-lg text-text">
              Reset Password
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text p-1 rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {!tempPassword ? (
            <>
              <p className="text-xs text-text-muted leading-relaxed">
                You are initiating a password reset for{' '}
                <strong className="text-text font-semibold">{user.fullName}</strong> ({user.email}).
              </p>

              <div className="p-3 bg-surface-2 border border-border rounded text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-muted font-mono text-[10px] uppercase">User Role</span>
                  <span className="font-semibold text-text">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-mono text-[10px] uppercase">User ID</span>
                  <span className="font-mono text-text text-[11px]">{user.userId}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  A 12+ character temporary password will be generated. The user will be required to change it upon their next sign-in, and all active sessions will be invalidated.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text rounded border border-border hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#041a24] hover:bg-[#1c313b] dark:bg-primary-bg dark:text-primary-fg rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Temporary Password...</span>
                    </>
                  ) : (
                    <span>Generate Temporary Password</span>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-800 dark:text-emerald-300">
                Temporary password created successfully. The user must use this to sign in and set their new password.
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                  Temporary Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tempPassword}
                    className="flex-1 font-mono text-xs px-3 py-2 bg-surface-2 border border-border rounded select-all font-semibold tracking-wide text-text outline-none"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#041a24] text-white dark:bg-primary-bg dark:text-primary-fg text-xs font-medium rounded hover:bg-[#1c313b] transition-colors cursor-pointer shrink-0"
                    aria-label="Copy temporary password"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                &bull; Please copy and securely share this password now. It will not be shown again.
              </p>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#041a24] hover:bg-[#1c313b] dark:bg-primary-bg dark:text-primary-fg rounded transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
