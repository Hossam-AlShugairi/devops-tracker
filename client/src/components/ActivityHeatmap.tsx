import React, { useMemo } from 'react';
import { DailyActivityPoint } from '../../../shared/types';
import { getCairoTodayString } from '../../../shared/calculations';

interface HeatmapProps {
  activityData: DailyActivityPoint[];
}

export const ActivityHeatmap: React.FC<HeatmapProps> = ({ activityData }) => {
  const todayStr = getCairoTodayString();

  // Create last 120 days array
  const days = useMemo(() => {
    const list: Array<{ date: string; level: number; count: number; hours: number }> = [];
    const today = new Date(`${todayStr}T00:00:00Z`);
    const dataMap = new Map<string, DailyActivityPoint>();
    activityData.forEach((d) => dataMap.set(d.date, d));

    for (let i = 119; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      const dateStr = d.toISOString().slice(0, 10);
      const item = dataMap.get(dateStr);
      list.push({
        date: dateStr,
        level: item ? item.level : 0,
        count: item ? item.count : 0,
        hours: item ? item.hours : 0,
      });
    }
    return list;
  }, [activityData, todayStr]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-200 dark:bg-emerald-900/60';
      case 2:
        return 'bg-emerald-400 dark:bg-emerald-700';
      case 3:
        return 'bg-emerald-500 dark:bg-emerald-600';
      case 4:
        return 'bg-emerald-600 dark:bg-emerald-500';
      default:
        return 'bg-gray-100 dark:bg-gray-800/80';
    }
  };

  return (
    <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>📊 نشاط الإنجاز والمذاكرة (Heatmap)</span>
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <span>أقل</span>
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-800"></span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900"></span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-700"></span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-600"></span>
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500"></span>
          </div>
          <span>أكتر</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: أنجزت ${day.count} موضوع وسجلت ${day.hours} ساعة مذاكرة`}
              className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer ${getLevelColor(
                day.level
              )}`}
            />
          ))}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
        المربعات الخضراء بتعبّر عن المواضيع المخلصة وساعات المذاكرة اليومية المسجلة.
      </p>
    </div>
  );
};
