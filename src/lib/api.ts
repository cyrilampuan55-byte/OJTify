import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'user';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  target_hours: number;
}

interface SettingsRow {
  user_id: string;
  excluded_days: string[];
  target_end_date: string | null;
  target_hours: number;
}

interface LogRow {
  id: string;
  user_id: string;
  time_in: string;
  time_out: string | null;
  total_hours: number;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  data_key: string;
  created_at: string;
}

const DEFAULT_SETTINGS = {
  excluded_days: ['Sun'],
  target_end_date: null,
  target_hours: 600,
};

const authRedirectUrl =
  typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

const setCompatToken = (token?: string | null) => {
  if (token) localStorage.setItem('ojt_token', token);
  else localStorage.removeItem('ojt_token');
};

const requireSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.user) throw new Error('Unauthorized');
  setCompatToken(session.access_token);
  return session;
};

const requireProfile = async () => {
  const session = await requireSession();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, target_hours')
    .eq('id', session.user.id)
    .single();
  if (error || !data) throw error ?? new Error('Profile not found');
  return { session, profile: data as ProfileRow };
};

const getSettingsForUser = async (userId: string) => {
  const { data } = await supabase
    .from('settings')
    .select('user_id, excluded_days, target_end_date, target_hours')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    ...DEFAULT_SETTINGS,
    ...(data ?? {}),
  };
};

const computeHours = (timeIn: string, timeOut: string | null) => {
  if (!timeOut) return 0;
  const diffMs = new Date(timeOut).getTime() - new Date(timeIn).getTime();
  return diffMs > 0 ? Number((diffMs / 3_600_000).toFixed(2)) : 0;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date: Date) => {
  const value = startOfDay(date);
  const diff = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - diff);
  return value;
};
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const weekKeyForDate = (date: Date) => {
  const weekStart = startOfWeek(date);
  return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
};

const userStatsFromLogs = (logs: LogRow[]) => {
  const completed = logs.filter((log) => log.time_out);
  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  let total = 0;

  completed.forEach((log) => {
    const stamp = new Date(log.time_in).getTime();
    const hours = computeHours(log.time_in, log.time_out);
    total += hours;
    if (stamp >= dayStart) today += hours;
    if (stamp >= weekStart) week += hours;
    if (stamp >= monthStart) month += hours;
  });

  return {
    today: Number(today.toFixed(2)),
    week: Number(week.toFixed(2)),
    month: Number(month.toFixed(2)),
    total: Number(total.toFixed(2)),
    daysWorked: new Set(completed.map((log) => new Date(log.time_in).toDateString())).size,
  };
};

const getLogsForUser = async (userId: string, limit?: number) => {
  let query = supabase
    .from('logs')
    .select('id, user_id, time_in, time_out, total_hours')
    .eq('user_id', userId)
    .order('time_in', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((log) => ({
    ...log,
    total_hours: computeHours(log.time_in, log.time_out),
  })) as LogRow[];
};

const ensureNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  dataKey: string,
) => {
  const { error } = await supabase
    .from('notifications')
    .upsert(
      {
        user_id: userId,
        type,
        title,
        message,
        data_key: dataKey,
      },
      { onConflict: 'user_id,type,data_key', ignoreDuplicates: true },
    );
  if (error && !String(error.message).includes('duplicate')) throw error;
};

const syncNotificationsForProfile = async (profile: ProfileRow) => {
  if (profile.role !== 'user') return;

  const [settings, logs] = await Promise.all([
    getSettingsForUser(profile.id),
    getLogsForUser(profile.id),
  ]);

  const stats = userStatsFromLogs(logs);
  const targetHours = Math.max(settings.target_hours || profile.target_hours || 600, 1);
  const percent = (stats.total / targetHours) * 100;
  const milestones = [
    { threshold: 75, type: 'progress_75', title: '75% OJT milestone reached' },
    { threshold: 90, type: 'progress_90', title: '90% OJT milestone reached' },
    { threshold: 100, type: 'progress_100', title: 'OJT target completed' },
  ];

  for (const milestone of milestones) {
    if (percent < milestone.threshold) continue;
    const remaining = Math.max(targetHours - stats.total, 0).toFixed(2);
    const message =
      milestone.threshold === 100
        ? `You have completed ${stats.total.toFixed(2)} of ${targetHours} target hours.`
        : `You have completed ${stats.total.toFixed(2)} of ${targetHours} target hours. ${remaining} hours remain.`;
    await ensureNotification(profile.id, milestone.type, milestone.title, message, `${milestone.threshold}-${targetHours}`);
  }

  const activeLog = logs.find((log) => !log.time_out);
  if (activeLog) {
    const openHours = (Date.now() - new Date(activeLog.time_in).getTime()) / 3_600_000;
    if (openHours >= 12) {
      await ensureNotification(
        profile.id,
        'timeout_12h',
        'You may have forgotten to time out',
        `Your current session has been active for ${openHours.toFixed(1)} hours. Please review and time out if needed.`,
        activeLog.id,
      );
    }
  }

  const weekStart = startOfWeek(new Date()).getTime();
  const weekLogs = logs.filter((log) => log.time_out && new Date(log.time_in).getTime() >= weekStart);
  const weekHours = weekLogs.reduce((sum, log) => sum + computeHours(log.time_in, log.time_out), 0);
  await ensureNotification(
    profile.id,
    'weekly_summary',
    'Weekly OJT summary',
    `This week you logged ${weekHours.toFixed(2)} hours across ${weekLogs.length} entr${weekLogs.length === 1 ? 'y' : 'ies'}. Total progress is ${stats.total.toFixed(2)} of ${targetHours} hours.`,
    weekKeyForDate(new Date()),
  );
};

export const api = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setCompatToken(data.session?.access_token);
    const { profile } = await requireProfile();
    const settings = await getSettingsForUser(profile.id);
    await syncNotificationsForProfile(profile);
    return { token: data.session?.access_token, user: profile, settings };
  },

  register: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: authRedirectUrl,
      },
    });
    if (error) return { error: error.message };
    if (!data.session?.access_token || !data.user) {
      return { error: 'Registration created the account, but email confirmation is required before sign in.' };
    }
    setCompatToken(data.session.access_token);
    const { profile } = await requireProfile();
    const settings = await getSettingsForUser(profile.id);
    return { token: data.session.access_token, user: profile, settings };
  },

  logout: async () => {
    await supabase.auth.signOut();
    setCompatToken(null);
    return { success: true };
  },

  verify: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    const { profile } = await requireProfile();
    const settings = await getSettingsForUser(profile.id);
    await syncNotificationsForProfile(profile);
    return { user: profile, settings };
  },

  timeIn: async () => {
    const { profile } = await requireProfile();
    const active = await api.getActiveSession();
    if (active?.session) return { error: 'You already have an active session' };
    const payload = {
      user_id: profile.id,
      time_in: new Date().toISOString(),
      time_out: null,
      total_hours: 0,
    };
    const { data, error } = await supabase.from('logs').insert(payload).select('id, user_id, time_in, time_out, total_hours').single();
    if (error) return { error: error.message };
    await syncNotificationsForProfile(profile);
    return { success: true, log: data };
  },

  timeOut: async () => {
    const { profile } = await requireProfile();
    const active = await api.getActiveSession();
    if (!active?.session) return { error: 'No active session found' };
    const timeOut = new Date().toISOString();
    const totalHours = computeHours(active.session.time_in, timeOut);
    const { data, error } = await supabase
      .from('logs')
      .update({ time_out: timeOut, total_hours: totalHours })
      .eq('id', active.session.id)
      .select('id, user_id, time_in, time_out, total_hours')
      .single();
    if (error) return { error: error.message };
    await syncNotificationsForProfile(profile);
    return { success: true, log: data };
  },

  getActiveSession: async () => {
    const { profile } = await requireProfile();
    const { data, error } = await supabase
      .from('logs')
      .select('id, user_id, time_in, time_out, total_hours')
      .eq('user_id', profile.id)
      .is('time_out', null)
      .order('time_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { session: data };
  },

  activeSession: async () => api.getActiveSession(),

  getLogs: async (params: Record<string, any> = {}) => {
    const { profile } = await requireProfile();
    const targetUserId = profile.role === 'admin' && params.userId ? params.userId : profile.id;
    const logs = await getLogsForUser(targetUserId, params.limit);
    return { logs };
  },

  logs: async (params: Record<string, any> = {}) => api.getLogs(params),

  getStats: async (userId?: string) => {
    const { profile } = await requireProfile();
    const targetUserId = profile.role === 'admin' && userId ? userId : profile.id;
    const logs = await getLogsForUser(targetUserId);
    return userStatsFromLogs(logs);
  },

  stats: async (userId?: string) => api.getStats(userId),

  getSettings: async () => {
    const { profile } = await requireProfile();
    return { settings: await getSettingsForUser(profile.id) };
  },

  getUserSettings: async (userId: string) => {
    const { profile } = await requireProfile();
    const targetUserId = profile.role === 'admin' ? userId : profile.id;
    return { settings: await getSettingsForUser(targetUserId) };
  },

  saveSettings: async (settings: Record<string, any>) => {
    const { profile } = await requireProfile();
    const payload = {
      user_id: profile.id,
      excluded_days: settings.excluded_days ?? DEFAULT_SETTINGS.excluded_days,
      target_end_date: settings.target_end_date ?? null,
      target_hours: settings.target_hours ?? profile.target_hours ?? 600,
    };
    const { data, error } = await supabase
      .from('settings')
      .upsert(payload)
      .select('user_id, excluded_days, target_end_date, target_hours')
      .single();
    if (error) throw error;
    await supabase.from('profiles').update({ target_hours: payload.target_hours }).eq('id', profile.id);
    await syncNotificationsForProfile({ ...profile, target_hours: payload.target_hours });
    return { success: true, settings: data };
  },

  saveUserSettings: async (userId: string, settings: Record<string, any>) => {
    const { profile } = await requireProfile();
    const targetUserId = profile.role === 'admin' ? userId : profile.id;
    const targetProfile =
      profile.role === 'admin' && targetUserId !== profile.id
        ? await supabase
            .from('profiles')
            .select('id, name, email, role, target_hours')
            .eq('id', targetUserId)
            .single()
        : { data: profile, error: null };

    if (targetProfile.error || !targetProfile.data) {
      throw targetProfile.error ?? new Error('Profile not found');
    }

    const payload = {
      user_id: targetUserId,
      excluded_days: settings.excluded_days ?? DEFAULT_SETTINGS.excluded_days,
      target_end_date: settings.target_end_date ?? null,
      target_hours: settings.target_hours ?? targetProfile.data.target_hours ?? 600,
    };

    const { data, error } = await supabase
      .from('settings')
      .upsert(payload)
      .select('user_id, excluded_days, target_end_date, target_hours')
      .single();

    if (error) throw error;

    await supabase.from('profiles').update({ target_hours: payload.target_hours }).eq('id', targetUserId);
    await syncNotificationsForProfile({ ...(targetProfile.data as ProfileRow), target_hours: payload.target_hours });
    return { success: true, settings: data };
  },

  addEntry: async (time_in: string, time_out: string) => {
    const { profile } = await requireProfile();
    if (new Date(time_out).getTime() <= new Date(time_in).getTime()) {
      return { error: 'Time out must be after time in' };
    }
    const payload = {
      user_id: profile.id,
      time_in,
      time_out,
      total_hours: computeHours(time_in, time_out),
    };
    const { data, error } = await supabase.from('logs').insert(payload).select('id, user_id, time_in, time_out, total_hours').single();
    if (error) throw error;
    await syncNotificationsForProfile(profile);
    return { success: true, log: data };
  },

  deleteEntry: async (entryId: string) => {
    const { error } = await supabase.from('logs').delete().eq('id', entryId);
    if (error) throw error;
    return { success: true };
  },

  updateEntry: async (entryId: string, time_in: string, time_out: string | null) => {
    const { profile } = await requireProfile();
    if (time_out && new Date(time_out).getTime() <= new Date(time_in).getTime()) {
      return { error: 'Time out must be after time in' };
    }

    const payload = {
      time_in,
      time_out,
      total_hours: computeHours(time_in, time_out),
    };

    const { data, error } = await supabase
      .from('logs')
      .update(payload)
      .eq('id', entryId)
      .select('id, user_id, time_in, time_out, total_hours')
      .single();

    if (error) return { error: error.message };

    if (profile.role === 'admin' && data?.user_id) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, name, email, role, target_hours')
        .eq('id', data.user_id)
        .maybeSingle();

      if (targetProfile) {
        await syncNotificationsForProfile(targetProfile as ProfileRow);
      }
    } else {
      await syncNotificationsForProfile(profile);
    }

    return { success: true, log: data };
  },

  resetData: async () => {
    const { profile } = await requireProfile();
    await supabase.from('logs').delete().eq('user_id', profile.id);
    await supabase.from('notifications').delete().eq('user_id', profile.id);
    await supabase.from('settings').upsert({ user_id: profile.id, ...DEFAULT_SETTINGS });
    await supabase.from('profiles').update({ target_hours: 600 }).eq('id', profile.id);
    return { success: true };
  },

  getNotifications: async (params: Record<string, any> = {}) => {
    const { profile } = await requireProfile();
    await syncNotificationsForProfile(profile);
    let query = supabase
      .from('notifications')
      .select('id, user_id, type, title, message, read_at, data_key, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (params.limit) query = query.limit(params.limit);
    const { data, error } = await query;
    if (error) throw error;
    return {
      notifications: data ?? [],
      unreadCount: (data ?? []).filter((notification) => !notification.read_at).length,
    };
  },

  markNotificationRead: async (notificationId: string) => {
    const { profile } = await requireProfile();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', profile.id);
    if (error) throw error;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .is('read_at', null);
    return { success: true, unreadCount: count ?? 0 };
  },

  markAllNotificationsRead: async () => {
    const { profile } = await requireProfile();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .is('read_at', null);
    if (error) throw error;
    return { success: true, unreadCount: 0 };
  },

  getAdminUsers: async () => {
    const { profile } = await requireProfile();
    if (profile.role !== 'admin') return { users: [] };
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, target_hours')
      .order('name');
    if (error) throw error;

    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('id, user_id, time_in, time_out, total_hours');
    if (logsError) throw logsError;

    const allLogs = (logs ?? []) as LogRow[];
    const users = (profiles ?? []).map((item) => {
      const userLogs = allLogs.filter((log) => log.user_id === item.id);
      const stats = userStatsFromLogs(userLogs);
      const activeLog = userLogs.find((log) => !log.time_out) ?? null;
      const targetHours = item.target_hours || 600;
      return {
        ...item,
        isActive: Boolean(activeLog),
        activeSessionStart: activeLog?.time_in ?? null,
        totalHours: stats.total,
        progress: Math.round((stats.total / targetHours) * 100),
      };
    });
    return { users };
  },

  adminUsers: async () => api.getAdminUsers(),

  deleteUser: async (userId: string) => {
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('logs').delete().eq('user_id', userId);
    await supabase.from('settings').delete().eq('user_id', userId);
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  },

  adminDelete: async (userId: string) => api.deleteUser(userId),

  exportLogs: async (params: Record<string, any> = {}) => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email');
    if (profilesError) throw profilesError;

    let query = supabase
      .from('logs')
      .select('id, user_id, time_in, time_out, total_hours')
      .order('time_in', { ascending: false });
    if (params.limit) query = query.limit(params.limit);
    const { data: logs, error } = await query;
    if (error) throw error;

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return {
      logs: (logs ?? []).map((log) => ({
        ...log,
        total_hours: computeHours(log.time_in, log.time_out),
        profiles: profileMap.get(log.user_id) ?? null,
      })),
    };
  },

  adminExport: async (params: Record<string, any> = {}) => api.exportLogs(params),

  subscribe: (onMessage: (payload: any) => void) => {
    const channel: RealtimeChannel = supabase
      .channel(`ojtify-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, onMessage)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onMessage)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, onMessage)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
