import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Play, Square, LogOut, Shield, TrendingUp, BarChart3, Calendar, BookOpen, ChevronLeft, ChevronRight, Plus, Trash2, X, AlertTriangle, ListFilter, Layers, Users, Activity, Search, Download, RefreshCw, Eye, EyeOff, Loader2, Lock, Mail, User, ArrowRight, Settings } from 'lucide-react';
import { api } from '@/lib/api';

/* ─── helpers ─── */
const getToken = () => localStorage.getItem('ojt_token');
const setToken = (t: string) => localStorage.setItem('ojt_token', t);
const clearToken = () => localStorage.removeItem('ojt_token');

/* ─── types ─── */
interface UserT { id: string; name: string; email: string; role: string; target_hours: number }
interface SettingsT { excluded_days: string[]; target_end_date: string | null; target_hours: number }
interface LogT {
  id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number;
  entry_type?: 'regular' | 'overtime';
  description?: string | null;
  check_ip?: string | null;
  verification_status?: 'verified' | 'unverified';
  verification_summary?: string | null;
}
interface StatsT { today: number; week: number; month: number; total: number; daysWorked: number }
interface NotificationT { id: string; type: string; title: string; message: string; created_at: string; read_at: string | null }

const verificationBadgeClass = (status?: LogT['verification_status']) => {
  return status === 'verified' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : '';
};

const verificationLabel = (status?: LogT['verification_status']) => {
  return status === 'verified' ? 'Verified' : '';
};

const logPrimaryText = (log: LogT) => {
  if (log.entry_type === 'overtime' && log.description?.trim()) {
    return log.description.trim();
  }
  return `${new Date(log.time_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}${log.time_out ? ` - ${new Date(log.time_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}` : ''}`;
};

/* ═══════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }: { onLogin: (u: UserT, s: SettingsT | null) => void }) {
  const [isReg, setIsReg] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isReg && !name.trim()) {
        setError('Name is required.');
        return;
      }
      const data = isReg ? await api.register(email.trim(), password, name.trim()) : await api.login(email.trim(), password);
      if (data?.token) { setToken(data.token); onLogin(data.user, data.settings); }
      else setError(data?.error || 'Failed');
    } catch (e: any) { setError(e?.message || 'Connection error'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f172a] to-[#1a1f3a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">OJT<span className="text-cyan-400">ify</span></h1>
          </div>
          <p className="text-slate-400 text-sm">On-the-Job Training Tracker</p>
        </div>
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">{isReg ? 'Create Account' : 'Welcome Back'}</h2>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            {isReg && <div><label className="block text-sm text-slate-400 mb-1.5">Full Name</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" required className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" /></div></div>}
            <div><label className="block text-sm text-slate-400 mb-1.5">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" /></div></div>
            <div><label className="block text-sm text-slate-400 mb-1.5">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required minLength={4} className="w-full pl-10 pr-12 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" /><button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isReg ? 'Create Account' : 'Sign In'}<ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-6 text-center"><button onClick={() => { setIsReg(!isReg); setError(''); }} className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">{isReg ? 'Already have an account? Sign in' : "Don't have an account? Register"}</button></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TIMER CARD
   ═══════════════════════════════════════════════════════════════════ */
function TimerCard({ onSessionChange }: { onSessionChange: () => void }) {
  const [now, setNow] = useState(new Date());
  const [working, setWorking] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!working || !sessionStart) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [working, sessionStart]);
  useEffect(() => {
    api.activeSession().then(d => { if (d?.session) { const s = new Date(d.session.time_in); setSessionStart(s); setWorking(true); setElapsed(Math.floor((Date.now() - s.getTime()) / 1000)); } }).catch(() => {}).finally(() => setInitDone(true));
  }, []);

  const h = now.getHours(), m = now.getMinutes().toString().padStart(2, '0'), s = now.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM', h12 = (h % 12 || 12).toString().padStart(2, '0');
  const fmtDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fmtElapsed = (sec: number) => `${Math.floor(sec / 3600).toString().padStart(2, '0')}:${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

  const handleTimeIn = async () => {
    setLoading(true);
    try {
      const d = await api.timeIn();
      if (d?.log) {
        setSessionStart(new Date(d.log.time_in));
        setWorking(true);
        setElapsed(0);
        onSessionChange();
      } else if (d?.error) {
        alert(d.error);
      }
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };
  const handleTimeOut = async () => { setLoading(true); try { const d = await api.timeOut(); if (d?.success) { setWorking(false); setSessionStart(null); setElapsed(0); onSessionChange(); } else if (d?.error) alert(d.error); } catch (e: any) { alert(e?.message || 'Failed'); } finally { setLoading(false); } };

  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-slate-700/40 rounded-2xl p-6 md:p-10 text-center">
      <div className="mb-2"><span className="text-5xl md:text-7xl font-mono font-light text-white tracking-wider">{h12}:{m}:{s}</span><span className="text-2xl md:text-3xl font-mono text-slate-400 ml-3">{ampm}</span></div>
      <p className="text-slate-400 text-sm md:text-base mb-6 font-medium">{fmtDate}</p>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full ${working ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
        <span className={`text-sm font-medium ${working ? 'text-emerald-400' : 'text-slate-500'}`}>{!initDone ? 'Loading...' : working ? 'Currently Working' : 'Not Working'}</span>
      </div>
      {working && <><div className="text-4xl md:text-6xl font-mono text-emerald-400 mb-2 tracking-wider">{fmtElapsed(elapsed)}</div>{sessionStart && <p className="text-slate-500 text-sm mb-4">Started at {sessionStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>}</>}
      <div className="mt-4">
        {working ? (
          <button onClick={handleTimeOut} disabled={loading} className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-400 hover:to-pink-400 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />} Time Out
          </button>
        ) : (
          <button onClick={handleTimeIn} disabled={loading || !initDone} className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} Time In
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STATS CARDS
   ═══════════════════════════════════════════════════════════════════ */
function StatsCards({ stats }: { stats: StatsT }) {
  const cards = [
    { label: 'TODAY', value: stats.today.toFixed(2), icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'THIS WEEK', value: stats.week.toFixed(2), icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'THIS MONTH', value: stats.month.toFixed(2), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'TOTAL', value: stats.total.toFixed(2), icon: BarChart3, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map(c => (
        <div key={c.label} className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold text-slate-400 tracking-wider">{c.label}</span><div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon className={`w-4 h-4 ${c.color}`} /></div></div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-white">{c.value}</div>
          <div className="text-xs text-slate-500 mt-1">hours</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════════════════ */
function ProgressSection({ total, target }: { total: number; target: number }) {
  const pct = Math.min(Math.round((total / target) * 100), 100);
  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-slate-400 tracking-wider">OJT PROGRESS</h3><span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{pct}%</span></div>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4"><div className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-slate-500 to-cyan-500'}`} style={{ width: `${pct}%` }} /></div>
      <div className="flex items-center justify-between"><span className="text-sm font-mono text-cyan-400">{total.toFixed(2)} hours completed</span><span className="text-sm text-slate-500">Target: {target} hours</span></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INSIGHTS
   ═══════════════════════════════════════════════════════════════════ */
function InsightsPanel({ stats, target, excluded }: { stats: StatsT; target: number; excluded: string[] }) {
  const remaining = Math.max(target - stats.total, 0);
  const avg = stats.daysWorked > 0 ? stats.total / stats.daysWorked : 0;
  const getEst = () => { const d = Math.ceil(remaining / (avg > 0 ? avg : 8)); let date = new Date(), c = 0; while (c < d) { date.setDate(date.getDate() + 1); if (!excluded.includes(date.toLocaleDateString('en-US', { weekday: 'short' }))) c++; } return date; };
  const est = getEst();
  const items = [
    { icon: Clock, label: 'Remaining Hours', value: `${remaining.toFixed(2)} hrs`, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { icon: TrendingUp, label: 'Average per Day', value: `${avg.toFixed(2)} hrs`, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { icon: Calendar, label: `Estimated Completion (excl. ${excluded.join(', ')})`, value: est.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { icon: BarChart3, label: 'Days Worked', value: `${stats.daysWorked} days`, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];
  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0f2027] border border-cyan-500/20 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-6"><h3 className="text-sm font-semibold text-slate-400 tracking-wider">INSIGHTS</h3><div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-cyan-400" /></div></div>
      <div className="space-y-5">{items.map(i => (<div key={i.label} className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl ${i.bg} flex items-center justify-center flex-shrink-0`}><i.icon className={`w-5 h-5 ${i.color}`} /></div><div><p className="text-xs text-slate-400">{i.label}</p><p className="text-lg font-bold font-mono text-white">{i.value}</p></div></div>))}</div>
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-center"><p className="text-sm text-cyan-300">{stats.total >= target ? 'Congratulations! OJT hours completed!' : stats.daysWorked > 0 ? "Keep going! You're making great progress!" : 'Ready to start your OJT journey!'}</p></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CALENDAR
   ═══════════════════════════════════════════════════════════════════ */
function CalendarView({ logs }: { logs: LogT[] }) {
  const [cur, setCur] = useState(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const y = cur.getFullYear(), mo = cur.getMonth();
  const dim = new Date(y, mo + 1, 0).getDate(), fd = new Date(y, mo, 1).getDay();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const worked: Record<string, { hours: number; entries: LogT[] }> = {};
  logs.forEach(l => { const d = new Date(l.time_in).toLocaleDateString('en-CA'); if (!worked[d]) worked[d] = { hours: 0, entries: [] }; worked[d].hours += l.total_hours || 0; worked[d].entries.push(l); });
  const days: (number | null)[] = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCur(new Date(y, mo - 1, 1))} className="w-8 h-8 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-all"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-base font-semibold text-white">{cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCur(new Date(y, mo + 1, 1))} className="w-8 h-8 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-all"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{days.map((day, i) => { if (!day) return <div key={`e${i}`} />; const ds = `${y}-${(mo+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`; const isT = ds === todayStr; const hw = worked[ds]; const isS = ds === sel; return (<button key={ds} onClick={() => setSel(isS ? null : ds)} className={`relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${isS ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400' : isT ? 'border border-cyan-500/40 text-cyan-400' : hw ? 'text-white hover:bg-slate-800/50' : 'text-slate-500 hover:bg-slate-800/30'}`}>{day}{hw && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />}</button>); })}</div>
      {sel && <div className="mt-4 pt-4 border-t border-slate-700/40"><h4 className="text-sm font-medium text-slate-400 mb-2">{new Date(sel+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</h4>{worked[sel] ? worked[sel].entries.map(l => <div key={l.id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2 mb-1"><span className="text-slate-300">{logPrimaryText(l)}</span><span className="text-cyan-400 font-mono">{(l.total_hours||0).toFixed(2)} hrs</span></div>) : <p className="text-xs text-slate-500">No entries</p>}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RECENT ENTRIES
   ═══════════════════════════════════════════════════════════════════ */
function RecentEntries({ logs }: { logs: LogT[] }) {
  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2"><h3 className="text-sm font-semibold text-slate-400 tracking-wider">RECENT ENTRIES</h3></div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {logs.length === 0 ? <div className="text-center py-10"><Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-500 text-sm">No time entries yet.</p><p className="text-slate-600 text-xs mt-1">Click "Time In" to start tracking!</p></div> : logs.slice(0, 20).map(l => (
          <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/30">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400">{new Date(l.time_in).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
              <div className="text-sm text-slate-300">{logPrimaryText(l)}{!l.time_out ? <span className="text-emerald-400 ml-2 text-xs">Active</span> : null}</div>
              <div className="mt-1 flex items-center gap-2">
                {l.verification_status === 'verified' && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${verificationBadgeClass(l.verification_status)}`}>{verificationLabel(l.verification_status)}</span>
                )}
                {l.check_ip && <span className="text-[11px] text-slate-500">{l.check_ip}</span>}
              </div>
              {l.verification_summary && <p className="mt-1 text-[11px] text-slate-500">{l.verification_summary}</p>}
            </div>
            <div className="text-sm font-mono text-cyan-400">{(l.total_hours||0).toFixed(2)} hrs</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserT;
  onSave: (user: UserT) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  }, [isOpen, user]);

  if (!isOpen) return null;

  const saveProfile = async () => {
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const result = await api.updateAccount({ name, email });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.user) {
        onSave(result.user);
      }
      setMessage(result?.message || 'Profile updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setError('');
    setMessage('');
    try {
      const result = await api.updatePassword(password);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPassword('');
      setConfirmPassword('');
      setMessage(result?.message || 'Password updated.');
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/50 bg-[#111827] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Account Settings</h3>
            <p className="text-sm text-slate-500">Update your profile and sign-in details.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-6 px-6 py-5">
          {(message || error) && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
              {error || message}
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-slate-700/40 bg-slate-900/30 p-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-[#0d1117] px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-[#0d1117] px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-700/40 bg-slate-900/30 p-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-[#0d1117] px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-[#0d1117] px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="flex justify-end">
              <button onClick={savePassword} disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl border border-slate-600/60 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════════════════════════════════ */
function SettingsModal({ isOpen, onClose, settings, onSave }: { isOpen: boolean; onClose: () => void; settings: SettingsT; onSave: (s: SettingsT) => void }) {
  const [th, setTh] = useState(settings.target_hours);
  const [ted, setTed] = useState(settings.target_end_date || '');
  const [ed, setEd] = useState(settings.excluded_days);
  const [showDays, setShowDays] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  useEffect(() => { setTh(settings.target_hours); setTed(settings.target_end_date || ''); setEd(settings.excluded_days); }, [settings]);
  const toggleDay = (d: string) => setEd(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const save = async () => { setSaving(true); try { const ns = { target_hours: th, target_end_date: ted || null, excluded_days: ed }; await api.saveSettings(ns); onSave(ns as SettingsT); onClose(); } catch {} finally { setSaving(false); } };
  const reset = async () => { setResetting(true); try { await api.resetData(); onClose(); window.location.reload(); } catch {} finally { setResetting(false); } };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 pb-4"><h2 className="text-xl font-bold text-white">Settings</h2><button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
      <div className="px-6 pb-6 space-y-6">
        <div><label className="block text-sm font-medium text-slate-300 mb-2">Target OJT Hours</label><input type="number" value={th} onChange={e => setTh(Number(e.target.value))} min={1} className="w-full px-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white text-lg font-mono focus:outline-none focus:border-cyan-500/50" /></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Target End Date (Optional)</label><input type="date" value={ted} onChange={e => setTed(e.target.value)} className="w-full px-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /><p className="text-xs text-slate-500 mt-1">Set a deadline to see required hours per day</p></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Exclude Days from Calculation</label><p className="text-xs text-slate-500 mb-3">These days will be excluded from Insights and estimated completion.</p><button onClick={() => setShowDays(!showDays)} className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white hover:border-slate-600 transition-all"><span>Excluded: {ed.length > 0 ? ed.join(', ') : 'None'}</span><ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDays ? 'rotate-90' : ''}`} /></button>{showDays && <div className="mt-2 grid grid-cols-7 gap-1">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <button key={d} onClick={() => toggleDay(d)} className={`py-2 text-xs rounded-lg font-medium transition-all ${ed.includes(d) ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400' : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-white'}`}>{d}</button>)}</div>}</div>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white font-medium transition-all">Cancel</button><button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}</button></div>
        <div className="pt-4 border-t border-slate-700/40"><h4 className="text-sm font-medium text-rose-400 flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" />Danger Zone</h4><button onClick={reset} disabled={resetting} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">{resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Reset All Data</button></div>
      </div>
    </div></div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */
function AdminDash() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'active'|'offline'>('all');
  const [now, setNow] = useState(Date.now());
  const [insUser, setInsUser] = useState<any>(null);
  const [insStats, setInsStats] = useState<StatsT | null>(null);
  const [insSettings, setInsSettings] = useState<SettingsT>({ excluded_days: ['Sun'], target_end_date: null, target_hours: 600 });
  const [insLoading, setInsLoading] = useState(false);
  const [selUser, setSelUser] = useState<any>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addIn, setAddIn] = useState('');
  const [addOut, setAddOut] = useState('');
  const [addHours, setAddHours] = useState('2');
  const [addDescription, setAddDescription] = useState('');
  const [isOvertimeEntry, setIsOvertimeEntry] = useState(false);
  const [savingNewLog, setSavingNewLog] = useState(false);
  const [userSettings, setUserSettings] = useState<SettingsT>({ excluded_days: ['Sun'], target_end_date: null, target_hours: 600 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showAddLogPanel, setShowAddLogPanel] = useState(false);

  const fetch = useCallback(async () => { try { const d = await api.adminUsers(); if (d?.users) setUsers(d.users); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetch(); const i = setInterval(fetch, 15000); return () => clearInterval(i); }, [fetch]);
  useEffect(() => api.subscribe(() => {
    fetch();
    if (selUser) {
      api.logs({ userId: selUser.id }).then(d => setUserLogs(d?.logs || [])).catch(() => {});
    }
  }), [fetch, selUser]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const filtered = users.filter(u => u.role !== 'admin').filter(u => { const ms = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()); const mf = filter === 'all' || (filter === 'active' && u.isActive) || (filter === 'offline' && !u.isActive); return ms && mf; });
  const students = users.filter(u => u.role !== 'admin');
  const totalH = students.reduce((s: number, u: any) => s + u.totalHours, 0);
  const activeN = students.filter((u: any) => u.isActive).length;
  const avgPct = students.length > 0 ? Math.round(students.reduce((s: number, u: any) => s + u.progress, 0) / students.length) : 0;
  const selectedUserTotal = userLogs.reduce((sum: number, log: any) => sum + (log.total_hours || 0), 0);
  const fmtE = (st: string) => { const sec = Math.floor((now - new Date(st).getTime()) / 1000); return `${Math.floor(sec/3600).toString().padStart(2,'0')}:${Math.floor((sec%3600)/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`; };

  const handleExport = async () => { try { const d = await api.adminExport({}); if (d?.logs) { const csv = ['Name,Email,Date,Time In,Time Out,Hours,Entry Type', ...d.logs.map((l: any) => `"${l.profiles?.name||''}","${l.profiles?.email||''}","${new Date(l.time_in).toLocaleDateString()}","${new Date(l.time_in).toLocaleTimeString()}","${l.time_out?new Date(l.time_out).toLocaleTimeString():'Active'}","${(l.total_hours||0).toFixed(2)}","${l.entry_type||'regular'}"`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = `ojt-report-${new Date().toISOString().split('T')[0]}.csv`; a.click(); } } catch {} };
  const viewInsights = async (u: any) => {
    setSelUser(null);
    cancelEditLog();
    setInsUser(u);
    setInsLoading(true);
    try {
      const [statsData, settingsData] = await Promise.all([
        api.stats(u.id),
        api.getUserSettings(u.id),
      ]);
      setInsStats(statsData || { today: 0, week: 0, month: 0, total: 0, daysWorked: 0 });
      setInsSettings(settingsData?.settings || { excluded_days: ['Sun'], target_end_date: null, target_hours: u.target_hours || 600 });
    } catch {
      setInsStats({ today: 0, week: 0, month: 0, total: 0, daysWorked: 0 });
    } finally {
      setInsLoading(false);
    }
  };
  const viewLogs = async (u: any) => {
    setInsUser(null);
    setSelUser(u);
    setEditingLogId(null);
    const now = new Date();
    setAddDate(now.toLocaleDateString('en-CA'));
    setAddIn('08:00');
    setAddOut('17:00');
    setAddHours('2');
    setAddDescription('');
    setIsOvertimeEntry(false);
    setShowSettingsPanel(false);
    setShowAddLogPanel(false);
    try {
      const [logsData, settingsData] = await Promise.all([
        api.logs({ userId: u.id }),
        api.getUserSettings(u.id),
      ]);
      setUserLogs(logsData?.logs || []);
      setUserSettings(settingsData?.settings || { excluded_days: ['Sun'], target_end_date: null, target_hours: u.target_hours || 600 });
    } catch {}
  };
  const delUser = async (id: string) => { if (!confirm('Delete this user?')) return; try { await api.adminDelete(id); fetch(); } catch {} };
  const startEditLog = (log: any) => {
    const timeIn = new Date(log.time_in);
    const timeOut = log.time_out ? new Date(log.time_out) : null;
    setEditingLogId(log.id);
    setEditDate(timeIn.toLocaleDateString('en-CA'));
    setEditIn(timeIn.toTimeString().slice(0, 5));
    setEditOut(timeOut ? timeOut.toTimeString().slice(0, 5) : '');
  };
  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditDate('');
    setEditIn('');
    setEditOut('');
  };
  const toggleExcludedDay = (day: string) => {
    setUserSettings(prev => ({
      ...prev,
      excluded_days: prev.excluded_days.includes(day)
        ? prev.excluded_days.filter(item => item !== day)
        : [...prev.excluded_days, day],
    }));
  };
  const saveStudentSettings = async () => {
    if (!selUser) return;
    setSavingSettings(true);
    try {
      const result = await api.saveUserSettings(selUser.id, userSettings);
      if (result?.settings) {
        setUserSettings(result.settings);
      }
      await fetch();
    } catch (e: any) {
      alert(e?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };
  const addManualLog = async () => {
    if (!selUser) return;
    if (!addDate || (!isOvertimeEntry && !addIn)) {
      alert(isOvertimeEntry ? 'Please complete the date field.' : 'Please complete the date and time in fields.');
      return;
    }

    setSavingNewLog(true);
    try {
      const baseTimeIn = isOvertimeEntry ? `${addDate}T18:00:00` : `${addDate}T${addIn}:00`;
      const timeIn = new Date(baseTimeIn).toISOString();
      let timeOut: string;

      if (isOvertimeEntry) {
        const overtimeHours = Number(addHours);
        if (!Number.isFinite(overtimeHours) || overtimeHours <= 0) {
          alert('Please enter a valid overtime duration in hours.');
          return;
        }
        if (!addDescription.trim()) {
          alert('Please enter an overtime description.');
          return;
        }
        timeOut = new Date(new Date(baseTimeIn).getTime() + overtimeHours * 60 * 60 * 1000).toISOString();
      } else {
        if (!addOut) {
          alert('Please complete the time out field.');
          return;
        }
        timeOut = new Date(`${addDate}T${addOut}:00`).toISOString();
      }

      const result = await api.addUserEntry(selUser.id, timeIn, timeOut, {
        entry_type: isOvertimeEntry ? 'overtime' : 'regular',
        description: isOvertimeEntry ? addDescription.trim() : null,
      });
      if (result?.error) {
        alert(result.error);
        return;
      }
      const [logsData, usersData] = await Promise.all([
        api.logs({ userId: selUser.id }),
        api.adminUsers(),
      ]);
      setUserLogs(logsData?.logs || []);
      if (usersData?.users) setUsers(usersData.users);
      alert(isOvertimeEntry ? 'Overtime entry added.' : 'Log entry added.');
    } catch (e: any) {
      alert(e?.message || 'Failed to add log entry');
    } finally {
      setSavingNewLog(false);
    }
  };
  const saveEditLog = async () => {
    if (!editingLogId || !editDate || !editIn) return;
    setSavingLog(true);
    try {
      const timeIn = new Date(`${editDate}T${editIn}:00`).toISOString();
      const timeOut = editOut ? new Date(`${editDate}T${editOut}:00`).toISOString() : null;
      const result = await api.updateEntry(editingLogId, timeIn, timeOut);
      if (result?.error) {
        alert(result.error);
        return;
      }
      if (selUser) {
        const d = await api.logs({ userId: selUser.id });
        setUserLogs(d?.logs || []);
      }
      await fetch();
      cancelEditLog();
    } catch (e: any) {
      alert(e?.message || 'Failed to update log');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ l: 'TOTAL STUDENTS', v: students.length, i: Users, c: 'text-blue-400', b: 'bg-blue-400/10' }, { l: 'ACTIVE NOW', v: activeN, i: Activity, c: 'text-emerald-400', b: 'bg-emerald-400/10' }, { l: 'TOTAL HOURS', v: totalH.toFixed(1), i: Clock, c: 'text-cyan-400', b: 'bg-cyan-400/10' }, { l: 'AVG COMPLETION', v: `${avgPct}%`, i: TrendingUp, c: 'text-amber-400', b: 'bg-amber-400/10' }].map(c => (
          <div key={c.l} className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold text-slate-400 tracking-wider">{c.l}</span><div className={`w-8 h-8 rounded-lg ${c.b} flex items-center justify-center`}><c.i className={`w-4 h-4 ${c.c}`} /></div></div><div className="text-3xl font-bold font-mono text-white">{c.v}</div></div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50" /></div>
        <div className="flex gap-2">{(['all','active','offline'] as const).map(s => <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2.5 text-sm rounded-xl border capitalize transition-all ${filter===s?'bg-cyan-500/20 border-cyan-500/30 text-cyan-400':'border-slate-700/50 text-slate-400 hover:text-white'}`}>{s}</button>)}<button onClick={fetch} className="px-3 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button><button onClick={handleExport} className="px-4 py-2.5 text-sm rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium flex items-center gap-2"><Download className="w-4 h-4" />Export</button></div>
      </div>
      <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5"><h3 className="text-sm font-semibold text-slate-400 tracking-wider mb-4">LIVE MONITORING</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(u => (
          <div key={u.id} onClick={() => viewInsights(u)} className={`p-4 rounded-xl border transition-all cursor-pointer ${u.isActive?'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/30':'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/40'}`}>
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${u.isActive?'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white':'bg-slate-700 text-slate-400'}`}>{u.name.charAt(0)}</div><div><p className="text-sm font-medium text-white">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div><div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${u.isActive?'bg-emerald-400 animate-pulse':'bg-slate-600'}`} /><span className={`text-xs ${u.isActive?'text-emerald-400':'text-slate-500'}`}>{u.isActive?'Working':'Offline'}</span></div></div>
            {u.isActive && u.activeSessionStart && <div className="text-lg font-mono text-emerald-400 mb-2">{fmtE(u.activeSessionStart)}</div>}
            <div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Progress</div><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${u.progress>=100?'bg-emerald-400':'bg-cyan-400'}`} style={{width:`${Math.min(u.progress,100)}%`}} /></div><span className="text-xs text-slate-400">{u.progress}%</span></div></div><div className="text-right"><div className="text-xs text-slate-500">Hours</div><div className="text-sm font-mono text-white">{u.totalHours.toFixed(1)}/{u.target_hours}</div></div></div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/30"><button onClick={(e) => { e.stopPropagation(); viewLogs(u); }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-cyan-400 transition-all"><Eye className="w-3.5 h-3.5" />View Logs</button><button onClick={(e) => { e.stopPropagation(); delUser(u.id); }} className="px-3 py-1.5 text-xs rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button></div>
          </div>
        ))}
      {filtered.length === 0 && <div className="col-span-full text-center py-10"><Users className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-500 text-sm">No students found</p></div>}
      </div></div>
      {insUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/40">
              <div>
                <h3 className="text-lg font-semibold text-white">{insUser.name}'s Insights</h3>
                <p className="text-sm text-slate-500">{insUser.email}</p>
              </div>
              <button onClick={() => setInsUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {insLoading || !insStats ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
              ) : (
                <>
                  <StatsCards stats={insStats} />
                  <ProgressSection total={insStats.total} target={insSettings.target_hours} />
                  <InsightsPanel stats={insStats} target={insSettings.target_hours} excluded={insSettings.excluded_days} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {selUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/40">
              <div>
                <h3 className="text-lg font-semibold text-white">{selUser.name}'s Logs</h3>
                <p className="text-sm text-slate-500">{selUser.email}</p>
              </div>
              <button onClick={() => { cancelEditLog(); setSelUser(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-slate-800/30 rounded-xl border border-slate-700/30">
                <button onClick={() => setShowSettingsPanel(prev => !prev)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 tracking-wider">OJT SETTINGS</h4>
                    <p className="text-xs text-slate-500 mt-1">Target hours, end date, and excluded days.</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showSettingsPanel ? 'rotate-90' : ''}`} />
                </button>
                {showSettingsPanel && (
                  <div className="border-t border-slate-700/30 px-4 pb-4">
                    <div className="flex items-center justify-end mb-4 pt-4">
                      <button onClick={saveStudentSettings} disabled={savingSettings} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all disabled:opacity-50">
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Target OJT Hours</label>
                        <input type="number" min={1} value={userSettings.target_hours} onChange={e => setUserSettings(prev => ({ ...prev, target_hours: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Target End Date</label>
                        <input type="date" value={userSettings.target_end_date || ''} onChange={e => setUserSettings(prev => ({ ...prev, target_end_date: e.target.value || null }))} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-slate-400 mb-2">Exclude Days from Calculation</label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                          <button key={day} onClick={() => toggleExcludedDay(day)} className={`py-2 text-xs rounded-lg border transition-all ${userSettings.excluded_days.includes(day) ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-900/60 border-slate-700/40 text-slate-400 hover:text-white'}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/30 rounded-xl border border-slate-700/30">
                <button onClick={() => setShowAddLogPanel(prev => !prev)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 tracking-wider">ADD LOG / OVERTIME</h4>
                    <p className="text-xs text-slate-500 mt-1">Create regular entries or overtime blocks.</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showAddLogPanel ? 'rotate-90' : ''}`} />
                </button>
                {showAddLogPanel && (
                  <div className="border-t border-slate-700/30 px-4 pb-4">
                    <div className="flex items-center justify-between gap-3 mb-4 pt-4">
                      <p className="text-xs text-slate-500">Use regular entries for shift ranges, or switch to overtime and enter only the overtime hours.</p>
                      <button onClick={addManualLog} disabled={savingNewLog} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-all disabled:opacity-50">
                        {savingNewLog ? 'Saving...' : isOvertimeEntry ? 'Add Overtime' : 'Add Entry'}
                      </button>
                    </div>
                    <div className="mb-4 flex gap-2">
                      <button onClick={() => setIsOvertimeEntry(false)} className={`px-3 py-2 text-xs rounded-lg border transition-all ${!isOvertimeEntry ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'border-slate-700/50 text-slate-400 hover:text-white'}`}>Regular Entry</button>
                      <button onClick={() => setIsOvertimeEntry(true)} className={`px-3 py-2 text-xs rounded-lg border transition-all ${isOvertimeEntry ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'border-slate-700/50 text-slate-400 hover:text-white'}`}>Overtime</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                      {isOvertimeEntry ? (
                        <>
                          <input type="number" min="0.25" step="0.25" value={addHours} onChange={e => setAddHours(e.target.value)} placeholder="Hours" className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                          <input type="text" value={addDescription} onChange={e => setAddDescription(e.target.value)} placeholder="Description" className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                        </>
                      ) : (
                        <>
                          <input type="time" value={addIn} onChange={e => setAddIn(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                          <input type="time" value={addOut} onChange={e => setAddOut(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {userLogs.map((l: any) => (
                  <div key={l.id} className="px-4 py-3 bg-slate-800/30 rounded-lg">
                    {editingLogId === l.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                          <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                          <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)} className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">Leave time out blank to keep the session active.</span>
                          <div className="flex gap-2">
                            <button onClick={cancelEditLog} className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-white transition-all">Cancel</button>
                            <button onClick={saveEditLog} disabled={savingLog} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all disabled:opacity-50">{savingLog ? 'Saving...' : 'Save'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm text-white">{new Date(l.time_in).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                          <div className="text-xs text-slate-400">
                            {l.entry_type === 'overtime' && l.description ? l.description : `${new Date(l.time_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}${l.time_out ? ` - ${new Date(l.time_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}` : ''}`}
                            {!l.time_out ? <span className="text-emerald-400 ml-2">Active</span> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {l.verification_status === 'verified' && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${verificationBadgeClass(l.verification_status)}`}>{verificationLabel(l.verification_status)}</span>
                            )}
                            {l.entry_type === 'overtime' && <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">Overtime</span>}
                            {l.check_ip && <span className="text-[11px] text-slate-500">{l.check_ip}</span>}
                          </div>
                          {l.verification_summary && <p className="mt-1 text-[11px] text-slate-500">{l.verification_summary}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-cyan-400">{(l.total_hours||0).toFixed(2)} hrs</span>
                          <button onClick={() => startEditLog(l)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-cyan-400 transition-all">Edit</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {userLogs.length===0&&<p className="text-center text-slate-500 py-10">No logs found</p>}
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/40 text-center">
              <span className="text-sm text-slate-400">Total: <span className="text-cyan-400 font-mono font-bold">{selectedUserTotal.toFixed(2)} hrs</span> / {userSettings.target_hours} hrs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP LAYOUT
   ═══════════════════════════════════════════════════════════════════ */
const AppLayout: React.FC = () => {
  const [user, setUser] = useState<UserT | null>(null);
  const [settings, setSettings] = useState<SettingsT>({ excluded_days: ['Sun'], target_end_date: null, target_hours: 600 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsT>({ today: 0, week: 0, month: 0, total: 0, daysWorked: 0 });
  const [logs, setLogs] = useState<LogT[]>([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  // Check token on mount
  useEffect(() => {
    api.verify().then(d => { if (d?.user) { setUser(d.user); if (d.settings) setSettings(d.settings); } else clearToken(); }).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [s, l] = await Promise.all([api.stats(), api.logs({ limit: 100 })]);
      if (s) setStats(s);
      if (l?.logs) setLogs(l.logs);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    return api.subscribe(() => {
      fetchData();
    });
  }, [user, fetchData]);

  const handleLogin = (u: UserT, s: SettingsT | null) => { setUser(u); if (s) setSettings(s); };
  const handleLogout = async () => { await api.logout().catch(() => {}); clearToken(); setUser(null); };
  const handleAccountSaved = (nextUser: UserT) => {
    setUser(nextUser);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f172a] to-[#1a1f3a] flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" /><p className="text-slate-400 text-sm">Loading OJTify...</p></div>
    </div>
  );

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f172a] to-[#1a1f3a]">
      {/* Header */}
      <header className="bg-[#0d1117]/90 backdrop-blur-xl border-b border-slate-700/50 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center"><Clock className="w-4 h-4 text-cyan-400" /></div>
          <h1 className="text-xl font-bold text-white tracking-tight">OJT<span className="text-cyan-400">ify</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Admin Panel</span></div>}
          <span className="text-sm text-slate-400 hidden sm:inline">{user.name}</span>
          {user.role !== 'admin' && (
            <button onClick={() => setShowAccountSettings(true)} className="w-9 h-9 rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all">
              <Settings className="w-4 h-4" />
            </button>
          )}
          {user.role === 'admin' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</div>
          )}
          <button onClick={handleLogout} className="w-9 h-9 rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {user.role === 'admin' ? <AdminDash /> : (
          <div className="space-y-6">
            <TimerCard onSessionChange={fetchData} />
            <StatsCards stats={stats} />
            <ProgressSection total={stats.total} target={settings.target_hours} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InsightsPanel stats={stats} target={settings.target_hours} excluded={settings.excluded_days} />
              <CalendarView logs={logs} />
            </div>
            <RecentEntries logs={logs} />
          </div>
        )}
      </main>
      {user.role !== 'admin' && (
        <AccountSettingsModal
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          user={user}
          onSave={handleAccountSaved}
        />
      )}
    </div>
  );
};

export default AppLayout;
