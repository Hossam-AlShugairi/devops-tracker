import React, { useState } from 'react';
import { PlanMetrics, Course, TopicWithCourse, DailyActivityPoint } from '../../../shared/types';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { formatArabicDate } from '../utils/api';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Calendar, CheckSquare, FastForward } from 'lucide-react';

interface DashboardPageProps {
  metrics: PlanMetrics | null;
  courses: Course[];
  topics: TopicWithCourse[];
  heatmapData: DailyActivityPoint[];
  onToggleTopic: (id: string, completed: boolean) => void;
  onSelectCourseFilter: (courseId: string) => void;
  onNavigateTab: (tab: string) => void;
  onReschedule: (days: number) => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  courses,
  topics,
  heatmapData,
  onToggleTopic,
  onSelectCourseFilter,
  onNavigateTab,
  onReschedule,
}) => {
  const [rescheduleDays, setRescheduleDays] = useState(7);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  if (!metrics) {
    return (
      <div className="py-16 text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        جاري تحميل بيانات الخطة...
      </div>
    );
  }

  const adherenceColor =
    metrics.adherencePercent >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : metrics.adherencePercent >= 50
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const adherenceBarColor =
    metrics.adherencePercent >= 80
      ? 'bg-emerald-500'
      : metrics.adherencePercent >= 50
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRescheduling(true);
    try {
      await onReschedule(rescheduleDays);
      setShowRescheduleModal(false);
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#181c2e] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            🚀 خطة DevOps – متابعة التقدم
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {metrics.isStarted
              ? `اليوم ${metrics.daysIntoPlan} من الخطة · بداية الخطة 6 نوفمبر 2026 · التقديم في أبريل 2027`
              : 'الخطة هتبدأ يوم 6 نوفمبر 2026 – جهّز الاشتراكات والـ VM وحساب AWS'}
          </p>
        </div>

        <button
          onClick={() => setShowRescheduleModal(true)}
          className="flex items-center gap-2 self-start sm:self-center px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition"
        >
          <FastForward className="w-4 h-4" />
          <span>ترحيل المواعيد (Reschedule)</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Actual Progress */}
        <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            التقدم الكلي في الخطة
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            {metrics.actualProgressPercent}%
          </div>
          <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${metrics.actualProgressPercent}%` }}
            />
            {/* Expected indicator line */}
            <span
              className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white opacity-60 z-10"
              style={{ right: `${metrics.expectedProgressPercent}%` }}
              title={`المفروض توصله: ${metrics.expectedProgressPercent}%`}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {metrics.completedTopics} من {metrics.totalTopics} موضوع · الخط = المفروض توصله ({metrics.expectedProgressPercent}%)
          </div>
        </div>

        {/* Adherence */}
        <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            الالتزام بالخطة
          </div>
          <div className={`text-3xl font-extrabold mt-1 ${adherenceColor}`}>
            {metrics.adherencePercent}%
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden my-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${adherenceBarColor}`}
              style={{ width: `${metrics.adherencePercent}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {metrics.dueCompletedCount} من {metrics.dueCount} موضوع استحق ميعاده اتخلص · {metrics.statusMessage}
          </div>
        </div>

        {/* Overdue Count */}
        <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            المتأخر
          </div>
          <div
            className={`text-3xl font-extrabold mt-1 ${
              metrics.lateCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {metrics.lateCount}
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden my-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.lateCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: metrics.lateCount > 0 ? '100%' : '0%' }}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {metrics.lateCount > 0
              ? 'مواضيع عدّى ميعادها ولسه ما اتعلمتش'
              : 'مفيش حاجة متأخرة، عاش كمل كده ✅'}
          </div>
        </div>

        {/* On-Time Completion Rate */}
        <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            نسبة الإنجاز في الميعاد
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.onTimeCompletionRate}%
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.onTimeCompletionRate}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            نسبة المواضيع اللي اتخلصت قبل أو في نفس ميعاد استحقاقها
          </div>
        </div>
      </div>

      {/* Late Alert Section */}
      {metrics.lateCount > 0 ? (
        <div className="border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>⚠️ أنت متأخر في {metrics.lateCount} موضوع</span>
          </div>
          <ul className="mt-3 space-y-2 ps-6 list-disc text-sm text-gray-800 dark:text-gray-200">
            {metrics.lateTopics.slice(0, 6).map((topic) => (
              <li key={topic.id}>
                <span className="font-medium">{topic.title}</span>{' '}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({topic.courseName} · كان ميعاده {formatArabicDate(topic.dueDate)})
                </span>
              </li>
            ))}
          </ul>
          {metrics.lateCount > 6 && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-3 font-medium">
              + في {metrics.lateCount - 6} مواضيع تانية متأخرة. افتح صفحة "المواضيع" وفلتر بـ "متأخر".
            </p>
          )}
        </div>
      ) : metrics.isStarted && metrics.completedTopics > 0 ? (
        <div className="border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              ماشي تمام ومفيش تأخير!
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              كل اللي ميعاده عدّى اتخلص أول بأول.
            </div>
          </div>
        </div>
      ) : null}

      {/* Activity Heatmap */}
      <ActivityHeatmap activityData={heatmapData} />

      {/* Course Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>التقدم في كل كورس</span>
          </h2>
          <button
            onClick={() => onNavigateTab('topics')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            عرض كل الكورسات والمواضيع
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {courses.map((course) => {
            const courseTopics = topics.filter((t) => t.courseId === course.id);
            const courseDone = courseTopics.filter((t) => t.completed).length;
            const coursePercent = courseTopics.length
              ? Math.round((courseDone / courseTopics.length) * 100)
              : 0;

            return (
              <div
                key={course.id}
                onClick={() => {
                  onSelectCourseFilter(course.id);
                  onNavigateTab('topics');
                }}
                className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 cursor-pointer transition shadow-sm hover:shadow group"
              >
                <div className="flex items-center justify-between font-bold text-sm text-gray-900 dark:text-white">
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate">{course.name}</span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold ms-2">
                    {coursePercent}%
                  </span>
                </div>

                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden my-3">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${coursePercent}%`, backgroundColor: course.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {courseDone} من {courseTopics.length} موضوع
                  </span>
                  {course.phase === 2 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      Phase 2
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              ترحيل مواعيد المواضيع المتبقية
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              إذا حصلت لك ظروف أو اتأخرت في الخطة، تقدر ترحل مواعيد استحقاق كل المواضيع اللي لسه ما خلصتش
              بعدد أيام محدد بدون ما تمسح أي تاريخ إنجاز سابق.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  عدد أيام الترحيل (إلى الأمام):
                </label>
                <div className="flex gap-2">
                  {[3, 7, 14, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRescheduleDays(d)}
                      className={`flex-1 py-1.5 text-xs rounded-xl font-medium border ${
                        rescheduleDays === d
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      +{d} يوم
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={rescheduleDays}
                  onChange={(e) => setRescheduleDays(parseInt(e.target.value) || 1)}
                  className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isRescheduling}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                >
                  {isRescheduling ? 'جاري الترحيل...' : 'تأكيد الترحيل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
