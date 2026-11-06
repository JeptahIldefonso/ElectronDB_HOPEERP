'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { CANONICAL_RIGHTS, type UserAccount } from '@/lib/types';
import { updateUserRightsAction } from '@/app/actions/auth';

interface RightsModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MODULES_CONFIG = [
  { key: 'Customer', label: 'Customer Management' },
  { key: 'Product', label: 'Product Management' },
  { key: 'Human Resources', label: 'Human Resources' },
  { key: 'Sales', label: 'Sales' },
  { key: 'Reports', label: 'Reports' },
] as const;

export function RightsModal({ user, isOpen, onClose, onSuccess }: RightsModalProps) {
  const [selectedRights, setSelectedRights] = useState<Set<string>>(new Set(user?.rights || []));
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      const userRightsSet = new Set(user.rights || []);
      setSelectedRights(userRightsSet);
      setError(null);

      // Determine which modules are enabled initially (has at least one right)
      const initialEnabled = new Set<string>();
      MODULES_CONFIG.forEach((mod) => {
        const hasAny = CANONICAL_RIGHTS.some(
          (r) => r.module === mod.key && userRightsSet.has(r.rightCode)
        );
        if (hasAny) {
          initialEnabled.add(mod.key);
        }
      });
      setEnabledModules(initialEnabled);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  // Toggle Module Master Checkbox
  // "Ticking a module’s box switches that module on; the boxes under it decide what the person may do there."
  const handleToggleModule = (moduleKey: string) => {
    const isCurrentlyEnabled = enabledModules.has(moduleKey);

    if (isCurrentlyEnabled) {
      // Switch module OFF: uncheck master and remove all rights under it
      setEnabledModules((prev) => {
        const next = new Set(prev);
        next.delete(moduleKey);
        return next;
      });
      setSelectedRights((prev) => {
        const next = new Set(prev);
        CANONICAL_RIGHTS.filter((r) => r.module === moduleKey).forEach((r) => {
          next.delete(r.rightCode);
        });
        return next;
      });
    } else {
      // Switch module ON: check master and enable its options
      setEnabledModules((prev) => new Set(prev).add(moduleKey));
      // Baseline: select the first right or keep empty for user decision
      const moduleRights = CANONICAL_RIGHTS.filter((r) => r.module === moduleKey);
      if (moduleRights.length > 0) {
        setSelectedRights((prev) => {
          const next = new Set(prev);
          next.add(moduleRights[0].rightCode);
          return next;
        });
      }
    }
  };

  // Shortcut: Select ALL rights in module
  const handleSelectAllModule = (moduleKey: string) => {
    setEnabledModules((prev) => new Set(prev).add(moduleKey));
    setSelectedRights((prev) => {
      const next = new Set(prev);
      CANONICAL_RIGHTS.filter((r) => r.module === moduleKey).forEach((r) => next.add(r.rightCode));
      return next;
    });
  };

  // Shortcut: Clear NONE in module
  const handleClearModule = (moduleKey: string) => {
    setSelectedRights((prev) => {
      const next = new Set(prev);
      CANONICAL_RIGHTS.filter((r) => r.module === moduleKey).forEach((r) => next.delete(r.rightCode));
      return next;
    });
    setEnabledModules((prev) => {
      const next = new Set(prev);
      next.delete(moduleKey);
      return next;
    });
  };

  // Toggle individual child right
  const handleToggleRight = (moduleKey: string, rightCode: string) => {
    setSelectedRights((prev) => {
      const next = new Set(prev);
      if (next.has(rightCode)) {
        next.delete(rightCode);
        // If no rights remain in this module, untick master
        const remainingInModule = CANONICAL_RIGHTS.filter(
          (r) => r.module === moduleKey && next.has(r.rightCode)
        );
        if (remainingInModule.length === 0) {
          setEnabledModules((mPrev) => {
            const mNext = new Set(mPrev);
            mNext.delete(moduleKey);
            return mNext;
          });
        }
      } else {
        next.add(rightCode);
        // Ensure master is ticked ON
        setEnabledModules((mPrev) => new Set(mPrev).add(moduleKey));
      }
      return next;
    });
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // Only persist rights for modules that are actually enabled
      const finalRights = Array.from(selectedRights).filter((code) => {
        const item = CANONICAL_RIGHTS.find((r) => r.rightCode === code);
        return item && enabledModules.has(item.module);
      });

      const res = await updateUserRightsAction(user.userId, finalRights);
      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header (Figures 37-40) */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Rights — {user.fullName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with 5 Module Boxes (Figures 37-40) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {MODULES_CONFIG.map((mod) => {
            const rightsInMod = CANONICAL_RIGHTS.filter((r) => r.module === mod.key);
            const isModuleEnabled = enabledModules.has(mod.key);
            const checkedCount = rightsInMod.filter((r) => selectedRights.has(r.rightCode)).length;

            return (
              <div
                key={mod.key}
                className={`rounded-lg border transition-all ${
                  isModuleEnabled
                    ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50'
                } p-4 space-y-3`}
              >
                {/* Module Header Row: Master Checkbox + All / None shortcuts */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isModuleEnabled}
                      onChange={() => handleToggleModule(mod.key)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#001A2B] accent-[#001A2B] focus:ring-[#001A2B]/20 cursor-pointer"
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-wider font-mono ${
                        isModuleEnabled
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {mod.label}
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      ({checkedCount}/{rightsInMod.length})
                    </span>
                  </label>

                  {/* All / None Shortcut buttons */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleSelectAllModule(mod.key)}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-[#041a24] dark:text-slate-200 hover:bg-[#041a24]/5 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      All
                    </button>
                    <span className="text-slate-300 dark:text-slate-600 select-none">•</span>
                    <button
                      type="button"
                      onClick={() => handleClearModule(mod.key)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Sub-Checkboxes Grid (Child Rights) */}
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 transition-opacity duration-150 ${
                    isModuleEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                  }`}
                >
                  {rightsInMod.map((r) => {
                    const isChecked = selectedRights.has(r.rightCode) && isModuleEnabled;
                    return (
                      <label
                        key={r.rightCode}
                        className={`flex items-center gap-2 text-xs select-none transition-colors ${
                          isModuleEnabled
                            ? 'cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                            : 'cursor-not-allowed text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isModuleEnabled}
                          checked={isChecked}
                          onChange={() => handleToggleRight(mod.key, r.rightCode)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-[#001A2B] accent-[#001A2B] focus:ring-[#001A2B]/20 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className={isChecked ? 'font-medium' : ''}>{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer (Figures 37-40) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-2 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Rights</span>
          </button>
        </div>
      </div>
    </div>
  );
}
