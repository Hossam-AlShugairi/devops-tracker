import { createClient, Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import { SEED_COURSES } from '../../shared/seedData';
import bcrypt from 'bcryptjs';

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let client: Client;

if (TURSO_DATABASE_URL) {
  // Use Turso Cloud SQLite database on Vercel
  client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
} else {
  // Use local file SQLite database for local development
  const localDbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'tracker.db');
  const dbDir = path.dirname(localDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  client = createClient({
    url: `file:${localDbPath.replace(/\\/g, '/')}`,
  });
}

export const db = client;

let initialized = false;

export async function initDatabase() {
  if (initialized) return;

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      phase INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      notes TEXT,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Default settings
  const checkSetting = async (key: string, defaultValue: string) => {
    const rs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
    if (rs.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: [key, defaultValue],
      });
    }
  };

  await checkSetting('planStartDate', '2026-11-06');
  await checkSetting('targetDailyHours', '2');
  await checkSetting('showPhase2', '0');

  // Check admin password
  const passRs = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['passwordHash'] });
  if (passRs.rows.length === 0) {
    const defaultPassword = process.env.APP_PASSWORD || 'devops2027';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
      args: ['passwordHash', hash],
    });
  }

  // Seed courses and topics if empty
  const countRs = await db.execute('SELECT COUNT(*) as count FROM courses');
  const count = Number(countRs.rows[0]?.count || 0);
  if (count === 0) {
    await seedDatabase();
  }

  initialized = true;
}

export async function seedDatabase() {
  const nowIso = new Date().toISOString();

  for (let ci = 0; ci < SEED_COURSES.length; ci++) {
    const course = SEED_COURSES[ci];
    const courseId = `course-${ci + 1}`;
    await db.execute({
      sql: 'INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [courseId, course.name, course.color, ci, course.phase, nowIso],
    });

    for (let ti = 0; ti < course.topics.length; ti++) {
      const topic = course.topics[ti];
      const topicId = `${ci}-${ti}`;
      await db.execute({
        sql: 'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, 0, NULL, NULL, ?)',
        args: [topicId, courseId, topic.title, topic.dueDate, ti],
      });
    }
  }
}
