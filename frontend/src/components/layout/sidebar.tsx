'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  ScrollText,
  Boxes,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Executive Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER'],
    },
    {
      name: 'Inventory & Products',
      href: '/inventory',
      icon: Package,
      roles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER'],
    },
    {
      name: 'Stock Transfers',
      href: '/transfers',
      icon: ArrowLeftRight,
      roles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER'],
    },
    {
      name: 'POS Terminal',
      href: '/pos',
      icon: ShoppingCart,
      roles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'CASHIER'],
    },
    {
      name: 'Audit Trail Logs',
      href: '/audit-logs',
      icon: ScrollText,
      roles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER'],
    },
  ];

  const allowedNav = navItems.filter(
    (item) => !user || item.roles.includes(user.role),
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-600/30">
          <Boxes className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white">OmniOps</h1>
          <p className="text-xs text-slate-400 font-medium">B2B & Retail Platform</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{user.fullName}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
