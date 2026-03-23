import React, { useState } from 'react';
import { api } from '@/lib/api';
import { ListFilter, Plus, Layers, Trash2, Loader2, X } from 'lucide-react';

interface TimeLog {
  id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number;
}

interface RecentEntriesProps {
  logs: TimeLog[];
  onRefresh: () => void;
}

const RecentEntries: React.FC<RecentEntriesProps> = ({ logs, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addDate, setAddDate] = useState('');
  const [addTimeIn, setAddTimeIn] = useState('08:00');
  const [addTimeOut, setAddTimeOut] = useState('17:00');
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const handleAdd = async () => {
    if (!addDate || !addTimeIn || !addTimeOut) return;
    setLoading(true);
    try {
      const timeIn = new Date(`${addDate}T${addTimeIn}:00`).toISOString();
      const timeOut = new Date(`${addDate}T${addTimeOut}:00`).toISOString();
      await api.addEntry(timeIn, timeOut);
      setShowAddModal(false);
      setAddDate('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add entry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      for (const id of selected) {
        await api.deleteEntry(id);
      }
      setSelected(new Set());
      setSelectMode(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete entries:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-400 tracking-wider">RECENT ENTRIES</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
              selectMode
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Select
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Select mode actions */}
      {selectMode && selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete ({selected.size})
          </button>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-center py-10">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No time entries yet.</p>
            <p className="text-slate-600 text-xs mt-1">Click "Time In" to start tracking!</p>
          </div>
        ) : (
          logs.slice(0, 20).map((log) => (
            <div
              key={log.id}
              onClick={() => selectMode && toggleSelect(log.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                selectMode ? 'cursor-pointer hover:bg-slate-800/50' : ''
              } ${selected.has(log.id) ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-800/30'}`}
            >
              {selectMode && (
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  selected.has(log.id) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                }`}>
                  {selected.has(log.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400">
                  {new Date(log.time_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-sm text-slate-300">
                  {new Date(log.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {log.time_out ? (
                    <span> - {new Date(log.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  ) : (
                    <span className="text-emerald-400 ml-2 text-xs">Active</span>
                  )}
                </div>
              </div>
              <div className="text-sm font-mono text-cyan-400">
                {(log.total_hours || 0).toFixed(2)} hrs
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700/50 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Time In</label>
                  <input
                    type="time"
                    value={addTimeIn}
                    onChange={(e) => setAddTimeIn(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Time Out</label>
                  <input
                    type="time"
                    value={addTimeOut}
                    onChange={(e) => setAddTimeOut(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={loading || !addDate}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentEntries;
