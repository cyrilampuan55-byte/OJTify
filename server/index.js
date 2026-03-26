import cors from 'cors';
import Database from 'better-sqlite3';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'ojtify.db');
const distDir = path.join(rootDir, 'dist');
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_TARGET_HOURS = 600;

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    target_hours REAL NOT NULL DEFAULT 600
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    excluded_days TEXT NOT NULL DEFAULT '["Sun"]',
    target_end_date TEXT,
    target_hours REAL NOT NULL DEFAULT 600,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    time_in TEXT NOT NULL,
    time_out TEXT,
    total_hours REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read_at TEXT,
    data_key TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique
  ON notifications(user_id, type, data_key);

  CREATE INDEX IF NOT EXISTS idx_logs_user_time_in ON logs(user_id, time_in DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
`);

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const nowIso = () => new Date().toISOString();
const parseExcludedDays = (value) => {
  try {
    return JSON.parse(value || '["Sun"]');
  } catch {
    return ['Sun'];
  }
};
const computeHours = (timeIn, timeOut) => {
  if (!timeOut) return 0;
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  let breakOverlapMs = 0;
  const breakStartOnStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
  const breakEndOnStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 13, 0, 0, 0);
  // If the student timed-in during the lunch break window, treat that window as working time.
  const skipLunchOnStartDay = start.getTime() >= breakStartOnStartDay.getTime() && start.getTime() < breakEndOnStartDay.getTime();

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor.getTime() <= lastDay.getTime()) {
    if (
      skipLunchOnStartDay &&
      cursor.getFullYear() === start.getFullYear() &&
      cursor.getMonth() === start.getMonth() &&
      cursor.getDate() === start.getDate()
    ) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const breakStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12, 0, 0, 0);
    const breakEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 13, 0, 0, 0);
    const overlapStart = Math.max(start.getTime(), breakStart.getTime());
    const overlapEnd = Math.min(end.getTime(), breakEnd.getTime());

    if (overlapEnd > overlapStart) {
      breakOverlapMs += overlapEnd - overlapStart;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const workedMs = Math.max(diffMs - breakOverlapMs, 0);
  return Number((workedMs / 3_600_000).toFixed(2));
};
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfWeek = (date) => {
  const value = startOfDay(date);
  const diff = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - diff);
  return value;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const weekKeyForDate = (date) => {
  const weekStart = startOfWeek(date);
  return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  target_hours: user.target_hours,
});

const getUserByEmail = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getSessionByToken = db.prepare('SELECT * FROM sessions WHERE token = ?');
const deleteSessionsForUser = db.prepare('DELETE FROM sessions WHERE user_id = ?');
const insertSession = db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)');
const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, target_hours) VALUES (?, ?, ?, ?, ?, ?)');
const insertSettings = db.prepare('INSERT INTO settings (user_id, excluded_days, target_end_date, target_hours) VALUES (?, ?, ?, ?)');
const updateSettingsStmt = db.prepare('UPDATE settings SET excluded_days = ?, target_end_date = ?, target_hours = ? WHERE user_id = ?');
const updateUserTargetHours = db.prepare('UPDATE users SET target_hours = ? WHERE id = ?');
const insertLog = db.prepare('INSERT INTO logs (id, user_id, time_in, time_out, total_hours) VALUES (?, ?, ?, ?, ?)');
const getActiveLogStmt = db.prepare('SELECT * FROM logs WHERE user_id = ? AND time_out IS NULL ORDER BY time_in DESC LIMIT 1');
const updateLogTimeout = db.prepare('UPDATE logs SET time_out = ?, total_hours = ? WHERE id = ?');
const getLogsForUserStmt = db.prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY time_in DESC');
const deleteOwnLogStmt = db.prepare('DELETE FROM logs WHERE id = ? AND user_id = ?');
const deleteAnyLogStmt = db.prepare('DELETE FROM logs WHERE id = ?');
const deleteLogsForUserStmt = db.prepare('DELETE FROM logs WHERE user_id = ?');
const deleteNotificationsForUserStmt = db.prepare('DELETE FROM notifications WHERE user_id = ?');
const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
const deleteSettingsStmt = db.prepare('DELETE FROM settings WHERE user_id = ?');
const getAllUsersStmt = db.prepare('SELECT * FROM users ORDER BY role DESC, name ASC');
const getAllLogsStmt = db.prepare('SELECT * FROM logs ORDER BY time_in DESC');
const getNotificationByIdStmt = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?');
const markNotificationReadStmt = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?');
const markAllNotificationsReadStmt = db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL');
const getNotificationsStmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');
const insertNotificationStmt = db.prepare(`
  INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, created_at, read_at, data_key)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const seedDefaults = () => {
  const count = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  if (count > 0) return;

  const seed = db.transaction(() => {
    const adminId = createId();
    const studentId = createId();
    insertUser.run(adminId, 'Administrator', 'admin@ojtify.com', 'admin123', 'admin', DEFAULT_TARGET_HOURS);
    insertUser.run(studentId, 'Tron Student', 'tron@ojtify.com', 'demo123', 'user', DEFAULT_TARGET_HOURS);
    insertSettings.run(adminId, JSON.stringify(['Sun']), null, DEFAULT_TARGET_HOURS);
    insertSettings.run(studentId, JSON.stringify(['Sun']), null, DEFAULT_TARGET_HOURS);
  });

  seed();
};

seedDefaults();

const getSettingsForUser = (userId) => {
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
  const user = getUserById.get(userId);
  return {
    excluded_days: parseExcludedDays(row?.excluded_days),
    target_end_date: row?.target_end_date ?? null,
    target_hours: row?.target_hours ?? user?.target_hours ?? DEFAULT_TARGET_HOURS,
  };
};

const saveSettingsForUser = db.transaction((userId, settings) => {
  const payload = JSON.stringify(settings.excluded_days || ['Sun']);
  if (db.prepare('SELECT 1 FROM settings WHERE user_id = ?').get(userId)) {
    updateSettingsStmt.run(payload, settings.target_end_date ?? null, settings.target_hours, userId);
  } else {
    insertSettings.run(userId, payload, settings.target_end_date ?? null, settings.target_hours);
  }
  updateUserTargetHours.run(settings.target_hours, userId);
});

const getUserLogs = (userId) =>
  getLogsForUserStmt.get ? [] : [];

const userLogs = (userId) =>
  db
    .prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY time_in DESC')
    .all(userId)
    .map((log) => ({ ...log, total_hours: computeHours(log.time_in, log.time_out) }));

const activeLogForUser = (userId) => getActiveLogStmt.get(userId) ?? null;

const statsForUser = (userId) => {
  const logs = userLogs(userId).filter((log) => log.time_out);
  const now = new Date();
  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  let total = 0;

  logs.forEach((log) => {
    const stamp = new Date(log.time_in).getTime();
    total += log.total_hours;
    if (stamp >= dayStart) today += log.total_hours;
    if (stamp >= weekStart) week += log.total_hours;
    if (stamp >= monthStart) month += log.total_hours;
  });

  return {
    today: Number(today.toFixed(2)),
    week: Number(week.toFixed(2)),
    month: Number(month.toFixed(2)),
    total: Number(total.toFixed(2)),
    daysWorked: new Set(logs.map((log) => new Date(log.time_in).toDateString())).size,
  };
};

const getNotificationsForUser = (userId) => getNotificationsStmt.all(userId);
const unreadCountForUser = (userId) => getNotificationsForUser(userId).filter((item) => !item.read_at).length;

const pushNotification = (userId, type, title, message, dataKey) => {
  const info = insertNotificationStmt.run(createId(), userId, type, title, message, nowIso(), null, dataKey);
  return info.changes > 0;
};

const syncNotificationsForUser = (user) => {
  if (!user || user.role !== 'user') return false;

  let changed = false;
  const settings = getSettingsForUser(user.id);
  const stats = statsForUser(user.id);
  const targetHours = Math.max(settings.target_hours || user.target_hours || DEFAULT_TARGET_HOURS, 1);
  const percent = (stats.total / targetHours) * 100;

  const progressRules = [
    { threshold: 75, type: 'progress_75', title: '75% OJT milestone reached' },
    { threshold: 90, type: 'progress_90', title: '90% OJT milestone reached' },
    { threshold: 100, type: 'progress_100', title: 'OJT target completed' },
  ];

  progressRules.forEach((rule) => {
    if (percent < rule.threshold) return;
    const remaining = Math.max(targetHours - stats.total, 0).toFixed(2);
    const message =
      rule.threshold === 100
        ? `You have completed ${stats.total.toFixed(2)} of ${targetHours} target hours.`
        : `You have completed ${stats.total.toFixed(2)} of ${targetHours} target hours. ${remaining} hours remain.`;
    changed = pushNotification(user.id, rule.type, rule.title, message, `${rule.threshold}-${targetHours}`) || changed;
  });

  const activeLog = activeLogForUser(user.id);
  if (activeLog) {
    const openHours = (Date.now() - new Date(activeLog.time_in).getTime()) / 3_600_000;
    if (openHours >= 12) {
      changed =
        pushNotification(
          user.id,
          'timeout_12h',
          'You may have forgotten to time out',
          `Your current session has been active for ${openHours.toFixed(1)} hours. Please review and time out if needed.`,
          activeLog.id,
        ) || changed;
    }
  }

  const now = new Date();
  const weekStart = startOfWeek(now).getTime();
  const weekLogs = userLogs(user.id).filter((log) => log.time_out && new Date(log.time_in).getTime() >= weekStart);
  const weekHours = weekLogs.reduce((sum, log) => sum + log.total_hours, 0);
  changed =
    pushNotification(
      user.id,
      'weekly_summary',
      'Weekly OJT summary',
      `This week you logged ${weekHours.toFixed(2)} hours across ${weekLogs.length} entr${weekLogs.length === 1 ? 'y' : 'ies'}. Total progress is ${stats.total.toFixed(2)} of ${targetHours} hours.`,
      weekKeyForDate(now),
    ) || changed;

  return changed;
};

const syncNotificationsForAllStudents = () => {
  let changed = false;
  getAllUsersStmt.all().forEach((user) => {
    changed = syncNotificationsForUser(user) || changed;
  });
  return changed;
};

const eventClients = new Set();
const sendEvent = (type, payload = {}) => {
  const data = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const client of eventClients) {
    client.write(data);
  }
};

const writeMutation = (handler, eventType = 'refresh') => {
  const result = handler();
  syncNotificationsForAllStudents();
  sendEvent(eventType);
  return result;
};

const app = express();
app.use(cors());
app.use(express.json());
if (isProduction && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const session = getSessionByToken.get(token);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const user = getUserById.get(session.user_id);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  eventClients.add(res);
  req.on('close', () => eventClients.delete(res));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = getUserByEmail.get(email || '');
  if (!user || user.password !== password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const token = createId();
  writeMutation(() => {
    deleteSessionsForUser.run(user.id);
    insertSession.run(token, user.id, nowIso());
    return null;
  }, 'auth');

  return res.json({
    token,
    user: sanitizeUser(user),
    settings: getSettingsForUser(user.id),
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body ?? {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (getUserByEmail.get(normalizedEmail)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const user = {
    id: createId(),
    name: String(name || normalizedEmail.split('@')[0]).trim(),
    email: normalizedEmail,
    password: String(password),
    role: 'user',
    target_hours: DEFAULT_TARGET_HOURS,
  };
  const token = createId();

  writeMutation(() => {
    insertUser.run(user.id, user.name, user.email, user.password, user.role, user.target_hours);
    insertSettings.run(user.id, JSON.stringify(['Sun']), null, DEFAULT_TARGET_HOURS);
    insertSession.run(token, user.id, nowIso());
    return null;
  }, 'auth');

  return res.json({
    token,
    user: sanitizeUser(user),
    settings: getSettingsForUser(user.id),
  });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  syncNotificationsForUser(req.user);
  return res.json({
    user: sanitizeUser(req.user),
    settings: getSettingsForUser(req.user.id),
  });
});

app.post('/api/time/in', requireAuth, (req, res) => {
  const active = activeLogForUser(req.user.id);
  if (active) return res.status(400).json({ error: 'You already have an active session' });

  const log = {
    id: createId(),
    user_id: req.user.id,
    time_in: nowIso(),
    time_out: null,
    total_hours: 0,
  };

  writeMutation(() => insertLog.run(log.id, log.user_id, log.time_in, null, 0), 'time');
  return res.json({ success: true, log });
});

app.post('/api/time/out', requireAuth, (req, res) => {
  const active = activeLogForUser(req.user.id);
  if (!active) return res.status(400).json({ error: 'No active session found' });

  const timeOut = nowIso();
  const totalHours = computeHours(active.time_in, timeOut);
  writeMutation(() => updateLogTimeout.run(timeOut, totalHours, active.id), 'time');
  return res.json({
    success: true,
    log: { ...active, time_out: timeOut, total_hours: totalHours },
  });
});

app.get('/api/time/active-session', requireAuth, (req, res) => {
  syncNotificationsForUser(req.user);
  return res.json({ session: activeLogForUser(req.user.id) });
});

app.get('/api/logs', requireAuth, (req, res) => {
  const requestedUserId = req.query.userId;
  const limit = Number(req.query.limit || 0);
  const targetUserId = req.user.role === 'admin' && requestedUserId ? requestedUserId : req.user.id;
  let logs = userLogs(targetUserId);
  if (limit > 0) logs = logs.slice(0, limit);
  return res.json({ logs });
});

app.get('/api/stats', requireAuth, (req, res) => {
  const requestedUserId = req.query.userId;
  const targetUserId = req.user.role === 'admin' && requestedUserId ? requestedUserId : req.user.id;
  return res.json(statsForUser(targetUserId));
});

app.get('/api/settings', requireAuth, (req, res) => {
  return res.json({ settings: getSettingsForUser(req.user.id) });
});

app.put('/api/settings', requireAuth, (req, res) => {
  const current = getSettingsForUser(req.user.id);
  const merged = {
    excluded_days: Array.isArray(req.body?.excluded_days) ? req.body.excluded_days : current.excluded_days,
    target_end_date: req.body?.target_end_date ?? current.target_end_date,
    target_hours: Number(req.body?.target_hours ?? current.target_hours),
  };
  writeMutation(() => saveSettingsForUser(req.user.id, merged), 'settings');
  return res.json({ success: true, settings: merged });
});

app.post('/api/entries', requireAuth, (req, res) => {
  const { time_in, time_out } = req.body ?? {};
  if (!time_in || !time_out || new Date(time_out).getTime() <= new Date(time_in).getTime()) {
    return res.status(400).json({ error: 'Time out must be after time in' });
  }

  const log = {
    id: createId(),
    user_id: req.user.id,
    time_in,
    time_out,
    total_hours: computeHours(time_in, time_out),
  };

  writeMutation(() => insertLog.run(log.id, log.user_id, log.time_in, log.time_out, log.total_hours), 'logs');
  return res.json({ success: true, log });
});

app.delete('/api/entries/:id', requireAuth, (req, res) => {
  const changes =
    req.user.role === 'admin'
      ? deleteAnyLogStmt.run(req.params.id).changes
      : deleteOwnLogStmt.run(req.params.id, req.user.id).changes;
  writeMutation(() => null, 'logs');
  return res.json({ success: changes > 0 });
});

app.post('/api/reset-data', requireAuth, (req, res) => {
  writeMutation(() => {
    deleteLogsForUserStmt.run(req.user.id);
    deleteNotificationsForUserStmt.run(req.user.id);
    saveSettingsForUser(req.user.id, {
      excluded_days: ['Sun'],
      target_end_date: null,
      target_hours: DEFAULT_TARGET_HOURS,
    });
  }, 'reset');
  return res.json({ success: true });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  syncNotificationsForUser(req.user);
  let notifications = getNotificationsForUser(req.user.id);
  const limit = Number(req.query.limit || 0);
  if (limit > 0) notifications = notifications.slice(0, limit);
  return res.json({
    notifications,
    unreadCount: unreadCountForUser(req.user.id),
  });
});

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  const notification = getNotificationByIdStmt.get(req.params.id, req.user.id);
  if (notification && !notification.read_at) {
    markNotificationReadStmt.run(nowIso(), req.params.id, req.user.id);
    sendEvent('notifications');
  }
  return res.json({ success: true, unreadCount: unreadCountForUser(req.user.id) });
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  markAllNotificationsReadStmt.run(nowIso(), req.user.id);
  sendEvent('notifications');
  return res.json({ success: true, unreadCount: 0 });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  syncNotificationsForAllStudents();
  const users = getAllUsersStmt.all().map((user) => {
    const stats = statsForUser(user.id);
    const active = activeLogForUser(user.id);
    const targetHours = user.target_hours || DEFAULT_TARGET_HOURS;
    return {
      ...sanitizeUser(user),
      isActive: Boolean(active),
      activeSessionStart: active?.time_in ?? null,
      totalHours: stats.total,
      progress: Math.round((stats.total / targetHours) * 100),
    };
  });
  return res.json({ users });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const targetId = req.params.id;
  writeMutation(() => {
    deleteLogsForUserStmt.run(targetId);
    deleteNotificationsForUserStmt.run(targetId);
    deleteSessionsForUser.run(targetId);
    deleteSettingsStmt.run(targetId);
    deleteUserStmt.run(targetId);
  }, 'admin');
  return res.json({ success: true });
});

app.get('/api/admin/export', requireAuth, requireAdmin, (req, res) => {
  const limit = Number(req.query.limit || 0);
  let logs = getAllLogsStmt.all().map((log) => {
    const profile = getUserById.get(log.user_id);
    return {
      ...log,
      total_hours: computeHours(log.time_in, log.time_out),
      profiles: profile ? { name: profile.name, email: profile.email } : null,
    };
  });
  if (limit > 0) logs = logs.slice(0, limit);
  return res.json({ logs });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

if (isProduction && fs.existsSync(distDir)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  syncNotificationsForAllStudents();
  console.log(`OJTify server listening on http://${HOST}:${PORT}`);
  console.log(`Database path: ${dbPath}`);
});
