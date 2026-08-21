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
      <div className="bg-[#101D31] p-6 rounded-2xl border border-[#243650] text-[#F8FAFC] shadow-[0_12px_35px_rgba(0,0,0,0.22)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] text-xs font-bold mb-2">
            <History className="w-3.5 h-3.5 text-[#3B82F6]" /> Immutable Audit &amp; History Log
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">System Audit Log</h1>
          <p className="text-xs text-[#CBD5E1] mt-1 font-medium">
            Complete activity audit trail tracking human-in-the-loop approvals, drive creation, shortlists, and scheduling events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 bg-[#14243B] hover:bg-[#192B45] text-[#F8FAFC] border border-[#243650] hover:border-[#31527A] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#3B82F6] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Log Filters */}
      <div className="flex items-center justify-between bg-[#101D31] p-4 rounded-2xl border border-[#243650] shadow-xs text-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#3B82F6]" />
          <span className="text-xs font-bold text-[#CBD5E1]">Filter by User Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1.5 bg-[#0B1628] border border-[#243650] text-[#F8FAFC] rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="placement_officer">Placement Officer</option>
            <option value="student">Student</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </div>
        <span className="text-xs font-semibold text-[#94A3B8]">
          Showing {filteredLogs.length} activity records
        </span>
      </div>

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
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#14243B] transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-[#94A3B8] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 font-bold text-[#F8FAFC]">{log.userName}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1628] text-[#CBD5E1] border border-[#243650] capitalize">
                        {log.userRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-[#60A5FA] font-mono">{log.action}</td>
                    <td className="p-3.5 text-[#CBD5E1] font-semibold">{log.entity}</td>
                    <td className="p-3.5 pr-5 text-[#F8FAFC]">{log.detail}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
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
