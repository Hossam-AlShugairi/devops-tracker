import { describe, it, expect } from 'vitest';
import {
  calculatePercent,
  calculateDaysDiff,
  calculatePlanMetrics,
  calculateStreak,
  rescheduleIncompleteTopics,
  getCairoTodayString,
} from '../shared/calculations';
import { TopicWithCourse, StudyLog } from '../shared/types';

describe('Tracker Calculations and Pure Logic', () => {
  it('calculates percentages safely', () => {
    expect(calculatePercent(5, 10)).toBe(50);
    expect(calculatePercent(1, 3)).toBe(33);
    expect(calculatePercent(0, 0)).toBe(0);
    expect(calculatePercent(5, 0)).toBe(0);
  });

  it('calculates days difference correctly', () => {
    expect(calculateDaysDiff('2026-11-10', '2026-11-06')).toBe(4);
    expect(calculateDaysDiff('2026-11-06', '2026-11-10')).toBe(-4);
    expect(calculateDaysDiff('2026-11-06', '2026-11-06')).toBe(0);
  });

  it('calculates plan metrics with expected progress, adherence, and late topics', () => {
    const mockTopics: TopicWithCourse[] = [
      {
        id: '1',
        courseId: 'c1',
        title: 'Topic 1',
        dueDate: '2026-11-10',
        completed: true,
        completedAt: '2026-11-09T10:00:00Z',
        notes: null,
        orderIndex: 0,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
      {
        id: '2',
        courseId: 'c1',
        title: 'Topic 2',
        dueDate: '2026-11-12',
        completed: false,
        completedAt: null,
        notes: null,
        orderIndex: 1,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
      {
        id: '3',
        courseId: 'c1',
        title: 'Topic 3',
        dueDate: '2026-11-20',
        completed: false,
        completedAt: null,
        notes: null,
        orderIndex: 2,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
      {
        id: '4',
        courseId: 'c1',
        title: 'Topic 4',
        dueDate: '2026-11-25',
        completed: false,
        completedAt: null,
        notes: null,
        orderIndex: 3,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
    ];

    // Reference today: 2026-11-15 (Topic 1 & 2 are due, Topic 3 & 4 are future)
    const metrics = calculatePlanMetrics(mockTopics, '2026-11-06', '2026-11-15');

    expect(metrics.totalTopics).toBe(4);
    expect(metrics.completedTopics).toBe(1);
    expect(metrics.actualProgressPercent).toBe(25); // 1 out of 4 = 25%
    expect(metrics.dueCount).toBe(2); // topic 1 & 2
    expect(metrics.expectedProgressPercent).toBe(50); // 2 out of 4 = 50%
    expect(metrics.diffPercent).toBe(-25); // 25 - 50 = -25%
    expect(metrics.adherencePercent).toBe(50); // 1 out of 2 due topics completed = 50%
    expect(metrics.lateCount).toBe(1); // Topic 2 is overdue
    expect(metrics.lateTopics[0].id).toBe('2');
    expect(metrics.onTimeCompletionRate).toBe(100); // 1 completed topic was completed on 2026-11-09 <= 2026-11-10
    expect(metrics.isStarted).toBe(true);
    expect(metrics.daysIntoPlan).toBe(10); // Nov 15 - Nov 6 + 1 = 10
  });

  it('reschedules remaining incomplete topics by N days without touching completed ones', () => {
    const mockTopics: TopicWithCourse[] = [
      {
        id: 'done-1',
        courseId: 'c1',
        title: 'Completed Item',
        dueDate: '2026-11-10',
        completed: true,
        completedAt: '2026-11-08T00:00:00Z',
        orderIndex: 0,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
      {
        id: 'todo-1',
        courseId: 'c1',
        title: 'Pending Item 1',
        dueDate: '2026-11-12',
        completed: false,
        completedAt: null,
        orderIndex: 1,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
      {
        id: 'todo-2',
        courseId: 'c1',
        title: 'Pending Item 2',
        dueDate: '2026-11-20',
        completed: false,
        completedAt: null,
        orderIndex: 2,
        courseName: 'Git',
        courseColor: '#f97316',
        coursePhase: 1,
      },
    ];

    const shifted = rescheduleIncompleteTopics(mockTopics, 7);
    expect(shifted.length).toBe(2);
    expect(shifted.find((s) => s.id === 'done-1')).toBeUndefined();
    expect(shifted.find((s) => s.id === 'todo-1')?.newDueDate).toBe('2026-11-19');
    expect(shifted.find((s) => s.id === 'todo-2')?.newDueDate).toBe('2026-11-27');
  });

  it('calculates study streaks and hours accurately', () => {
    const logs: StudyLog[] = [
      { id: '1', date: '2026-10-28', hours: 2, createdAt: '2026-10-28T10:00:00Z' },
      { id: '2', date: '2026-10-29', hours: 2.5, createdAt: '2026-10-29T10:00:00Z' },
      { id: '3', date: '2026-10-30', hours: 1.5, createdAt: '2026-10-30T10:00:00Z' },
    ];

    const streak = calculateStreak(logs, '2026-10-30');
    expect(streak.currentStreak).toBe(3);
    expect(streak.longestStreak).toBe(3);
    expect(streak.activeToday).toBe(true);
    expect(streak.totalHours).toBe(6);
  });
});
