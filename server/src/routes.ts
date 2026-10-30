import { Router, Request, Response } from 'express';
import { db } from './db';
import { authMiddleware, signToken } from './auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  getCairoTodayString,
  calculatePlanMetrics,
  calculateStreak,
  rescheduleIncompleteTopics,
} from '../../shared/calculations';
import { Course, TopicWithCourse, StudyLog, UserSettings, WeeklyReportData, DailyActivityPoint } from '../../shared/types';
import crypto from 'node:crypto';

export const apiRouter = Router();

// ==========================================
// Authentication Routes
// ==========================================

const loginSchema = z.object({
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { password } = result.data;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('passwordHash') as { value: string } | undefined;

  if (!row || !bcrypt.compareSync(password, row.value)) {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    return;
  }

  const token = signToken();
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.json({ authenticated: false });
    return;
  }
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'devops-tracker-secret-jwt-key-2027';
    require('jsonwebtoken').verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

// Protect all subsequent routes
apiRouter.use(authMiddleware);

// ==========================================
// Settings Routes
// ==========================================

apiRouter.get('/settings', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settingsMap: Record<string, string> = {};
  for (const r of rows) {
    settingsMap[r.key] = r.value;
  }

  const response: UserSettings = {
    planStartDate: settingsMap['planStartDate'] || '2026-11-06',
    targetDailyHours: parseFloat(settingsMap['targetDailyHours'] || '2'),
    showPhase2: settingsMap['showPhase2'] === '1',
    hasPassword: !!settingsMap['passwordHash'],
  };

  res.json(response);
});

const updateSettingsSchema = z.object({
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ البداية غير صالح').optional(),
  targetDailyHours: z.number().positive('الهدف اليومي يجب أن يكون رقم إيجابي').optional(),
  showPhase2: z.boolean().optional(),
});

apiRouter.patch('/settings', (req: Request, res: Response): void => {
  const result = updateSettingsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { planStartDate, targetDailyHours, showPhase2 } = result.data;
  const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  if (planStartDate !== undefined) {
    updateSetting.run('planStartDate', planStartDate);
  }
  if (targetDailyHours !== undefined) {
    updateSetting.run('targetDailyHours', targetDailyHours.toString());
  }
  if (showPhase2 !== undefined) {
    updateSetting.run('showPhase2', showPhase2 ? '1' : '0');
  }

  res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(4, 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل'),
});

apiRouter.post('/settings/change-password', (req: Request, res: Response): void => {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { currentPassword, newPassword } = result.data;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('passwordHash') as { value: string } | undefined;

  if (!row || !bcrypt.compareSync(currentPassword, row.value)) {
    res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('passwordHash', hash);

  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

// ==========================================
// Courses Routes
// ==========================================

apiRouter.get('/courses', (_req: Request, res: Response) => {
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  let query = 'SELECT * FROM courses ORDER BY phase ASC, order_index ASC';
  if (!showPhase2) {
    query = 'SELECT * FROM courses WHERE phase = 1 ORDER BY order_index ASC';
  }

  const rows = db.prepare(query).all() as Array<{
    id: string;
    name: string;
    color: string;
    order_index: number;
    phase: number;
    created_at: string;
  }>;

  const courses: Course[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    orderIndex: r.order_index,
    phase: r.phase,
    createdAt: r.created_at,
  }));

  res.json(courses);
});

const courseSchema = z.object({
  name: z.string().min(1, 'اسم الكورس مطلوب'),
  color: z.string().min(1, 'اللون مطلوب'),
  phase: z.number().int().min(1).max(2).default(1),
});

apiRouter.post('/courses', (req: Request, res: Response): void => {
  const result = courseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, color, phase } = result.data;
  const id = `course-${crypto.randomUUID().slice(0, 8)}`;
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM courses WHERE phase = ?').get(phase) as { cnt: number };
  const orderIndex = countRow.cnt;
  const createdAt = new Date().toISOString();

  db.prepare('INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    name,
    color,
    orderIndex,
    phase,
    createdAt
  );

  res.status(201).json({ id, name, color, orderIndex, phase, createdAt });
});

apiRouter.patch('/courses/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const updateCourseSchema = courseSchema.partial();
  const result = updateCourseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, color, phase } = result.data;
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'الكورس غير موجود' });
    return;
  }

  if (name !== undefined) {
    db.prepare('UPDATE courses SET name = ? WHERE id = ?').run(name, id);
  }
  if (color !== undefined) {
    db.prepare('UPDATE courses SET color = ? WHERE id = ?').run(color, id);
  }
  if (phase !== undefined) {
    db.prepare('UPDATE courses SET phase = ? WHERE id = ?').run(phase, id);
  }

  res.json({ success: true, message: 'تم تحديث الكورس' });
});

apiRouter.delete('/courses/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  res.json({ success: true, message: 'تم حذف الكورس وجميع مواضيعه' });
});

// ==========================================
// Topics Routes
// ==========================================

function getAllTopicsWithCourse(showPhase2: boolean): TopicWithCourse[] {
  let query = `
    SELECT t.id, t.course_id, t.title, t.due_date, t.completed, t.completed_at, t.notes, t.order_index,
           c.name as course_name, c.color as course_color, c.phase as course_phase
    FROM topics t
    JOIN courses c ON t.course_id = c.id
  `;
  if (!showPhase2) {
    query += ' WHERE c.phase = 1';
  }
  query += ' ORDER BY t.due_date ASC, t.order_index ASC';

  const rows = db.prepare(query).all() as Array<{
    id: string;
    course_id: string;
    title: string;
    due_date: string;
    completed: number;
    completed_at: string | null;
    notes: string | null;
    order_index: number;
    course_name: string;
    course_color: string;
    course_phase: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    courseId: r.course_id,
    title: r.title,
    dueDate: r.due_date,
    completed: r.completed === 1,
    completedAt: r.completed_at,
    notes: r.notes,
    orderIndex: r.order_index,
    courseName: r.course_name,
    courseColor: r.course_color,
    coursePhase: r.course_phase,
  }));
}

apiRouter.get('/topics', (_req: Request, res: Response) => {
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  const topics = getAllTopicsWithCourse(showPhase2);
  res.json(topics);
});

const topicCreateSchema = z.object({
  courseId: z.string().min(1, 'الكورس مطلوب'),
  title: z.string().min(1, 'عنوان الموضوع مطلوب'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الاستحقاق غير صالح (YYYY-MM-DD)'),
  notes: z.string().optional().nullable(),
});

apiRouter.post('/topics', (req: Request, res: Response): void => {
  const result = topicCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { courseId, title, dueDate, notes } = result.data;
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    res.status(404).json({ error: 'الكورس غير موجود' });
    return;
  }

  const id = `topic-${crypto.randomUUID().slice(0, 8)}`;
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM topics WHERE course_id = ?').get(courseId) as { cnt: number };
  const orderIndex = countRow.cnt;

  db.prepare(
    'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, 0, NULL, ?, ?)'
  ).run(id, courseId, title, dueDate, notes || null, orderIndex);

  res.status(201).json({ success: true, id, message: 'تم إضافة الموضوع بنجاح' });
});

apiRouter.patch('/topics/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const topicUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    completed: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    courseId: z.string().optional(),
    orderIndex: z.number().optional(),
  });

  const result = topicUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as {
    completed: number;
    completed_at: string | null;
  } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'الموضوع غير موجود' });
    return;
  }

  const { title, dueDate, completed, notes, courseId, orderIndex } = result.data;

  if (title !== undefined) {
    db.prepare('UPDATE topics SET title = ? WHERE id = ?').run(title, id);
  }
  if (dueDate !== undefined) {
    db.prepare('UPDATE topics SET due_date = ? WHERE id = ?').run(dueDate, id);
  }
  if (notes !== undefined) {
    db.prepare('UPDATE topics SET notes = ? WHERE id = ?').run(notes, id);
  }
  if (courseId !== undefined) {
    db.prepare('UPDATE topics SET course_id = ? WHERE id = ?').run(courseId, id);
  }
  if (orderIndex !== undefined) {
    db.prepare('UPDATE topics SET order_index = ? WHERE id = ?').run(orderIndex, id);
  }
  if (completed !== undefined) {
    const isCompleted = completed ? 1 : 0;
    const completedAt = completed ? new Date().toISOString() : null;
    db.prepare('UPDATE topics SET completed = ?, completed_at = ? WHERE id = ?').run(isCompleted, completedAt, id);
  }

  res.json({ success: true, message: 'تم تحديث الموضوع بنجاح' });
});

apiRouter.delete('/topics/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  res.json({ success: true, message: 'تم حذف الموضوع بنجاح' });
});

// ==========================================
// Reschedule Incomplete Topics
// ==========================================

const rescheduleSchema = z.object({
  days: z.number().int().min(1, 'يجب تحديد يوم واحد على الأقل').max(365, 'الحد الأقصى للتأجيل سنة'),
});

apiRouter.post('/topics/reschedule', (req: Request, res: Response): void => {
  const result = rescheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { days } = result.data;
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  const topics = getAllTopicsWithCourse(showPhase2);
  const shifted = rescheduleIncompleteTopics(topics, days);

  const updateStmt = db.prepare('UPDATE topics SET due_date = ? WHERE id = ?');
  for (const item of shifted) {
    updateStmt.run(item.newDueDate, item.id);
  }

  res.json({
    success: true,
    shiftedCount: shifted.length,
    message: `تم ترحيل مواعيد ${shifted.length} موضوع متبقي بمقدار ${days} يوم بنجاح.`,
  });
});

// ==========================================
// Dashboard Metrics Route
// ==========================================

apiRouter.get('/dashboard/metrics', (_req: Request, res: Response) => {
  const todayStr = getCairoTodayString();
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  const startDateRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('planStartDate') as { value: string } | undefined;
  const planStartDate = startDateRow?.value || '2026-11-06';

  const topics = getAllTopicsWithCourse(showPhase2);
  const metrics = calculatePlanMetrics(topics, planStartDate, todayStr);

  res.json({
    metrics,
    todayStr,
    planStartDate,
  });
});

// ==========================================
// Study Log Routes
// ==========================================

apiRouter.get('/logs', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM study_logs ORDER BY date DESC, created_at DESC').all() as Array<{
    id: string;
    date: string;
    hours: number;
    notes: string | null;
    created_at: string;
  }>;

  const logs: StudyLog[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    hours: r.hours,
    notes: r.notes,
    createdAt: r.created_at,
  }));

  const todayStr = getCairoTodayString();
  const streak = calculateStreak(logs, todayStr);

  res.json({
    logs,
    streak,
    todayStr,
  });
});

const studyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صالح'),
  hours: z.number().min(0.1, 'أقل وقت تسجيل ربع ساعة تقريباً').max(24, 'الحد الأقصى 24 ساعة'),
  notes: z.string().optional().nullable(),
});

apiRouter.post('/logs', (req: Request, res: Response): void => {
  const result = studyLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { date, hours, notes } = result.data;
  const id = `log-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  // If already logged for this date, add or update
  db.prepare('INSERT INTO study_logs (id, date, hours, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    date,
    hours,
    notes || null,
    createdAt
  );

  res.status(201).json({ success: true, id, message: 'تم تسجيل جلسة المذاكرة بنجاح' });
});

apiRouter.delete('/logs/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  db.prepare('DELETE FROM study_logs WHERE id = ?').run(id);
  res.json({ success: true, message: 'تم حذف السجل بنجاح' });
});

// ==========================================
// Weekly Report & Heatmap Routes
// ==========================================

apiRouter.get('/reports/weekly', (_req: Request, res: Response) => {
  const todayStr = getCairoTodayString();
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  const targetHoursRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('targetDailyHours') as { value: string } | undefined;
  const dailyTarget = parseFloat(targetHoursRow?.value || '2');

  const todayDate = new Date(`${todayStr}T00:00:00Z`);
  const dayOfWeek = todayDate.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

  // Calculate Saturday as start of week (standard for Middle East / Egypt)
  // Saturday offset: if Saturday (6), offset 0. If Sunday (0), offset 1 day back.
  const satDiff = (dayOfWeek + 1) % 7;
  const satDate = new Date(todayDate.getTime() - satDiff * 86_400_000);
  const friDate = new Date(satDate.getTime() + 6 * 86_400_000);
  const nextSatDate = new Date(friDate.getTime() + 86_400_000);
  const nextFriDate = new Date(nextSatDate.getTime() + 6 * 86_400_000);

  const weekStart = satDate.toISOString().slice(0, 10);
  const weekEnd = friDate.toISOString().slice(0, 10);
  const nextWeekStart = nextSatDate.toISOString().slice(0, 10);
  const nextWeekEnd = nextFriDate.toISOString().slice(0, 10);

  const allTopics = getAllTopicsWithCourse(showPhase2);

  // Topics completed this week (by completedAt or fallback dueDate)
  const completedThisWeek = allTopics.filter((t) => {
    if (!t.completed) return false;
    const compDate = (t.completedAt || t.dueDate).slice(0, 10);
    return compDate >= weekStart && compDate <= weekEnd;
  });

  // Topics due on or before this week that remain incomplete (overdue)
  const overdueMissed = allTopics.filter((t) => {
    return !t.completed && t.dueDate <= weekEnd;
  });

  // Topics planned for next week
  const nextWeekPlanned = allTopics.filter((t) => {
    return !t.completed && t.dueDate >= nextWeekStart && t.dueDate <= nextWeekEnd;
  });

  // Hours studied this week
  const studyRows = db.prepare('SELECT hours FROM study_logs WHERE date >= ? AND date <= ?').all(weekStart, weekEnd) as {
    hours: number;
  }[];
  const totalHoursStudiedThisWeek = Math.round(studyRows.reduce((acc, curr) => acc + curr.hours, 0) * 10) / 10;
  const targetHoursThisWeek = dailyTarget * 7;

  // On-time rate for this week
  let onTimeWeek = 0;
  for (const t of completedThisWeek) {
    const compDate = (t.completedAt || t.dueDate).slice(0, 10);
    if (compDate <= t.dueDate) onTimeWeek++;
  }
  const onTimeRateThisWeek =
    completedThisWeek.length > 0 ? Math.round((onTimeWeek / completedThisWeek.length) * 100) : 100;

  const report: WeeklyReportData = {
    weekStart,
    weekEnd,
    completedThisWeek,
    overdueMissed,
    nextWeekPlanned,
    totalHoursStudiedThisWeek,
    targetHoursThisWeek,
    onTimeRateThisWeek,
  };

  res.json(report);
});

apiRouter.get('/reports/heatmap', (_req: Request, res: Response) => {
  const showPhase2Row = db.prepare('SELECT value FROM settings WHERE key = ?').get('showPhase2') as { value: string } | undefined;
  const showPhase2 = showPhase2Row?.value === '1';

  const topics = getAllTopicsWithCourse(showPhase2);
  const studyRows = db.prepare('SELECT date, hours FROM study_logs').all() as { date: string; hours: number }[];

  const activityMap = new Map<string, { count: number; hours: number }>();

  // Count completed topics by date
  for (const t of topics) {
    if (t.completed && t.completedAt) {
      const d = t.completedAt.slice(0, 10);
      const prev = activityMap.get(d) || { count: 0, hours: 0 };
      activityMap.set(d, { ...prev, count: prev.count + 1 });
    }
  }

  // Add study hours
  for (const s of studyRows) {
    const prev = activityMap.get(s.date) || { count: 0, hours: 0 };
    activityMap.set(s.date, { ...prev, hours: prev.hours + s.hours });
  }

  const result: DailyActivityPoint[] = [];
  activityMap.forEach((val, date) => {
    // Determine level 0-4
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    const score = val.count * 2 + val.hours;
    if (score > 6) level = 4;
    else if (score >= 4) level = 3;
    else if (score >= 2) level = 2;
    else if (score > 0) level = 1;

    result.push({
      date,
      count: val.count,
      hours: Math.round(val.hours * 10) / 10,
      level,
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  res.json(result);
});

// ==========================================
// Export / Import & Reset Routes
// ==========================================

apiRouter.get('/backup/export', (_req: Request, res: Response) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  const topics = db.prepare('SELECT * FROM topics').all();
  const studyLogs = db.prepare('SELECT * FROM study_logs').all();
  const settings = db.prepare('SELECT * FROM settings').all();

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    courses,
    topics,
    studyLogs,
    settings,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=devops-tracker-backup-${getCairoTodayString()}.json`);
  res.send(JSON.stringify(exportData, null, 2));
});

apiRouter.post('/backup/import', (req: Request, res: Response): void => {
  const data = req.body;
  if (!data || !Array.isArray(data.courses) || !Array.isArray(data.topics)) {
    res.status(400).json({ error: 'ملف الاستيراد غير صالح أو مفقود به بيانات الكورسات والمواضيع.' });
    return;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // Clear existing
    db.exec('DELETE FROM topics;');
    db.exec('DELETE FROM courses;');
    db.exec('DELETE FROM study_logs;');

    const insertCourse = db.prepare(
      'INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const c of data.courses) {
      insertCourse.run(c.id, c.name, c.color, c.order_index ?? 0, c.phase ?? 1, c.created_at || new Date().toISOString());
    }

    const insertTopic = db.prepare(
      'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of data.topics) {
      insertTopic.run(
        t.id,
        t.course_id,
        t.title,
        t.due_date,
        t.completed ? 1 : 0,
        t.completed_at || null,
        t.notes || null,
        t.order_index ?? 0
      );
    }

    if (Array.isArray(data.studyLogs)) {
      const insertLog = db.prepare(
        'INSERT INTO study_logs (id, date, hours, notes, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const l of data.studyLogs) {
        insertLog.run(l.id, l.date, l.hours, l.notes || null, l.created_at || new Date().toISOString());
      }
    }

    if (Array.isArray(data.settings)) {
      const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      for (const s of data.settings) {
        // do not overwrite passwordHash unless specified
        if (s.key !== 'passwordHash') {
          insertSetting.run(s.key, s.value);
        }
      }
    }

    db.exec('COMMIT;');
    res.json({ success: true, message: 'تم استيراد البيانات بنجاح.' });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'فشل استيراد البيانات: ' + err.message });
  }
});

const resetSchema = z.object({
  confirmPhrase: z.string(),
});

apiRouter.post('/reset', (req: Request, res: Response): void => {
  const result = resetSchema.safeParse(req.body);
  if (!result.success || result.data.confirmPhrase !== 'إعادة ضبط') {
    res.status(400).json({ error: 'يرجى كتابة "إعادة ضبط" للتأكيد.' });
    return;
  }

  // Clear completed flags and study logs
  db.exec(`
    UPDATE topics SET completed = 0, completed_at = NULL;
    DELETE FROM study_logs;
  `);

  res.json({ success: true, message: 'تمت إعادة ضبط جميع علامات الإنجاز وسجل المذاكرة بنجاح.' });
});
