import React from 'react';
import { Clock, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    { label: 'TODAY', value: stats.today.toFixed(2), icon: Clock, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-cyan-500/20' },
    { label: 'THIS WEEK', value: stats.week.toFixed(2), icon: Calendar, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', borderColor: 'border-emerald-500/20' },
    { label: 'THIS MONTH', value: stats.month.toFixed(2), icon: TrendingUp, color: 'text-amber-400', bgColor: 'bg-amber-400/10', borderColor: 'border-amber-500/20' },
    { label: 'TOTAL', value: stats.total.toFixed(2), icon: BarChart3, color: 'text-rose-400', bgColor: 'bg-rose-400/10', borderColor: 'border-rose-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-[#111827]/80 border border-slate-700/40 rounded-xl p-4 md:p-5 hover:border-slate-600/50 transition-all`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-white">{card.value}</div>
          <div className="text-xs text-slate-500 mt-1">hours</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
