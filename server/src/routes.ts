import { Router, Request, Response } from 'express';
import { db, initDatabase } from './db';
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

// Middleware to ensure DB is initialized
apiRouter.use(async (_req, _res, next) => {
  try {
    await initDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Authentication Routes
// ==========================================

const loginSchema = z.object({
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

apiRouter.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { password } = result.data;
  const rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['passwordHash'] });
  const row = rs.rows[0];

  if (!row || !bcrypt.compareSync(password, String(row.value))) {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    return;
  }

  const token = signToken();
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
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

apiRouter.get('/settings', async (_req: Request, res: Response) => {
  const rs = await db.execute('SELECT key, value FROM settings');
  const settingsMap: Record<string, string> = {};
  for (const r of rs.rows) {
    settingsMap[String(r.key)] = String(r.value);
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

apiRouter.patch('/settings', async (req: Request, res: Response): Promise<void> => {
  const result = updateSettingsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { planStartDate, targetDailyHours, showPhase2 } = result.data;

  if (planStartDate !== undefined) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      args: ['planStartDate', planStartDate],
    });
  }
  if (targetDailyHours !== undefined) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      args: ['targetDailyHours', targetDailyHours.toString()],
    });
  }
  if (showPhase2 !== undefined) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      args: ['showPhase2', showPhase2 ? '1' : '0'],
    });
  }

  res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(4, 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل'),
});

apiRouter.post('/settings/change-password', async (req: Request, res: Response): Promise<void> => {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { currentPassword, newPassword } = result.data;
  const rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['passwordHash'] });
  const row = rs.rows[0];

  if (!row || !bcrypt.compareSync(currentPassword, String(row.value))) {
    res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  await db.execute({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    args: ['passwordHash', hash],
  });

  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

// ==========================================
// Courses Routes
// ==========================================

apiRouter.get('/courses', async (_req: Request, res: Response) => {
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  let sql = 'SELECT * FROM courses ORDER BY phase ASC, order_index ASC';
  if (!showPhase2) {
    sql = 'SELECT * FROM courses WHERE phase = 1 ORDER BY order_index ASC';
  }

  const rs = await db.execute(sql);
  const courses: Course[] = rs.rows.map((r: any) => ({
    id: String(r.id),
    name: String(r.name),
    color: String(r.color),
    orderIndex: Number(r.order_index),
    phase: Number(r.phase),
    createdAt: String(r.created_at),
  }));

  res.json(courses);
});

const courseSchema = z.object({
  name: z.string().min(1, 'اسم الكورس مطلوب'),
  color: z.string().min(1, 'اللون مطلوب'),
  phase: z.number().int().min(1).max(2).default(1),
});

apiRouter.post('/courses', async (req: Request, res: Response): Promise<void> => {
  const result = courseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, color, phase } = result.data;
  const id = `course-${crypto.randomUUID().slice(0, 8)}`;
  const countRs = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM courses WHERE phase = ?', args: [phase] });
  const orderIndex = Number(countRs.rows[0]?.cnt || 0);
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: 'INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, name, color, orderIndex, phase, createdAt],
  });

  res.status(201).json({ id, name, color, orderIndex, phase, createdAt });
});

apiRouter.patch('/courses/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = courseSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { name, color, phase } = result.data;
  if (name !== undefined) {
    await db.execute({ sql: 'UPDATE courses SET name = ? WHERE id = ?', args: [name, id] });
  }
  if (color !== undefined) {
    await db.execute({ sql: 'UPDATE courses SET color = ? WHERE id = ?', args: [color, id] });
  }
  if (phase !== undefined) {
    await db.execute({ sql: 'UPDATE courses SET phase = ? WHERE id = ?', args: [phase, id] });
  }

  res.json({ success: true, message: 'تم تحديث الكورس' });
});

apiRouter.delete('/courses/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await db.execute({ sql: 'DELETE FROM topics WHERE course_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM courses WHERE id = ?', args: [id] });
  res.json({ success: true, message: 'تم حذف الكورس وجميع مواضيعه' });
});

// ==========================================
// Topics Routes
// ==========================================

async function getAllTopicsWithCourse(showPhase2: boolean): Promise<TopicWithCourse[]> {
  let sql = `
    SELECT t.id, t.course_id, t.title, t.due_date, t.completed, t.completed_at, t.notes, t.order_index,
           c.name as course_name, c.color as course_color, c.phase as course_phase
    FROM topics t
    JOIN courses c ON t.course_id = c.id
  `;
  if (!showPhase2) {
    sql += ' WHERE c.phase = 1';
  }
  sql += ' ORDER BY t.due_date ASC, t.order_index ASC';

  const rs = await db.execute(sql);
  return rs.rows.map((r: any) => ({
    id: String(r.id),
    courseId: String(r.course_id),
    title: String(r.title),
    dueDate: String(r.due_date),
    completed: Number(r.completed) === 1,
    completedAt: r.completed_at ? String(r.completed_at) : null,
    notes: r.notes ? String(r.notes) : null,
    orderIndex: Number(r.order_index),
    courseName: String(r.course_name),
    courseColor: String(r.course_color),
    coursePhase: Number(r.course_phase),
  }));
}

apiRouter.get('/topics', async (_req: Request, res: Response) => {
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  const topics = await getAllTopicsWithCourse(showPhase2);
  res.json(topics);
});

const topicCreateSchema = z.object({
  courseId: z.string().min(1, 'الكورس مطلوب'),
  title: z.string().min(1, 'عنوان الموضوع مطلوب'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الاستحقاق غير صالح (YYYY-MM-DD)'),
  notes: z.string().optional().nullable(),
});

apiRouter.post('/topics', async (req: Request, res: Response): Promise<void> => {
  const result = topicCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { courseId, title, dueDate, notes } = result.data;
  const courseRs = await db.execute({ sql: 'SELECT id FROM courses WHERE id = ?', args: [courseId] });
  if (courseRs.rows.length === 0) {
    res.status(404).json({ error: 'الكورس غير موجود' });
    return;
  }

  const id = `topic-${crypto.randomUUID().slice(0, 8)}`;
  const countRs = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM topics WHERE course_id = ?', args: [courseId] });
  const orderIndex = Number(countRs.rows[0]?.cnt || 0);

  await db.execute({
    sql: 'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, 0, NULL, ?, ?)',
    args: [id, courseId, title, dueDate, notes || null, orderIndex],
  });

  res.status(201).json({ success: true, id, message: 'تم إضافة الموضوع بنجاح' });
});

apiRouter.patch('/topics/:id', async (req: Request, res: Response): Promise<void> => {
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

  const { title, dueDate, completed, notes, courseId, orderIndex } = result.data;

  if (title !== undefined) {
    await db.execute({ sql: 'UPDATE topics SET title = ? WHERE id = ?', args: [title, id] });
  }
  if (dueDate !== undefined) {
    await db.execute({ sql: 'UPDATE topics SET due_date = ? WHERE id = ?', args: [dueDate, id] });
  }
  if (notes !== undefined) {
    await db.execute({ sql: 'UPDATE topics SET notes = ? WHERE id = ?', args: [notes, id] });
  }
  if (courseId !== undefined) {
    await db.execute({ sql: 'UPDATE topics SET course_id = ? WHERE id = ?', args: [courseId, id] });
  }
  if (orderIndex !== undefined) {
    await db.execute({ sql: 'UPDATE topics SET order_index = ? WHERE id = ?', args: [orderIndex, id] });
  }
  if (completed !== undefined) {
    const isCompleted = completed ? 1 : 0;
    const completedAt = completed ? new Date().toISOString() : null;
    await db.execute({
      sql: 'UPDATE topics SET completed = ?, completed_at = ? WHERE id = ?',
      args: [isCompleted, completedAt, id],
    });
  }

  res.json({ success: true, message: 'تم تحديث الموضوع بنجاح' });
});

apiRouter.delete('/topics/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await db.execute({ sql: 'DELETE FROM topics WHERE id = ?', args: [id] });
  res.json({ success: true, message: 'تم حذف الموضوع بنجاح' });
});

// ==========================================
// Reschedule Incomplete Topics
// ==========================================

const rescheduleSchema = z.object({
  days: z.number().int().min(1, 'يجب تحديد يوم واحد على الأقل').max(365, 'الحد الأقصى للتأجيل سنة'),
});

apiRouter.post('/topics/reschedule', async (req: Request, res: Response): Promise<void> => {
  const result = rescheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { days } = result.data;
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  const topics = await getAllTopicsWithCourse(showPhase2);
  const shifted = rescheduleIncompleteTopics(topics, days);

  for (const item of shifted) {
    await db.execute({
      sql: 'UPDATE topics SET due_date = ? WHERE id = ?',
      args: [item.newDueDate, item.id],
    });
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

apiRouter.get('/dashboard/metrics', async (_req: Request, res: Response) => {
  const todayStr = getCairoTodayString();
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  const startDateRs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['planStartDate'] });
  const planStartDate = String(startDateRs.rows[0]?.value || '2026-11-06');

  const topics = await getAllTopicsWithCourse(showPhase2);
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

apiRouter.get('/logs', async (_req: Request, res: Response) => {
  const rs = await db.execute('SELECT * FROM study_logs ORDER BY date DESC, created_at DESC');
  const logs: StudyLog[] = rs.rows.map((r: any) => ({
    id: String(r.id),
    date: String(r.date),
    hours: Number(r.hours),
    notes: r.notes ? String(r.notes) : null,
    createdAt: String(r.created_at),
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

apiRouter.post('/logs', async (req: Request, res: Response): Promise<void> => {
  const result = studyLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }

  const { date, hours, notes } = result.data;
  const id = `log-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: 'INSERT INTO study_logs (id, date, hours, notes, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, date, hours, notes || null, createdAt],
  });

  res.status(201).json({ success: true, id, message: 'تم تسجيل جلسة المذاكرة بنجاح' });
});

apiRouter.delete('/logs/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await db.execute({ sql: 'DELETE FROM study_logs WHERE id = ?', args: [id] });
  res.json({ success: true, message: 'تم حذف السجل بنجاح' });
});

// ==========================================
// Weekly Report & Heatmap Routes
// ==========================================

apiRouter.get('/reports/weekly', async (_req: Request, res: Response) => {
  const todayStr = getCairoTodayString();
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  const targetHoursRs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['targetDailyHours'] });
  const dailyTarget = parseFloat(String(targetHoursRs.rows[0]?.value || '2'));

  const todayDate = new Date(`${todayStr}T00:00:00Z`);
  const dayOfWeek = todayDate.getUTCDay();

  const satDiff = (dayOfWeek + 1) % 7;
  const satDate = new Date(todayDate.getTime() - satDiff * 86_400_000);
  const friDate = new Date(satDate.getTime() + 6 * 86_400_000);
  const nextSatDate = new Date(friDate.getTime() + 86_400_000);
  const nextFriDate = new Date(nextSatDate.getTime() + 6 * 86_400_000);

  const weekStart = satDate.toISOString().slice(0, 10);
  const weekEnd = friDate.toISOString().slice(0, 10);
  const nextWeekStart = nextSatDate.toISOString().slice(0, 10);
  const nextWeekEnd = nextFriDate.toISOString().slice(0, 10);

  const allTopics = await getAllTopicsWithCourse(showPhase2);

  const completedThisWeek = allTopics.filter((t) => {
    if (!t.completed) return false;
    const compDate = (t.completedAt || t.dueDate).slice(0, 10);
    return compDate >= weekStart && compDate <= weekEnd;
  });

  const overdueMissed = allTopics.filter((t) => {
    return !t.completed && t.dueDate <= weekEnd;
  });

  const nextWeekPlanned = allTopics.filter((t) => {
    return !t.completed && t.dueDate >= nextWeekStart && t.dueDate <= nextWeekEnd;
  });

  const studyRs = await db.execute({
    sql: 'SELECT hours FROM study_logs WHERE date >= ? AND date <= ?',
    args: [weekStart, weekEnd],
  });
  const totalHoursStudiedThisWeek =
    Math.round(studyRs.rows.reduce((acc: number, curr: any) => acc + Number(curr.hours), 0) * 10) / 10;
  const targetHoursThisWeek = dailyTarget * 7;

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

apiRouter.get('/reports/heatmap', async (_req: Request, res: Response) => {
  const showPhase2Rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['showPhase2'] });
  const showPhase2 = showPhase2Rs.rows[0]?.value === '1';

  const topics = await getAllTopicsWithCourse(showPhase2);
  const studyRs = await db.execute('SELECT date, hours FROM study_logs');

  const activityMap = new Map<string, { count: number; hours: number }>();

  for (const t of topics) {
    if (t.completed && t.completedAt) {
      const d = t.completedAt.slice(0, 10);
      const prev = activityMap.get(d) || { count: 0, hours: 0 };
      activityMap.set(d, { ...prev, count: prev.count + 1 });
    }
  }

  for (const s of studyRs.rows) {
    const d = String(s.date);
    const hrs = Number(s.hours);
    const prev = activityMap.get(d) || { count: 0, hours: 0 };
    activityMap.set(d, { ...prev, hours: prev.hours + hrs });
  }

  const result: DailyActivityPoint[] = [];
  activityMap.forEach((val, date) => {
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

apiRouter.get('/backup/export', async (_req: Request, res: Response) => {
  const coursesRs = await db.execute('SELECT * FROM courses');
  const topicsRs = await db.execute('SELECT * FROM topics');
  const studyLogsRs = await db.execute('SELECT * FROM study_logs');
  const settingsRs = await db.execute('SELECT * FROM settings');

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    courses: coursesRs.rows,
    topics: topicsRs.rows,
    studyLogs: studyLogsRs.rows,
    settings: settingsRs.rows,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=devops-tracker-backup-${getCairoTodayString()}.json`);
  res.send(JSON.stringify(exportData, null, 2));
});

apiRouter.post('/backup/import', async (req: Request, res: Response): Promise<void> => {
  const data = req.body;
  if (!data || !Array.isArray(data.courses) || !Array.isArray(data.topics)) {
    res.status(400).json({ error: 'ملف الاستيراد غير صالح أو مفقود به بيانات الكورسات والمواضيع.' });
    return;
  }

  try {
    await db.executeMultiple(`
      DELETE FROM topics;
      DELETE FROM courses;
      DELETE FROM study_logs;
    `);

    for (const c of data.courses) {
      await db.execute({
        sql: 'INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [c.id, c.name, c.color, c.order_index ?? 0, c.phase ?? 1, c.created_at || new Date().toISOString()],
      });
    }

    for (const t of data.topics) {
      await db.execute({
        sql: 'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          t.id,
          t.course_id,
          t.title,
          t.due_date,
          t.completed ? 1 : 0,
          t.completed_at || null,
          t.notes || null,
          t.order_index ?? 0,
        ],
      });
    }

    if (Array.isArray(data.studyLogs)) {
      for (const l of data.studyLogs) {
        await db.execute({
          sql: 'INSERT INTO study_logs (id, date, hours, notes, created_at) VALUES (?, ?, ?, ?, ?)',
          args: [l.id, l.date, l.hours, l.notes || null, l.created_at || new Date().toISOString()],
        });
      }
    }

    if (Array.isArray(data.settings)) {
      for (const s of data.settings) {
        if (s.key !== 'passwordHash') {
          await db.execute({
            sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            args: [s.key, s.value],
          });
        }
      }
    }

    res.json({ success: true, message: 'تم استيراد البيانات بنجاح.' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل استيراد البيانات: ' + err.message });
  }
});

const resetSchema = z.object({
  confirmPhrase: z.string(),
});

apiRouter.post('/reset', async (req: Request, res: Response): Promise<void> => {
  const result = resetSchema.safeParse(req.body);
  if (!result.success || result.data.confirmPhrase !== 'إعادة ضبط') {
    res.status(400).json({ error: 'يرجى كتابة "إعادة ضبط" للتأكيد.' });
    return;
  }

  await db.executeMultiple(`
    UPDATE topics SET completed = 0, completed_at = NULL;
    DELETE FROM study_logs;
  `);

  res.json({ success: true, message: 'تمت إعادة ضبط جميع علامات الإنجاز وسجل المذاكرة بنجاح.' });
});
