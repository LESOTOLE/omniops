'use client';

import React from 'react';
import { LogOut, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title || 'Dashboard'}</h2>
      </div>

      <div className="flex items-center gap-4">
        {user?.warehouse && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Branch: <strong>{user.warehouse.name}</strong> ({user.warehouse.code})</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
            title="Sign out of system"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
