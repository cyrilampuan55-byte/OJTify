import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Play, Square, Loader2 } from 'lucide-react';

interface TimerCardProps {
  onSessionChange: () => void;
}

const TimerCard: React.FC<TimerCardProps> = ({ onSessionChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWorking, setIsWorking] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (!isWorking || !sessionStart) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isWorking, sessionStart]);

  // Check for active session on mount
  useEffect(() => {
    api.getActiveSession().then((data) => {
      if (data?.session) {
        const start = new Date(data.session.time_in);
        setSessionStart(start);
        setIsWorking(true);
        setElapsed(Math.floor((Date.now() - start.getTime()) / 1000));
      }
    }).catch(console.error).finally(() => setInitialLoading(false));
  }, []);

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return { time: `${h12.toString().padStart(2, '0')}:${m}:${s}`, ampm };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatStartTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleTimeIn = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.timeIn();
      if (data?.success || data?.log) {
        const start = new Date(data.log.time_in);
        setSessionStart(start);
        setIsWorking(true);
        setElapsed(0);
        onSessionChange();
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (err: any) {
      console.error('Time in failed:', err);
    } finally {
      setLoading(false);
    }
  }, [onSessionChange]);

  const handleTimeOut = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.timeOut();
      if (data?.success || data?.log) {
        setIsWorking(false);
        setSessionStart(null);
        setElapsed(0);
        onSessionChange();
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (err: any) {
      console.error('Time out failed:', err);
    } finally {
      setLoading(false);
    }
  }, [onSessionChange]);

  const { time, ampm } = formatTime(currentTime);

  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-slate-700/40 rounded-2xl p-6 md:p-10 text-center">
      {/* Digital Clock */}
      <div className="mb-2">
        <span className="text-5xl md:text-7xl font-mono font-light text-white tracking-wider">
          {time}
        </span>
        <span className="text-2xl md:text-3xl font-mono text-slate-400 ml-3">{ampm}</span>
      </div>

      {/* Date */}
      <p className="text-slate-400 text-sm md:text-base mb-6 font-medium">
        {formatDate(currentTime)}
      </p>

      {/* Status */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
        <span className={`text-sm font-medium ${isWorking ? 'text-emerald-400' : 'text-slate-500'}`}>
          {initialLoading ? 'Loading...' : isWorking ? 'Currently Working' : 'Not Working'}
        </span>
      </div>

      {/* Timer */}
      {isWorking && (
        <>
          <div className="text-4xl md:text-6xl font-mono text-emerald-400 mb-2 tracking-wider">
            {formatElapsed(elapsed)}
          </div>
          {sessionStart && (
            <p className="text-slate-500 text-sm mb-4">
              Started at {formatStartTime(sessionStart)}
            </p>
          )}
        </>
      )}

      {/* Time In/Out Button */}
      <div className="mt-4">
        {isWorking ? (
          <button
            onClick={handleTimeOut}
            disabled={loading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-rose-400 hover:to-pink-400 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
            Time Out
          </button>
        ) : (
          <button
            onClick={handleTimeIn}
            disabled={loading || initialLoading}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Time In
          </button>
        )}
      </div>
    </div>
  );
};

export default TimerCard;
