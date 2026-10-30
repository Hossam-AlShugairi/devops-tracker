import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardPage } from './pages/DashboardPage';
import { TopicsPage } from './pages/TopicsPage';
import { StudyLogPage } from './pages/StudyLogPage';
import { WeeklyReportPage } from './pages/WeeklyReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { apiFetch } from './utils/api';
import {
  PlanMetrics,
  Course,
  TopicWithCourse,
  StudyLog,
  StreakInfo,
  UserSettings,
  WeeklyReportData,
  DailyActivityPoint,
} from '../../shared/types';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // State data
  const [metrics, setMetrics] = useState<PlanMetrics | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<TopicWithCourse[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [heatmapData, setHeatmapData] = useState<DailyActivityPoint[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Sync theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const loadAllData = async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const [
        metricsRes,
        coursesRes,
        topicsRes,
        logsRes,
        settingsRes,
        weeklyRes,
        heatmapRes,
      ] = await Promise.all([
        apiFetch<{ metrics: PlanMetrics }>('/dashboard/metrics'),
        apiFetch<Course[]>('/courses'),
        apiFetch<TopicWithCourse[]>('/topics'),
        apiFetch<{ logs: StudyLog[]; streak: StreakInfo }>('/logs'),
        apiFetch<UserSettings>('/settings'),
        apiFetch<WeeklyReportData>('/reports/weekly'),
        apiFetch<DailyActivityPoint[]>('/reports/heatmap'),
      ]);

      setMetrics(metricsRes.metrics);
      setCourses(coursesRes);
      setTopics(topicsRes);
      setLogs(logsRes.logs);
      setStreak(logsRes.streak);
      setSettings(settingsRes);
      setWeeklyReport(weeklyRes);
      setHeatmapData(heatmapRes);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Topic actions
  const handleToggleTopic = async (id: string, completed: boolean) => {
    // Optimistic UI update
    setTopics((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed,
              completedAt: completed ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      await apiFetch(`/topics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
      // Refresh metrics and heatmap in background
      const [mRes, hRes, wRes] = await Promise.all([
        apiFetch<{ metrics: PlanMetrics }>('/dashboard/metrics'),
        apiFetch<DailyActivityPoint[]>('/reports/heatmap'),
        apiFetch<WeeklyReportData>('/reports/weekly'),
      ]);
      setMetrics(mRes.metrics);
      setHeatmapData(hRes);
      setWeeklyReport(wRes);
    } catch (err: any) {
      showToast(err.message, 'error');
      loadAllData();
    }
  };

  const handleCreateTopic = async (data: {
    courseId: string;
    title: string;
    dueDate: string;
    notes?: string;
  }) => {
    try {
      await apiFetch('/topics', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('تمت إضافة الموضوع بنجاح', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateTopic = async (id: string, data: Partial<TopicWithCourse>) => {
    try {
      await apiFetch(`/topics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('تم تحديث الموضوع بنجاح', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await apiFetch(`/topics/${id}`, { method: 'DELETE' });
      showToast('تم حذف الموضوع', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Course actions
  const handleCreateCourse = async (data: { name: string; color: string; phase: number }) => {
    try {
      await apiFetch('/courses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('تمت إضافة الكورس بنجاح', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateCourse = async (id: string, data: Partial<Course>) => {
    try {
      await apiFetch(`/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('تم تعديل الكورس', 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      showToast('تم حذف الكورس وجميع مواضيعه', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Reschedule
  const handleReschedule = async (days: number) => {
    try {
      const res = await apiFetch<{ shiftedCount: number; message: string }>('/topics/reschedule', {
        method: 'POST',
        body: JSON.stringify({ days }),
      });
      showToast(res.message, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Logs actions
  const handleCreateLog = async (data: { date: string; hours: number; notes?: string }) => {
    try {
      await apiFetch('/logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('تم تسجيل جلسة المذاكرة بنجاح', 'success');
      const [lRes, hRes, wRes] = await Promise.all([
        apiFetch<{ logs: StudyLog[]; streak: StreakInfo }>('/logs'),
        apiFetch<DailyActivityPoint[]>('/reports/heatmap'),
        apiFetch<WeeklyReportData>('/reports/weekly'),
      ]);
      setLogs(lRes.logs);
      setStreak(lRes.streak);
      setHeatmapData(hRes);
      setWeeklyReport(wRes);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await apiFetch(`/logs/${id}`, { method: 'DELETE' });
      showToast('تم حذف الجلسة', 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Settings & Backups
  const handleUpdateSettings = async (data: Partial<UserSettings>) => {
    await apiFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    loadAllData();
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    await apiFetch('/settings/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  const handleResetProgress = async (confirmPhrase: string) => {
    await apiFetch('/reset', {
      method: 'POST',
      body: JSON.stringify({ confirmPhrase }),
    });
    loadAllData();
  };

  const handleExportBackup = () => {
    window.open('/api/backup/export', '_blank');
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await apiFetch('/backup/import', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      showToast('تم استيراد النسخة الاحتياطية بنجاح!', 'success');
      loadAllData();
    } catch (err: any) {
      showToast('فشل الاستيراد: ' + (err.message || 'الملف غير صالح'), 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa] dark:bg-[#0f1220]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6fa] dark:bg-[#0f1220] transition-colors">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        streakCount={streak?.currentStreak || 0}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20">
        {currentTab === 'dashboard' && (
          <DashboardPage
            metrics={metrics}
            courses={courses}
            topics={topics}
            heatmapData={heatmapData}
            onToggleTopic={handleToggleTopic}
            onSelectCourseFilter={setSelectedCourseFilter}
            onNavigateTab={setCurrentTab}
            onReschedule={handleReschedule}
          />
        )}

        {currentTab === 'topics' && (
          <TopicsPage
            courses={courses}
            topics={topics}
            selectedCourseFilter={selectedCourseFilter}
            onSelectCourseFilter={setSelectedCourseFilter}
            onToggleTopic={handleToggleTopic}
            onCreateTopic={handleCreateTopic}
            onUpdateTopic={handleUpdateTopic}
            onDeleteTopic={handleDeleteTopic}
            onCreateCourse={handleCreateCourse}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
          />
        )}

        {currentTab === 'logs' && (
          <StudyLogPage
            logs={logs}
            streak={streak}
            targetDailyHours={settings?.targetDailyHours || 2}
            onCreateLog={handleCreateLog}
            onDeleteLog={handleDeleteLog}
          />
        )}

        {currentTab === 'weekly' && (
          <WeeklyReportPage report={weeklyReport} loading={loadingData} />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onChangePassword={handleChangePassword}
            onResetProgress={handleResetProgress}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}
      </main>
    </div>
  );
};
