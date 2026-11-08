'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, ChevronDown, Menu, LogOut, ShieldCheck, KeyRound } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { logoutAction } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { UserRole } from '@/lib/types';

interface HeaderProps {
  userRole?: UserRole;
  userName?: string;
  title?: string;
}

export function Header({ userRole = 'Admin', userName = 'Administrator' }: HeaderProps) {
  const [dateString, setDateString] = useState<string>('Nov 6, 2026');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toggleMobileSidebar } = useSidebar();

  useEffect(() => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
    setDateString(formatted);
  }, []);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const roleLabels: Record<string, string> = {
    Superadmin: 'Superadmin',
    Admin: 'Administrator',
    User: 'User (Staff)',
    admin: 'Administrator',
    sales: 'User (Sales)',
    cashier: 'User (Billing)',
  };

  const roleLabel = roleLabels[String(userRole)] || String(userRole);

  return (
    <header className="h-14 bg-surface-1 border-b border-border px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3 shrink-0 select-none relative z-30 font-sans transition-colors duration-150">
      {/* Left: Mobile Toggle only (Redundant header breadcrumb removed per user request) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 text-text hover:bg-surface-2 rounded-[2px] transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-border bg-surface-2 font-mono text-[10px] text-text-muted shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">ACTIVE</span>
          <span className="opacity-30">|</span>
          <span>{dateString}</span>
        </div>

        {/* Pill Capsule Theme Toggle */}
        <ThemeToggle variant="pill" />

        {/* Notification Bell */}
        <button
          type="button"
          title="Notifications"
          aria-label="Notifications"
          className="relative p-1.5 text-text-muted hover:text-text hover:bg-surface-2 rounded-[2px] transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 pl-2 cursor-pointer group hover:opacity-90 transition-opacity focus:outline-none"
          >
            {/* Small Role Indicator Pill (Superadmin: Amber, Admin: Blue, User: Green) */}
            <RoleBadge role={userRole} />

            <span className="font-editorial text-sm text-text group-hover:text-accent">
              {userName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-text-muted group-hover:text-text transition-transform duration-200 ${
                isMenuOpen ? 'rotate-180 text-text' : ''
              }`}
            />
          </button>

          {/* Interactive Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-1 rounded-[4px] shadow-md border border-border py-2 z-50 animate-in fade-in-50 duration-150 font-sans text-xs">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full ring-1 ring-border shrink-0 overflow-hidden bg-neutral-200">
                    <Image
                      src="/avatars/default-avatar.jpg"
                      alt={userName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-text truncate">{userName}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <RoleBadge role={userRole} />
                      <span className="font-mono text-[10px] text-text-muted truncate">
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-border pb-1">
                <ThemeToggle variant="menu-item" />
              </div>

              <div className="p-1 pt-1.5 border-b border-border pb-1.5">
                <Link
                  href="/change-password"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-text hover:bg-surface-2 rounded-[2px] transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-text-muted" />
                  <span>Change Password</span>
                </Link>
              </div>

              <div className="p-1 pt-1.5">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-[2px] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
