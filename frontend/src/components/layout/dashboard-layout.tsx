'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  allowedRoles?: Array<'SUPER_ADMIN' | 'WAREHOUSE_MANAGER' | 'CASHIER'>;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  allowedRoles,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading OmniOps Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Access Restricted" />
          <div className="p-8 flex items-center justify-center flex-1">
            <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <h3 className="text-lg font-bold text-slate-800">Insufficient Privileges</h3>
              <p className="text-sm text-slate-500 mt-2">
                Your account ({user.role}) does not have permission to view this section.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header title={title} />
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
};
