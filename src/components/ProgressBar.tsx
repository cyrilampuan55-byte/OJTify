import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProgressBarProps {
  totalHours: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ totalHours }) => {
  const { user, settings } = useAuth();
  const targetHours = settings?.target_hours || user?.target_hours || 600;
  const percentage = Math.min(Math.round((totalHours / targetHours) * 100), 100);

  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 tracking-wider">OJT PROGRESS</h3>
        <span className={`text-sm font-bold ${percentage >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
          {percentage}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            percentage >= 100
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : percentage >= 75
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
              : percentage >= 50
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
              : 'bg-gradient-to-r from-slate-500 to-cyan-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-cyan-400">
          {totalHours.toFixed(2)} hours completed
        </span>
        <span className="text-sm text-slate-500">
          Target: {targetHours} hours
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
