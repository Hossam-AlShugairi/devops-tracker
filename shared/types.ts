export interface Course {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  phase: number; // 1 = Phase 1, 2 = Phase 2 (CKA, Security+)
  createdAt?: string;
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  completedAt?: string | null; // ISO timestamp
  notes?: string | null;
  orderIndex: number;
}

export interface StudyLog {
  id: string;
  date: string; // YYYY-MM-DD in Africa/Cairo
  hours: number;
  notes?: string | null;
  createdAt?: string;
}

export interface UserSettings {
  planStartDate: string; // YYYY-MM-DD (e.g. 2026-11-06)
  targetDailyHours: number; // default: 2
  showPhase2: boolean; // default: false
  hasPassword?: boolean;
}

export interface TopicWithCourse extends Topic {
  courseName: string;
  courseColor: string;
  coursePhase: number;
}

export interface PlanMetrics {
  totalTopics: number;
  completedTopics: number;
  actualProgressPercent: number; // 0-100
  expectedProgressPercent: number; // 0-100
  diffPercent: number; // actual - expected
  adherencePercent: number; // % of overdue/due-passed topics that were completed
  dueCount: number; // topics with due date <= today
  dueCompletedCount: number; // completed topics among due
  lateCount: number; // overdue and uncompleted
  lateTopics: TopicWithCourse[];
  onTimeCompletionRate: number; // % of completed topics completed on or before due date
  statusMessage: string;
  daysIntoPlan: number;
  isStarted: boolean;
  totalDays: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  completedThisWeek: TopicWithCourse[];
  overdueMissed: TopicWithCourse[];
  nextWeekPlanned: TopicWithCourse[];
  totalHoursStudiedThisWeek: number;
  targetHoursThisWeek: number;
  onTimeRateThisWeek: number;
}

export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD
  count: number; // topics completed
  hours: number; // hours logged
  level: 0 | 1 | 2 | 3 | 4; // intensity level for heatmap
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  totalHours: number;
}
