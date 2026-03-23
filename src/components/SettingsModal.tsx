import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { X, AlertTriangle, Trash2, Loader2, ChevronRight, Calendar } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const { settings, updateSettings } = useAuth();
  const [targetHours, setTargetHours] = useState(600);
  const [targetEndDate, setTargetEndDate] = useState('');
  const [excludedDays, setExcludedDays] = useState<string[]>(['Sun']);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setTargetHours(settings.target_hours || 600);
      setTargetEndDate(settings.target_end_date || '');
      setExcludedDays(settings.excluded_days || ['Sun']);
    }
  }, [settings]);

  const toggleDay = (day: string) => {
    setExcludedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        target_hours: targetHours,
        target_end_date: targetEndDate || null,
        excluded_days: excludedDays,
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetData();
      setShowResetConfirm(false);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to reset data:', err);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Target OJT Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target OJT Hours</label>
            <input
              type="number"
              value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
              min={1}
              className="w-full px-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>

          {/* Target End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target End Date (Optional)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="Select date (optional)"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Set a deadline to see required hours per day</p>
          </div>

          {/* Exclude Days */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Exclude Days from Calculation</label>
            <p className="text-xs text-slate-500 mb-3">Choose days you don't work. These days will be excluded from Insights and estimated completion.</p>

            <button
              onClick={() => setShowDayPicker(!showDayPicker)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-slate-700/50 rounded-xl text-white hover:border-slate-600 transition-all"
            >
              <span>Excluded: {excludedDays.length > 0 ? excludedDays.join(', ') : 'None'}</span>
              <div className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-4 h-4" />
                <ChevronRight className={`w-4 h-4 transition-transform ${showDayPicker ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {showDayPicker && (
              <div className="mt-2 grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`py-2 text-xs rounded-lg font-medium transition-all ${
                      excludedDays.includes(day)
                        ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                        : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-slate-700/40">
            <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h4>

            {showResetConfirm ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Are you sure? This will delete all your time logs permanently.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-all"
                  >
                    {resetting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reset'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
