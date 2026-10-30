import React from 'react';
import { Moon, Sun, Flame, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  streakCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  streakCount,
  isDark,
  onToggleTheme,
}) => {
  const { logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'الرئيسية' },
    { id: 'topics', label: 'المواضيع والكورسات' },
    { id: 'logs', label: 'سجل المذاكرة' },
    { id: 'weekly', label: 'التقرير الأسبوعي' },
    { id: 'settings', label: 'الإعدادات' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#181c2e]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#2a3047] transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:inline">
              خطة DevOps 2027
            </span>
          </div>

          {streakCount > 0 && (
            <div
              title={`واصل مذاكرتك! ستريك ${streakCount} أيام`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{streakCount} يوم متتالي</span>
            </div>
          )}
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
            title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
