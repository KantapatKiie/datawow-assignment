'use client';

import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Menu, Ticket, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { cn, initials } from '@/lib/utils';
import type { SessionUser } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: Record<SessionUser['role'], NavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Home', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/history', label: 'History', icon: <ClipboardList size={18} /> },
  ],
  USER: [
    { href: '/concerts', label: 'Home', icon: <CalendarDays size={18} /> },
    { href: '/history', label: 'History', icon: <ClipboardList size={18} /> },
  ],
};

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // A navigation should always leave the mobile drawer closed behind it.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const items = NAV[user.role];

  const isActive = (href: string) =>
    href === '/admin' || href === '/concerts' ? pathname === href : pathname.startsWith(href);

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors',
            isActive(item.href)
              ? 'bg-primary-soft font-medium text-primary-dark'
              : 'text-ink hover:bg-[#f5f7fb]',
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-4">
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark">
          {initials(user.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted">
            {user.role === 'ADMIN' ? 'Administrator' : 'Attendee'}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-ink transition-colors hover:bg-[#f5f7fb] disabled:opacity-60"
      >
        <LogOut size={18} />
        {signingOut ? 'Signing out...' : 'Logout'}
      </button>
    </div>
  );

  const brand = (
    <div className="mb-6 flex items-center gap-2 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
        <Ticket size={17} />
      </span>
      <span className="text-[15px] font-semibold">Concert Tickets</span>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface p-4 lg:flex">
        {brand}
        {nav}
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="rounded-lg p-2 hover:bg-[#f5f7fb]"
        >
          <Menu size={20} />
        </button>
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
            <Ticket size={15} />
          </span>
          Concert Tickets
        </span>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/35"
          />
          <div className="absolute inset-y-0 left-0 flex w-[268px] max-w-[82vw] flex-col bg-surface p-4 shadow-xl">
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 hover:bg-[#f5f7fb]"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {account}
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}
