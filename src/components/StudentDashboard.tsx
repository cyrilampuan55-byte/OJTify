import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import TimerCard from './TimerCard';
import StatsCards from './StatsCards';
import ProgressBar from './ProgressBar';
import InsightsPanel from './InsightsPanel';
import CalendarView from './CalendarView';
import RecentEntries from './RecentEntries';

interface Stats {
  today: number;
  week: number;
  month: number;
  total: number;
  daysWorked: number;
}

interface TimeLog {
  id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number;
}

const statsFromLogs = (logs: TimeLog[]): Stats => {
  const completed = logs.filter(log => log.time_out);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStartDate.setDate(weekStartDate.getDate() - ((weekStartDate.getDay() + 6) % 7));
  const weekStart = weekStartDate.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const totals = completed.reduce(
    (stats, log) => {
      const stamp = new Date(log.time_in).getTime();
      const hours = log.total_hours || 0;
      stats.total += hours;
      if (stamp >= dayStart) stats.today += hours;
      if (stamp >= weekStart) stats.week += hours;
      if (stamp >= monthStart) stats.month += hours;
      stats.days.add(new Date(log.time_in).toDateString());
      return stats;
    },
    { today: 0, week: 0, month: 0, total: 0, days: new Set<string>() },
  );

  return {
    today: Number(totals.today.toFixed(2)),
    week: Number(totals.week.toFixed(2)),
    month: Number(totals.month.toFixed(2)),
    total: Number(totals.total.toFixed(2)),
    daysWorked: totals.days.size,
  };
};

const StudentDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, total: 0, daysWorked: 0 });
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, logsData] = await Promise.all([
        api.getStats(),
        api.getLogs({}),
      ]);
      if (logsData?.logs) setStats(statsFromLogs(logsData.logs));
      else if (statsData) setStats(statsData);
      if (logsData?.logs) setLogs(logsData.logs);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <TimerCard onSessionChange={fetchData} />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Progress Bar */}
      <ProgressBar totalHours={stats.total} />

      {/* Insights + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightsPanel stats={stats} />
        <CalendarView logs={logs} />
      </div>

      {/* Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentEntries logs={logs} onRefresh={fetchData} />
        <div className="hidden lg:block" />
      </div>
    </div>
  );
};

export default StudentDashboard;
