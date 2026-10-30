import React, { useState, useMemo } from 'react';
import { Course, TopicWithCourse } from '../../../shared/types';
import { formatArabicDate } from '../utils/api';
import { calculateDaysDiff, getCairoTodayString } from '../../../shared/calculations';
import { Plus, Edit2, Trash2, Calendar, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface TopicsPageProps {
  courses: Course[];
  topics: TopicWithCourse[];
  selectedCourseFilter: string;
  onSelectCourseFilter: (id: string) => void;
  onToggleTopic: (id: string, completed: boolean) => void;
  onCreateTopic: (data: { courseId: string; title: string; dueDate: string; notes?: string }) => Promise<void>;
  onUpdateTopic: (id: string, data: Partial<TopicWithCourse>) => Promise<void>;
  onDeleteTopic: (id: string) => Promise<void>;
  onCreateCourse: (data: { name: string; color: string; phase: number }) => Promise<void>;
  onUpdateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
}

export const TopicsPage: React.FC<TopicsPageProps> = ({
  courses,
  topics,
  selectedCourseFilter,
  onSelectCourseFilter,
  onToggleTopic,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
}) => {
  const [filter, setFilter] = useState<string>(selectedCourseFilter || 'all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Modals state
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicWithCourse | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const todayStr = getCairoTodayString();

  // Form states
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicCourseId, setNewTopicCourseId] = useState(courses[0]?.id || '');
  const [newTopicDueDate, setNewTopicDueDate] = useState(todayStr);
  const [newTopicNotes, setNewTopicNotes] = useState('');

  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('#4f46e5');
  const [newCoursePhase, setNewCoursePhase] = useState(1);

  // Filter chips
  const chips = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [
      { id: 'all', label: 'الكل' },
      { id: 'week', label: 'الأسبوع ده' },
      { id: 'late', label: 'متأخر' },
      { id: 'todo', label: 'لسه' },
      { id: 'done', label: 'خلص' },
    ];
    courses.forEach((c) => {
      list.push({ id: `c_${c.id}`, label: c.name });
    });
    return list;
  }, [courses]);

  // Filtered and sorted topics
  const filteredTopics = useMemo(() => {
    return topics
      .filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'week') {
          const diff = calculateDaysDiff(item.dueDate, todayStr);
          return !item.completed && diff >= 0 && diff <= 7;
        }
        if (filter === 'late') {
          return !item.completed && item.dueDate < todayStr;
        }
        if (filter === 'todo') {
          return !item.completed;
        }
        if (filter === 'done') {
          return item.completed;
        }
        if (filter.startsWith('c_')) {
          const courseId = filter.replace('c_', '');
          return item.courseId === courseId;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.orderIndex - b.orderIndex);
  }, [topics, filter, todayStr]);

  const handleCreateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle || !newTopicCourseId) return;
    await onCreateTopic({
      title: newTopicTitle,
      courseId: newTopicCourseId,
      dueDate: newTopicDueDate,
      notes: newTopicNotes || undefined,
    });
    setShowAddTopicModal(false);
    setNewTopicTitle('');
    setNewTopicNotes('');
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName) return;
    await onCreateCourse({
      name: newCourseName,
      color: newCourseColor,
      phase: newCoursePhase,
    });
    setShowAddCourseModal(false);
    setNewCourseName('');
  };

  const handleUpdateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    await onUpdateTopic(editingTopic.id, {
      title: editingTopic.title,
      dueDate: editingTopic.dueDate,
      courseId: editingTopic.courseId,
      notes: editingTopic.notes,
    });
    setEditingTopic(null);
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#181c2e] p-4 rounded-2xl border border-gray-200 dark:border-[#2a3047] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">المواضيع والكورسات</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            تحكم في الخطة، أضف مواضيع جديدة، أو عدل مواعيد الاستحقاق
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isEditMode
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isEditMode ? '✓ إنهاء وضع التعديل' : '✏️ وضع التعديل (Edit mode)'}
          </button>

          {isEditMode && (
            <>
              <button
                onClick={() => setShowAddTopicModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موضوع</span>
              </button>
              <button
                onClick={() => setShowAddCourseModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة كورس</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter chips bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {chips.map((chip) => {
          const isActive = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => {
                setFilter(chip.id);
                onSelectCourseFilter(chip.id.startsWith('c_') ? chip.id.replace('c_', '') : '');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#181c2e] border-gray-200 dark:border-[#2a3047] text-gray-700 dark:text-gray-300 hover:border-indigo-400'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Topics List */}
      <div className="space-y-2.5">
        {filteredTopics.length === 0 ? (
          <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-8 text-center text-gray-500 text-sm">
            مفيش أي مواضيع تطابق الفلتر المختار.
          </div>
        ) : (
          filteredTopics.map((item) => {
            const diff = calculateDaysDiff(item.dueDate, todayStr);
            const isLate = !item.completed && diff < 0;
            const isSoon = !item.completed && diff >= 0 && diff <= 7;
            const isExpanded = expandedTopicId === item.id;

            return (
              <div
                key={item.id}
                className={`group bg-white dark:bg-[#181c2e] border transition-all rounded-2xl p-3 sm:p-4 shadow-sm ${
                  item.completed
                    ? 'border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/20'
                    : isLate
                    ? 'border-rose-200 dark:border-rose-900/60'
                    : 'border-gray-200 dark:border-[#2a3047] hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Custom checkbox */}
                  <button
                    onClick={() => onToggleTopic(item.id, !item.completed)}
                    className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors border ${
                      item.completed
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                    }`}
                  >
                    {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  {/* Topic content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm sm:text-base font-semibold transition ${
                          item.completed
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {item.title}
                      </span>

                      {/* Actions in edit mode */}
                      {isEditMode && (
                        <div className="flex items-center gap-1 opacity-90">
                          <button
                            onClick={() => setEditingTopic(item)}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="تعديل الموضوع"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`متأكد إنك عاوز تحذف "${item.title}"؟`)) {
                                onDeleteTopic(item.id);
                              }
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="حذف الموضوع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                      {/* Course badge */}
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.courseColor }}
                        />
                        <span>{item.courseName}</span>
                      </span>

                      {/* Due date tag */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>ميعاد: {formatArabicDate(item.dueDate)}</span>
                      </span>

                      {/* Status Tag */}
                      {item.completed ? (
                        <span className="px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">
                          ✓ خلص{' '}
                          {item.completedAt && (
                            <span className="text-[10px] opacity-80">
                              ({formatArabicDate(item.completedAt.slice(0, 10))})
                            </span>
                          )}
                        </span>
                      ) : isLate ? (
                        <span className="px-2 py-0.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium">
                          متأخر {-diff} يوم
                        </span>
                      ) : isSoon ? (
                        <span className="px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                          باقي {diff === 0 ? 'النهارده' : `${diff} يوم`}
                        </span>
                      ) : null}

                      {/* Notes expander */}
                      {item.notes && (
                        <button
                          onClick={() => setExpandedTopicId(isExpanded ? null : item.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        >
                          <FileText className="w-3 h-3" />
                          <span>الملاحظات</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded notes preview */}
                    {isExpanded && item.notes && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Topic Modal */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              إضافة موضوع جديد إلى الخطة
            </h3>
            <form onSubmit={handleCreateTopicSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  عنوان الموضوع:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: VPC Peering و Transit Gateway"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الكورس التابع له:
                </label>
                <select
                  value={newTopicCourseId}
                  onChange={(e) => setNewTopicCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ الاستحقاق (Due Date):
                </label>
                <input
                  type="date"
                  required
                  value={newTopicDueDate}
                  onChange={(e) => setNewTopicDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات أو روابط مهمة (اختياري):
                </label>
                <textarea
                  rows={3}
                  value={newTopicNotes}
                  onChange={(e) => setNewTopicNotes(e.target.value)}
                  placeholder="لينكات لمقالات، ملخص لأهم الأوامر، إلخ..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTopicModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              إضافة كورس جديد للخطة
            </h3>
            <form onSubmit={handleCreateCourseSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  اسم الكورس:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Kubernetes (CKA)"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  لون الكورس:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCourseColor}
                    onChange={(e) => setNewCourseColor(e.target.value)}
                    className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCourseColor}
                    onChange={(e) => setNewCourseColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المرحلة (Phase):
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="phase"
                      checked={newCoursePhase === 1}
                      onChange={() => setNewCoursePhase(1)}
                    />
                    <span>المرحلة الأولى الأساسية (Phase 1)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="phase"
                      checked={newCoursePhase === 2}
                      onChange={() => setNewCoursePhase(2)}
                    />
                    <span>المرحلة التانية الاختيارية (Phase 2)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  إضافة الكورس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#181c2e] border border-gray-200 dark:border-[#2a3047] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              تعديل بيانات الموضوع
            </h3>
            <form onSubmit={handleUpdateTopicSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  عنوان الموضوع:
                </label>
                <input
                  type="text"
                  required
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الكورس التابع له:
                </label>
                <select
                  value={editingTopic.courseId}
                  onChange={(e) => setEditingTopic({ ...editingTopic, courseId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ الاستحقاق:
                </label>
                <input
                  type="date"
                  required
                  value={editingTopic.dueDate}
                  onChange={(e) => setEditingTopic({ ...editingTopic, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الملاحظات:
                </label>
                <textarea
                  rows={3}
                  value={editingTopic.notes || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
