import React, { useState } from 'react';
import { UserSettings } from '../../../shared/types';
import { useToast } from '../context/ToastContext';
import { Settings, Download, Upload, RefreshCw, Key, Shield, Calendar, Clock } from 'lucide-react';

interface SettingsPageProps {
  settings: UserSettings | null;
  onUpdateSettings: (data: Partial<UserSettings>) => Promise<void>;
  onChangePassword: (current: string, next: string) => Promise<void>;
  onResetProgress: (phrase: string) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onChangePassword,
  onResetProgress,
  onExportBackup,
  onImportBackup,
}) => {
  const { showToast } = useToast();

  // Settings form
  const [startDate, setStartDate] = useState(settings?.planStartDate || '2026-11-06');
  const [targetHours, setTargetHours] = useState(settings?.targetDailyHours || 2);
  const [showPhase2, setShowPhase2] = useState(settings?.showPhase2 || false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Reset progress form
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        planStartDate: startDate,
        targetDailyHours: Number(targetHours),
        showPhase2,
      });
      showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsChangingPass(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showToast('تم تغيير كلمة المرور بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmInput !== 'إعادة ضبط') {
      showToast('يرجى كتابة "إعادة ضبط" بدقة لتأكيد العملية', 'error');
      return;
    }
    setIsResetting(true);
    try {
      await onResetProgress(resetConfirmInput);
      setResetConfirmInput('');
      showToast('تمت إعادة ضبط كل علامات الإنجاز بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>إعدادات التطبيق والخطة</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          خصّص معايير الخطة، تحكّم في المرحلة الثانية، وصدّر أو استرجع بياناتك بأمان.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* General Plan Settings */}
        <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>معايير الخطة والهدف اليومي</span>
          </h3>

          <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ بداية الخطة:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                الهدف اليومي للمذاكرة (ساعات / يوم):
              </label>
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={targetHours}
                onChange={(e) => setTargetHours(parseFloat(e.target.value) || 2)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhase2}
                  onChange={(e) => setShowPhase2(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    تفعيل وعرض كورسات المرحلة الثانية (Phase 2)
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    يشمل شهادتي CKA و CompTIA Security+ المقررة بعد إتمام المرحلة الأولى في مايو 2027.
                  </div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
            >
              حفظ التغييرات
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>تغيير كلمة المرور</span>
          </h3>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الحالية:
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل الحالية..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الجديدة:
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isChangingPass ? 'جاري التغيير...' : 'تحديث كلمة المرور'}
            </button>
          </form>
        </div>

        {/* Backup Export / Import */}
        <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600" />
            <span>النسخ الاحتياطي ونقل البيانات (JSON)</span>
          </h3>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            تقدر تنزل نسخة كاملة من كل الكورسات والمواضيع المنجزة وسجلات المذاكرة كملف JSON، أو ترفع
            نسخة قديمة لاسترجاعها.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onExportBackup}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة (Export)</span>
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>استيراد ملف (Import)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger Zone: Reset Progress */}
        <div className="bg-white dark:bg-[#181c2e] p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm">
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>منطقة الخطر: إعادة ضبط التقدم</span>
          </h3>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
            العملية دي هتمسح جميع علامات الإنجاز للمواضيع وسجلات المذاكرة اليومية (مع الإبقاء على أسماء
            الكورسات والمواضيع).
          </p>

          <form onSubmit={handleResetSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                اكتب <code className="bg-rose-50 text-rose-600 px-1 py-0.5 rounded">إعادة ضبط</code> للتأكيد:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="إعادة ضبط"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isResetting || resetConfirmInput !== 'إعادة ضبط'}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-40"
            >
              {isResetting ? 'جاري إعادة الضبط...' : 'تأكيد مسح التقدم'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
