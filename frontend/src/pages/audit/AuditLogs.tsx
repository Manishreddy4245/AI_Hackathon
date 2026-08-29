import React, { useEffect, useState, useCallback } from 'react';
import { History, Filter, RefreshCw, Search, Database, AlertCircle } from 'lucide-react';
import { apiService, AuditLogItem } from '../../services/api';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { role?: string; entity?: string; search?: string } = {};
      if (filterRole !== 'all') params.role = filterRole;
      if (filterEntity !== 'all') params.entity = filterEntity;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await apiService.getAuditLogs(params);
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err?.response?.data?.detail || 'Unable to load audit trail records.');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterEntity, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101D31] p-6 rounded-2xl border border-[#243650] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] text-xs font-bold mb-2">
            <History className="w-3.5 h-3.5 text-[#3B82F6]" /> Immutable Audit &amp; History Log
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">System Audit Log</h1>
          <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
            Complete activity audit trail tracking approvals, drive creation, student applications, shortlists, interview scheduling, and offer events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-2 bg-[#14243B] hover:bg-[#192B45] text-[#F8FAFC] border border-[#243650] hover:border-[#31527A] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Log Filters & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#101D31] p-4 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, action, entity, or detail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] placeholder-[#64748B] rounded-lg text-xs font-medium focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        {/* Role Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg text-xs font-bold focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="placement_officer">Placement Officer</option>
            <option value="student">Student</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin / System</option>
          </select>
        </div>

        {/* Entity Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg text-xs font-bold focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          >
            <option value="all">All Entities</option>
            <option value="Drive">Drive</option>
            <option value="Application">Application</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="PracticeInterview">Practice Interview</option>
            <option value="Auth">Auth</option>
            <option value="Student">Student</option>
            <option value="Recruiter">Recruiter</option>
          </select>
        </div>
      </div>

      {/* Error state if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-[#101D31] rounded-2xl border border-[#243650] shadow-[0_12px_35px_rgba(0,0,0,0.22)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F8FAFC] border-collapse">
            <thead className="bg-[#14243B] text-[#CBD5E1] uppercase tracking-wider font-bold border-b border-[#243650]">
              <tr>
                <th className="p-3.5 pl-5">Timestamp</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5 pr-5">Event Summary &amp; Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243650] font-medium text-[#F8FAFC]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#3B82F6] animate-spin" />
                      <span>Loading immutable audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-[#94A3B8] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-bold text-[#F8FAFC]">{log.userName}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1628] text-[#CBD5E1] border border-[#243650] capitalize">
                        {(log.userRole || 'system').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-[#60A5FA] font-mono">{log.action}</td>
                    <td className="p-3.5 text-[#CBD5E1] font-semibold">
                      <span className="px-2 py-0.5 rounded bg-[#0B1628] border border-[#1E293B] text-[11px]">
                        {log.entity}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-[#F8FAFC]">{log.detail}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                    No audit records match the selected filters.
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
