import React, { useEffect, useState } from 'react';
import { History, Shield, Filter, CheckCircle2, User, RefreshCw, Sparkles } from 'lucide-react';
import { apiService, AuditLogItem } from '../../services/api';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.log('Using local audit trail fallback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterRole === 'all') return true;
    return log.userRole === filterRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" /> Immutable Audit & History Log
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Audit Log</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete activity audit trail tracking human-in-the-loop approvals, drive creation, shortlists, and scheduling events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Log Filters */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filter by User Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="placement_officer">Placement Officer</option>
            <option value="student">Student</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Showing {filteredLogs.length} activity records
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Timestamp</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5 pr-5">Event Summary & Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-bold text-slate-900">{log.userName}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                        {log.userRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-brand-600 font-mono">{log.action}</td>
                    <td className="p-3.5 text-slate-600">{log.entity}</td>
                    <td className="p-3.5 pr-5 text-slate-800">{log.detail}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records match the selected role filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
