import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeLog {
  id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number;
}

interface CalendarViewProps {
  logs: TimeLog[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ logs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Map of dates that have logs
  const workedDays = useMemo(() => {
    const map: Record<string, { hours: number; entries: TimeLog[] }> = {};
    logs.forEach((log) => {
      const dateStr = new Date(log.time_in).toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!map[dateStr]) map[dateStr] = { hours: 0, entries: [] };
      map[dateStr].hours += log.total_hours || 0;
      map[dateStr].entries.push(log);
    });
    return map;
  }, [logs]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const selectedDateLogs = selectedDate ? workedDays[selectedDate]?.entries || [] : [];

  return (
    <div className="bg-[#111827]/80 border border-slate-700/40 rounded-2xl p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-white">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const hasWork = workedDays[dateStr];
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : isToday
                  ? 'border border-cyan-500/40 text-cyan-400'
                  : hasWork
                  ? 'text-white hover:bg-slate-800/50'
                  : 'text-slate-500 hover:bg-slate-800/30'
              }`}
            >
              {day}
              {hasWork && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-slate-700/40">
          <h4 className="text-sm font-medium text-slate-400 mb-2">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h4>
          {selectedDateLogs.length > 0 ? (
            <div className="space-y-2">
              {selectedDateLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-slate-300">
                    {new Date(log.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {log.time_out && (
                      <> - {new Date(log.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                    )}
                  </span>
                  <span className="text-cyan-400 font-mono">{(log.total_hours || 0).toFixed(2)} hrs</span>
                </div>
              ))}
              <div className="text-right text-xs text-slate-500">
                Total: <span className="text-cyan-400 font-mono">{workedDays[selectedDate]?.hours.toFixed(2)} hrs</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No entries for this day</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
