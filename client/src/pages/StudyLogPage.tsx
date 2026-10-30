import React, { useState } from 'react';
import { StudyLog, StreakInfo } from '../../../shared/types';
import { formatArabicDate, formatArabicFullDate } from '../utils/api';
import { getCairoTodayString } from '../../../shared/calculations';
import { Plus, Trash2, Flame, Award, Clock, Calendar } from 'lucide-react';

interface StudyLogPageProps {
  logs: StudyLog[];
  streak: StreakInfo | null;
  targetDailyHours: number;
  onCreateLog: (data: { date: string; hours: number; notes?: string }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
}

export const StudyLogPage: React.FC<StudyLogPageProps> = ({
  logs,
  streak,
  targetDailyHours,
  onCreateLog,
  onDeleteLog,
}) => {
  const todayStr = getCairoTodayString();
  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hours <= 0) return;
    setIsSubmitting(true);
    try {
      await onCreateLog({
        date,
        hours: Number(hours),
        notes: notes || undefined,
      });
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group logs by last 7 days for weekly chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date(`${todayStr}T00:00:00Z`).getTime() - (6 - i) * 86_400_000);
    const dStr = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter((l) => l.date === dStr);
    const total = dayLogs.reduce((acc, curr) => acc + curr.hours, 0);
    return {
      dateStr: dStr,
      label: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
      total,
      metTarget: total >= targetDailyHours,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#181c2e] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>⏱️ سجل المذاكرة اليومي</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            سجّل ساعات مذاكرتك اليومية وتحدّى نفسك في الالتزام بهدفك ({targetDailyHours} ساعة / يوم)
          </p>
        </div>

        {streak && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              <div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  الستريك الحالي
                </div>
                <div className="text-sm font-extrabold">{streak.currentStreak} يوم</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  أطول ستريك
                </div>
                <div className="text-sm font-extrabold">{streak.longestStreak} يوم</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Progress Bar Chart */}
      <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            مستوى مذاكرة آخر 7 أيام
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            الهدف: {targetDailyHours} س / يوم
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-32 pt-6">
          {last7Days.map((day) => {
            const maxScale = Math.max(targetDailyHours * 1.5, 4);
            const heightPercent = Math.min(100, Math.round((day.total / maxScale) * 100));

            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  {day.total > 0 ? `${day.total}س` : '-'}
                </span>
                <div className="w-full max-w-[36px] bg-gray-100 dark:bg-gray-800 rounded-t-lg h-20 flex items-end overflow-hidden">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full transition-all duration-500 rounded-t-lg ${
                      day.metTarget
                        ? 'bg-emerald-500'
                        : day.total > 0
                        ? 'bg-amber-400'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Form + Log Entries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-1 bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm h-fit">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>تسجيل جلسة جديدة</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التاريخ:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ساعات المذاكرة:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  required
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500">ساعة</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ما تم إنجازه أو ملاحظات سريعة:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: خلصت إعداد شبكة الـ VPC وحليت 3 أسئلة معمارية..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الجلسة'}
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="md:col-span-2 bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              سجل الجلسات السابقة
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              إجمالي الساعات: {streak?.totalHours || 0} ساعة
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pe-1">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                لسه ما سجلتش أي جلسات مذاكرة. ابدأ النهاردة!
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatArabicDate(log.date)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                        {log.hours} ساعة
                      </span>
                      {log.hours >= targetDailyHours && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                          ✓ حقق الهدف
                        </span>
                      )}
                    </div>
                    {log.notes && (
                      <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">
                        {log.notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('متأكد إنك عاوز تحذف جلسة المذاكرة دي؟')) {
                        onDeleteLog(log.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600 transition"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
