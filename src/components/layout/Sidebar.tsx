'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  CheckCircle2,
  Lock,
  PanelLeftClose,
  X,
  Network,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { logoutAction } from '@/app/actions/auth';
import { useSidebar } from '@/components/layout/SidebarContext';
import { cn } from '@/lib/utils';
import { canAccess, normalizeRole, type ModuleName } from '@/lib/permissions';

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  userRights?: string[];
}

export function Sidebar({
  userRole = 'admin',
  userName = 'Jeptah Ashley Ildefonso',
  userRights = [],
}: SidebarProps) {
  const pathname = usePathname();
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  const normRole = normalizeRole(userRole);
  const isSuperadmin = normRole === 'superadmin';
  const isAdmin = normRole === 'admin' || isSuperadmin;

  // Single Source of Truth permission checker via canAccess()
  const isItemVisible = (href: string): boolean => {
    if (href === '/' || href === '/data-model') return true;
    if (href === '/sales') return canAccess(userRole, 'sales', userRights);
    if (href === '/customers') return canAccess(userRole, 'customer', userRights);
    if (href === '/payments') return canAccess(userRole, 'payments', userRights);
    if (href === '/products') return canAccess(userRole, 'products', userRights);
    if (href === '/employees') return canAccess(userRole, 'human-resources', userRights);
    if (href === '/reports') return canAccess(userRole, 'reports', userRights);
    if (href === '/users') return canAccess(userRole, 'user-management', userRights);
    return false;
  };

  const rawSections = [
    {
      section: 'OVERVIEW',
      items: [
        { href: '/', label: 'Home' },
        { href: '/data-model', label: 'Data Model' },
      ],
    },
    {
      section: 'TRANSACTIONS',
      items: [
        { href: '/sales', label: 'Sales' },
        { href: '/customers', label: 'Customer' },
        { href: '/payments', label: 'Payments' },
      ],
    },
    {
      section: 'CATALOG',
      items: [
        { href: '/products', label: 'Products' },
      ],
    },
    {
      section: 'ORGANIZATION',
      items: [
        { href: '/employees', label: 'Human Resources' },
        { href: '/reports', label: 'Reports' },
      ],
    },
    ...(isAdmin
      ? [
          {
            section: 'ADMINISTRATION',
            items: [
              { href: '/users', label: 'User Management' },
            ],
          },
        ]
      : []),
  ];

  const navLinks = rawSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => isItemVisible(item.href)),
    }))
    .filter((sec) => sec.items.length > 0);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5 overflow-y-auto font-sans bg-white dark:bg-surface-1 text-text transition-colors duration-150">
      <div className="space-y-4">
        {/* Brand Section matching Image 1: ElectronDB / MONITORING • HOPEERP */}
        <div className="flex items-start justify-between pb-5 border-b border-border">
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="group flex items-center gap-3 select-none"
            aria-label="ElectronDB Monitoring HOPEERP"
          >
            <div className="relative w-9 h-9 shrink-0 rounded-md overflow-hidden border border-black/10 dark:border-white/10 shadow-2xs bg-white">
              <Image
                src="/logo.jpg"
                alt="ElectronDB Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="font-editorial italic text-[22px] font-normal tracking-tight text-text group-hover:text-accent transition-colors leading-none">
                ElectronDB
              </div>
              <div className="font-mono text-[9px] tracking-widest text-text-muted uppercase mt-1">
                MONITORING &bull; HOPEERP
              </div>
            </div>
          </Link>

          {/* Panel collapse indicator / mobile close */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-[6px] text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
            title="Toggle panel"
            aria-label="Toggle panel"
          >
            <PanelLeftClose className="w-4 h-4 hidden lg:block stroke-[1.5]" />
            <X className="w-4 h-4 lg:hidden" />
          </button>
        </div>

        {/* Minimalist Flat Vertical Navigation Stream */}
        <nav className="mt-5 space-y-4 pt-1" aria-label="Main Navigation">
          {navLinks.map((sec) => (
            <div key={sec.section} className="space-y-1">
              <div className="px-1 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint select-none">
                {sec.section}
              </div>

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const isDashboard = item.href === '/';
                  const isActive = isDashboard
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                  const hasChevron = item.href !== '/';

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileSidebar}
                      className={cn(
                        'group flex items-center justify-between py-2 px-1 text-[15px] font-sans transition-colors cursor-pointer select-none rounded-[2px]',
                        isActive
                          ? 'font-bold text-text dark:text-accent'
                          : 'text-text-muted hover:text-text hover:bg-surface-2/60 font-medium'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.href === '/data-model' && (
                          <Network className="w-3.5 h-3.5 text-text-muted group-hover:text-text shrink-0 stroke-[1.5]" />
                        )}
                        <span className="tracking-tight truncate">{item.label}</span>
                      </div>
                      {hasChevron && (
                        <ChevronRight
                          className={cn(
                            'w-3.5 h-3.5 transition-colors stroke-[1.5]',
                            isActive
                              ? 'text-text dark:text-accent stroke-[2]'
                              : 'text-text-faint group-hover:text-text-muted'
                          )}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile matching JeptahzRepo */}
      <div className="pt-4 border-t border-border mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full ring-1 ring-border shrink-0 shadow-xs overflow-hidden bg-neutral-200">
            <Image
              src="/avatars/default-avatar.jpg"
              alt={userName}
              width={28}
              height={28}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-editorial italic text-[15px] text-text leading-tight truncate">
                {userName.length > 17 ? `${userName.slice(0, 15)}...` : userName}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20 shrink-0" />
            </div>
            <span className="text-xs text-text-faint font-sans leading-tight truncate mt-0.5">
              @{userName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jeptahashleyildefonso'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted mt-1 select-none leading-none">
              {normRole.toUpperCase()}
            </span>
          </div>
        </div>

        <form action={logoutAction} className="shrink-0">
          <button
            type="submit"
            title="Sign Out (Lock Session)"
            aria-label="Sign Out"
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-[4px] transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4 stroke-[1.5]" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar with White Panel & Crisp Border */}
      <aside className="hidden lg:flex w-64 h-screen flex-col bg-white dark:bg-surface-1 border-r border-border shrink-0 select-none sticky top-0 transition-colors duration-150">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Responsive Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-1 border-r border-border shadow-xl flex flex-col lg:hidden transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile Navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
