'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api } from '@/lib/api';
import { AuditLogRecord, ApiResponseWrapper } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Inspector modal state
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = '/audit-logs?limit=100';
      if (entityFilter) query += `&entity=${encodeURIComponent(entityFilter)}`;
      if (userFilter) query += `&performedBy=${encodeURIComponent(userFilter)}`;

      const res = await api.get<never, ApiResponseWrapper<AuditLogRecord[]>>(query);
      setLogs(res.data || []);
    } catch (err: unknown) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, userFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('COMPLETE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('ADJUST')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (action.includes('DELETE') || action.includes('REJECT')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('CHECKOUT')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <DashboardLayout title="System Audit Trail & Security Logs" allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Filter by user email address..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Entities</option>
            <option value="Product">Product</option>
            <option value="Inventory">Inventory</option>
            <option value="Order">Order (POS)</option>
            <option value="StockTransfer">StockTransfer</option>
            <option value="Warehouse">Warehouse</option>
            <option value="User">User</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">Entity</th>
                <th className="py-3 px-5">Entity ID</th>
                <th className="py-3 px-5">Performed By</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    <span>Streaming audit trail records...</span>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp || log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">{log.entity}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-400 truncate max-w-[120px]">
                      {log.entityId}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{log.performedBy}</div>
                      {log.ipAddress && (
                        <div className="text-[10px] text-slate-400 font-mono">IP: {log.ipAddress}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                        {log.userRole || 'USER'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No audit records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: JSON Payload Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Audit Log Payload Inspector</h3>
                <p className="text-xs text-slate-400">
                  {selectedLog.action} on {selectedLog.entity} (ID: {selectedLog.entityId})
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {selectedLog.oldValue && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1.5">
                    Previous State (Before Mutation)
                  </h4>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">
                  New Payload State (After Mutation)
                </h4>
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600 border border-slate-200/60">
                <p>
                  <strong>Executed By:</strong> {selectedLog.performedBy} ({selectedLog.userRole})
                </p>
                <p>
                  <strong>Timestamp:</strong> {new Date(selectedLog.timestamp || selectedLog.createdAt).toISOString()}
                </p>
                <p>
                  <strong>Origin IP:</strong> {selectedLog.ipAddress || '127.0.0.1'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
