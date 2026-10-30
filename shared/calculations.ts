import { PlanMetrics, TopicWithCourse, StreakInfo, StudyLog } from './types';

/**
 * Calculates current date string in Africa/Cairo timezone (YYYY-MM-DD).
 */
export function getCairoTodayString(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

/**
 * Calculates days difference between target date and reference date in days.
 * Positive if targetDate is in the future, negative if in the past.
 */
export function calculateDaysDiff(targetDateStr: string, todayStr: string): number {
  const target = new Date(`${targetDateStr}T00:00:00Z`).getTime();
  const today = new Date(`${todayStr}T00:00:00Z`).getTime();
  const msInDay = 86_400_000;
  return Math.round((target - today) / msInDay);
}

/**
 * Safely computes rounded percentage.
 */
export function calculatePercent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Pure calculation for core tracker metrics matching prototype formulas.
 */
export function calculatePlanMetrics(
  topics: TopicWithCourse[],
  planStartDate: string,
  todayStr: string,
  targetFinishDate: string = '2027-04-30'
): PlanMetrics {
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;

  // Topics due on or before today
  const dueTopics = topics.filter((t) => t.dueDate <= todayStr);
  const dueCount = dueTopics.length;
  const dueCompletedCount = dueTopics.filter((t) => t.completed).length;

  // Late topics: due on or before today, and NOT completed
  const lateTopics = dueTopics.filter((t) => !t.completed);
  const lateCount = lateTopics.length;

  const actualProgressPercent = calculatePercent(completedTopics, totalTopics);
  const expectedProgressPercent = calculatePercent(dueCount, totalTopics);
  const diffPercent = actualProgressPercent - expectedProgressPercent;

  // Adherence: % of topics whose due date has passed that are actually completed
  // If no topics are due yet, adherence is 100%
  const adherencePercent = dueCount > 0 ? calculatePercent(dueCompletedCount, dueCount) : 100;

  // On-time completion rate: completed topics where completedAt date <= dueDate
  let onTimeCount = 0;
  const completedList = topics.filter((t) => t.completed);
  for (const t of completedList) {
    if (!t.completedAt) {
      // If completed but no timestamp, count as on-time if currently not late
      onTimeCount++;
      continue;
    }
    const completedDate = t.completedAt.slice(0, 10);
    if (completedDate <= t.dueDate) {
      onTimeCount++;
    }
  }
  const onTimeCompletionRate =
    completedList.length > 0 ? calculatePercent(onTimeCount, completedList.length) : 100;

  // Plan timeframe calculations
  const isStarted = todayStr >= planStartDate;
  const daysDiff = calculateDaysDiff(todayStr, planStartDate);
  const daysIntoPlan = isStarted ? Math.max(1, daysDiff + 1) : 0;
  const totalDays = Math.max(1, calculateDaysDiff(targetFinishDate, planStartDate));

  let statusMessage = '';
  if (!isStarted) {
    statusMessage = 'لسه ما بدأتش';
  } else if (diffPercent >= 0) {
    statusMessage = 'ماشي بالجدول أو قدامه 👏';
  } else {
    statusMessage = `ورا الجدول بـ ${Math.abs(diffPercent)}%`;
  }

  return {
    totalTopics,
    completedTopics,
    actualProgressPercent,
    expectedProgressPercent,
    diffPercent,
    adherencePercent,
    dueCount,
    dueCompletedCount,
    lateCount,
    lateTopics,
    onTimeCompletionRate,
    statusMessage,
    daysIntoPlan,
    isStarted,
    totalDays,
  };
}

/**
 * Pure calculation to reschedule incomplete topics forward by N days.
 */
export function rescheduleIncompleteTopics(
  topics: TopicWithCourse[],
  shiftDays: number
): { id: string; newDueDate: string }[] {
  if (shiftDays === 0) return [];

  const msInDay = 86_400_000;
  return topics
    .filter((t) => !t.completed)
    .map((t) => {
      const current = new Date(`${t.dueDate}T00:00:00Z`).getTime();
      const updated = new Date(current + shiftDays * msInDay);
      const newDueDate = updated.toISOString().slice(0, 10);
      return {
        id: t.id,
        newDueDate,
      };
    });
}

/**
 * Pure calculation for study streaks and summary.
 */
export function calculateStreak(studyLogs: StudyLog[], todayStr: string): StreakInfo {
  if (!studyLogs || studyLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeToday: false, totalHours: 0 };
  }

  const logsByDate = new Map<string, number>();
  let totalHours = 0;
  for (const log of studyLogs) {
    const prev = logsByDate.get(log.date) || 0;
    logsByDate.set(log.date, prev + log.hours);
    totalHours += log.hours;
  }

  const activeToday = (logsByDate.get(todayStr) || 0) > 0;

  // Find consecutive days ending either today or yesterday
  let checkDate = new Date(`${todayStr}T00:00:00Z`);
  if (!activeToday) {
    // Check if streak was active yesterday
    checkDate = new Date(checkDate.getTime() - 86_400_000);
  }

  let currentStreak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if ((logsByDate.get(dateStr) || 0) > 0) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 86_400_000);
    } else {
      break;
    }
  }

  // Calculate longest streak across history
  const sortedUniqueDates = Array.from(logsByDate.keys())
    .filter((d) => (logsByDate.get(d) || 0) > 0)
    .sort();

  let longestStreak = 0;
  let tempStreak = 0;
  let prevTime: number | null = null;
  const msInDay = 86_400_000;

  for (const d of sortedUniqueDates) {
    const time = new Date(`${d}T00:00:00Z`).getTime();
    if (prevTime === null) {
      tempStreak = 1;
    } else if (Math.round((time - prevTime) / msInDay) === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevTime = time;
  }

  return {
    currentStreak,
    longestStreak,
    activeToday,
    totalHours: Math.round(totalHours * 10) / 10,
  };
}
