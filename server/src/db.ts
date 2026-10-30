import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SEED_COURSES } from '../../shared/seedData';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'tracker.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
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
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  if (!getSetting.get('planStartDate')) {
    setSetting.run('planStartDate', '2026-11-06');
  }
  if (!getSetting.get('targetDailyHours')) {
    setSetting.run('targetDailyHours', '2');
  }
  if (!getSetting.get('showPhase2')) {
    setSetting.run('showPhase2', '0');
  }

  // Check if admin password is set; default password from env or 'devops2027'
  if (!getSetting.get('passwordHash')) {
    const defaultPassword = process.env.APP_PASSWORD || 'devops2027';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    setSetting.run('passwordHash', hash);
  }

  // Seed courses and topics if courses table is empty
  const courseCountRow = db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: number };
  if (courseCountRow.count === 0) {
    seedDatabase();
  }
}

export function seedDatabase() {
  const insertCourse = db.prepare(
    'INSERT INTO courses (id, name, color, order_index, phase, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertTopic = db.prepare(
    'INSERT INTO topics (id, course_id, title, due_date, completed, completed_at, notes, order_index) VALUES (?, ?, ?, ?, 0, NULL, NULL, ?)'
  );

  const nowIso = new Date().toISOString();

  SEED_COURSES.forEach((course, courseIndex) => {
    const courseId = `course-${courseIndex + 1}`;
    insertCourse.run(courseId, course.name, course.color, courseIndex, course.phase, nowIso);

    course.topics.forEach((topic, topicIndex) => {
      const topicId = `${courseIndex}-${topicIndex}`;
      insertTopic.run(topicId, courseId, topic.title, topic.dueDate, topicIndex);
    });
  });
}
