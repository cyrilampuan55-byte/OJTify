import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Users, Activity, Clock, TrendingUp, Search, Trash2, Download, Loader2, ChevronDown, X, Eye } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  target_hours: number;
  isActive: boolean;
  activeSessionStart: string | null;
  totalHours: number;
  progress: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'offline'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getAdminUsers();
      if (data?.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Update timer display
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && u.isActive) ||
      (filterStatus === 'offline' && !u.isActive);
    return matchesSearch && matchesFilter && u.role !== 'admin';
  });

  const totalUsers = users.filter(u => u.role !== 'admin').length;
  const activeUsers = users.filter(u => u.isActive && u.role !== 'admin').length;
  const totalRenderedHours = users.filter(u => u.role !== 'admin').reduce((sum, u) => sum + u.totalHours, 0);
  const avgCompletion = totalUsers > 0 ? Math.round(users.filter(u => u.role !== 'admin').reduce((sum, u) => sum + u.progress, 0) / totalUsers) : 0;

  const formatElapsed = (startTime: string) => {
    const seconds = Math.floor((now - new Date(startTime).getTime()) / 1000);
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleViewLogs = async (user: AdminUser) => {
    setSelectedUser(user);
    setLogsLoading(true);
    try {
      const data = await api.getLogs({ userId: user.id });
      setUserLogs(data?.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their data?')) return;
    try {
      await api.deleteUser(userId);
      fetchUsers();
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportLogs({});
      if (data?.logs) {
        const escape = (value: any) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const csv = [
          'Name,Email,Date,Time In,Time Out,Hours,Entry Type,Description,Verification',
          ...data.logs.map((l: any) => {
            const profile = l.profiles || {};
            return [
              escape(profile.name),
              escape(profile.email),
              escape(new Date(l.time_in).toLocaleDateString()),
              escape(new Date(l.time_in).toLocaleTimeString()),
              escape(l.time_out ? new Date(l.time_out).toLocaleTimeString() : 'Active'),
              escape((l.total_hours || 0).toFixed(2)),
              escape(l.entry_type || 'regular'),
              escape(l.description || ''),
              escape(l.verification_status || ''),
            ].join(',');
          }),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ojt-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportUser = async (user: AdminUser) => {
    setExportingUserId(user.id);
    try {
      const data = await api.exportLogs({ userId: user.id });
      if (data?.logs) {
        const escape = (value: any) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const csv = [
          'Name,Email,Date,Time In,Time Out,Hours,Entry Type,Description,Verification',
          ...data.logs.map((l: any) => {
            const profile = l.profiles || {};
            return [
              escape(profile.name || user.name),
              escape(profile.email || user.email),
              escape(new Date(l.time_in).toLocaleDateString()),
              escape(new Date(l.time_in).toLocaleTimeString()),
              escape(l.time_out ? new Date(l.time_out).toLocaleTimeString() : 'Active'),
              escape((l.total_hours || 0).toFixed(2)),
              escape(l.entry_type || 'regular'),
              escape(l.description || ''),
              escape(l.verification_status || ''),
            ].join(',');
          }),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = String(user.name || 'student')
          .trim()
          .replace(/[^\w\-]+/g, '_')
          .slice(0, 40);
        a.download = `${safeName}-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('User export failed:', err);
    } finally {
      setExportingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">TOTAL STUDENTS</span>
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">{totalUsers}</div>
        </div>

        <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">ACTIVE NOW</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">{activeUsers}</div>
        </div>

        <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">TOTAL HOURS</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">{totalRenderedHours.toFixed(1)}</div>
        </div>

        <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">AVG COMPLETION</span>
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">{avgCompletion}%</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'offline'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2.5 text-sm rounded-xl border transition-all capitalize ${
                filterStatus === status
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                  : 'border-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2.5 text-sm rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Live Monitoring Grid */}
      <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5 md:p-6">
        <h3 className="text-sm font-semibold text-slate-400 tracking-wider mb-4">LIVE MONITORING</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`p-4 rounded-xl border transition-all ${
                user.isActive
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-slate-800/30 border-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    user.isActive
                      ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={`text-xs ${user.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {user.isActive ? 'Working' : 'Offline'}
                  </span>
                </div>
              </div>

              {user.isActive && user.activeSessionStart && (
                <div className="text-lg font-mono text-emerald-400 mb-2">
                  {formatElapsed(user.activeSessionStart)}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Progress</div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${user.progress >= 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${Math.min(user.progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{user.progress}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Hours</div>
                  <div className="text-sm font-mono text-white">{user.totalHours.toFixed(1)}/{user.target_hours}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
                <button
                  onClick={() => handleViewLogs(user)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Logs
                </button>
                <button
                  onClick={() => handleExportUser(user)}
                  disabled={exportingUserId === user.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export this student's logs as CSV"
                >
                  {exportingUserId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-10">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No students found</p>
            </div>
          )}
        </div>
      </div>

      {/* User Logs Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-700/40">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedUser.name}'s Logs</h3>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportUser(selectedUser)}
                  disabled={exportingUserId === selectedUser.id}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exportingUserId === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export CSV
                </button>
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {logsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              ) : userLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No logs found</p>
              ) : (
                <div className="space-y-2">
                  {userLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-3 bg-slate-800/30 rounded-lg">
                      <div>
                        <div className="text-sm text-white">
                          {new Date(log.time_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(log.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {log.time_out ? (
                            <> - {new Date(log.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                          ) : (
                            <span className="text-emerald-400 ml-2">Active</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-mono text-cyan-400">{(log.total_hours || 0).toFixed(2)} hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700/40 text-center">
              <span className="text-sm text-slate-400">
                Total: <span className="text-cyan-400 font-mono font-bold">{selectedUser.totalHours.toFixed(2)} hrs</span>
                {' / '}
                <span className="text-slate-500">{selectedUser.target_hours} hrs target</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
