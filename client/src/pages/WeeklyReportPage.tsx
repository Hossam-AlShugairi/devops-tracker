import React from 'react';
import { WeeklyReportData } from '../../../shared/types';
import { formatArabicDate, formatArabicFullDate } from '../utils/api';
import { CheckCircle2, AlertCircle, Calendar, ArrowRight, Target, Clock } from 'lucide-react';

interface WeeklyReportPageProps {
  report: WeeklyReportData | null;
  loading: boolean;
}

export const WeeklyReportPage: React.FC<WeeklyReportPageProps> = ({ report, loading }) => {
  if (loading || !report) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        جاري تجميع التقرير الأسبوعي...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📋 التقرير الأسبوعي</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ملخص الأسبوع الحالي: من {formatArabicFullDate(report.weekStart)} إلى{' '}
              {formatArabicFullDate(report.weekEnd)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              الالتزام في المواعيد: {report.onTimeRateThisWeek}%
            </span>
          </div>
        </div>

        {/* Weekly Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">ساعات المذاكرة</div>
            <div className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
              {report.totalHoursStudiedThisWeek} / {report.targetHoursThisWeek} س
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">أُنجز هذا الأسبوع</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {report.completedThisWeek.length} مواضيع
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">فات ميعادها</div>
            <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              {report.overdueMissed.length} مواضيع
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">مطلوب الأسبوع القادم</div>
            <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {report.nextWeekPlanned.length} مواضيع
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Done This Week */}
        <div className="bg-white dark:bg-[#181c2e] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>ما تم إنجازه هذا الأسبوع ({report.completedThisWeek.length})</span>
          </div>

          <div className="space-y-2">
            {report.completedThisWeek.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                لم يتم إنهاء أي موضوع خلال هذا الأسبوع بعد.
              </p>
            ) : (
              report.completedThisWeek.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t.title}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: t.courseColor }}
                    />
                    <span>{t.courseName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Missed / Overdue */}
        <div className="bg-white dark:bg-[#181c2e] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>مواضيع متأخرة أو فائتة ({report.overdueMissed.length})</span>
          </div>

          <div className="space-y-2">
            {report.overdueMissed.length === 0 ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 py-3 text-center font-medium">
                ممتاز! مفيش أي مواضيع متأخرة للأسبوع ده.
              </p>
            ) : (
              report.overdueMissed.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20 text-xs"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t.title}</div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center justify-between">
                    <span>{t.courseName}</span>
                    <span>كان ميعاده: {formatArabicDate(t.dueDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Next Week's Plan */}
        <div className="bg-white dark:bg-[#181c2e] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>خطة الأسبوع القادم ({report.nextWeekPlanned.length})</span>
          </div>

          <div className="space-y-2">
            {report.nextWeekPlanned.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                لا توجد مواضيع مجدولة للأسبوع القادم مباشرة.
              </p>
            ) : (
              report.nextWeekPlanned.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{t.title}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                    <span>{t.courseName}</span>
                    <span>استحقاق: {formatArabicDate(t.dueDate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
