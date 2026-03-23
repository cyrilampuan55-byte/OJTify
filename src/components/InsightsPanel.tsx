import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, TrendingDown, Calendar, BarChart3, BookOpen } from 'lucide-react';

interface InsightsPanelProps {
  stats: {
    total: number;
    daysWorked: number;
  };
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ stats }) => {
  const { user, settings } = useAuth();
  const targetHours = settings?.target_hours || user?.target_hours || 600;
  const remainingHours = Math.max(targetHours - stats.total, 0);
  const avgPerDay = stats.daysWorked > 0 ? stats.total / stats.daysWorked : 0;

  // Estimate completion date
  const getEstimatedCompletion = () => {
    if (avgPerDay <= 0) {
      // If no average, estimate based on 8 hrs/day
      const daysNeeded = Math.ceil(remainingHours / 8);
      const excluded = settings?.excluded_days || ['Sun'];
      let date = new Date();
      let count = 0;
      while (count < daysNeeded) {
        date.setDate(date.getDate() + 1);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (!excluded.includes(dayName)) count++;
      }
      return date;
    }

    const daysNeeded = Math.ceil(remainingHours / avgPerDay);
    const excluded = settings?.excluded_days || ['Sun'];
    let date = new Date();
    let count = 0;
    while (count < daysNeeded) {
      date.setDate(date.getDate() + 1);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (!excluded.includes(dayName)) count++;
    }
    return date;
  };

  const estimatedDate = getEstimatedCompletion();

  const insights = [
    {
      icon: Clock,
      label: 'Remaining Hours',
      value: `${remainingHours.toFixed(2)} hrs`,
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/10',
    },
    {
      icon: TrendingDown,
      label: 'Average per Day',
      value: `${avgPerDay.toFixed(2)} hrs`,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
    },
    {
      icon: Calendar,
      label: 'Estimated Completion',
      sublabel: '(excl. ' + (settings?.excluded_days || ['Sun']).join(', ') + ')',
      value: estimatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      icon: BarChart3,
      label: 'Days Worked',
      value: `${stats.daysWorked} days`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0f2027] border border-cyan-500/20 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-400 tracking-wider">INSIGHTS</h3>
        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      <div className="space-y-5">
        {insights.map((insight) => (
          <div key={insight.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
              <insight.icon className={`w-5 h-5 ${insight.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">
                {insight.label}
                {insight.sublabel && <span className="text-slate-500 ml-1">{insight.sublabel}</span>}
              </p>
              <p className="text-lg font-bold font-mono text-white">{insight.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-center">
        <p className="text-sm text-cyan-300">
          {stats.total >= targetHours
            ? 'Congratulations! You have completed your OJT hours!'
            : stats.daysWorked > 0
            ? `Keep going! You're making great progress!`
            : 'Ready to start your OJT journey!'}
        </p>
      </div>
    </div>
  );
};

export default InsightsPanel;
