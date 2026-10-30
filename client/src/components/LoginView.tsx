import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Rocket } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await login(password);
      showToast('أهلاً بيك يا بطل! تم تسجيل الدخول بنجاح.', 'success');
    } catch (err: any) {
      showToast(err.message || 'كلمة المرور غير صحيحة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#f5f6fa] to-indigo-50/40 dark:from-[#0f1220] dark:to-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Rocket className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">خطة DevOps – 2027</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            سجّل دخولك لمتابعة خطتك الخاصة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              كلمة مرور الحساب
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                autoFocus
                className="w-full px-4 py-2.5 ps-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Lock className="w-4 h-4 absolute start-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition duration-150 shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          كلمة المرور الافتراضية هي: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">devops2027</code>
        </p>
      </div>
    </div>
  );
};
