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

const StudentDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, total: 0, daysWorked: 0 });
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, logsData] = await Promise.all([
        api.getStats(),
        api.getLogs({ limit: 100 }),
      ]);
      if (statsData) setStats(statsData);
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
