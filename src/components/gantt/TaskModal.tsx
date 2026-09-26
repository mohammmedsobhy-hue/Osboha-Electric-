import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ProjectTask, TaskStatus } from '../../types';
import { formatDate } from '../../utils/formatters';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  taskToEdit?: ProjectTask | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  taskToEdit,
}) => {
  const { db, addTask, updateTask } = useApp();

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [assignedMemberId, setAssignedMemberId] = useState<string>('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [isMilestone, setIsMilestone] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setProjectId(taskToEdit.projectId);
      setTitle(taskToEdit.title);
      setStartDate(taskToEdit.startDate);
      setEndDate(taskToEdit.endDate);
      setProgress(taskToEdit.progress);
      setStatus(taskToEdit.status);
      setAssignedMemberId(taskToEdit.assignedMemberId || '');
      setDependencies(taskToEdit.dependencies || []);
      setIsMilestone(Boolean(taskToEdit.isMilestone));
      setNotes(taskToEdit.notes || '');
    } else {
      const initialProject = defaultProjectId || db.projects[0]?.id || '';
      setProjectId(initialProject);
      setTitle('');
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);

      const d = new Date();
      d.setDate(d.getDate() + 14);
      setEndDate(d.toISOString().slice(0, 10));

      setProgress(0);
      setStatus('not_started');
      setAssignedMemberId('');
      setDependencies([]);
      setIsMilestone(false);
      setNotes('');
    }
  }, [taskToEdit, defaultProjectId, isOpen, db.projects]);

  // Compute duration in days
  const durationDays = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  // Other tasks in this project available for dependency selection (exclude self)
  const availableDependencies = db.tasks.filter(
    t => t.projectId === projectId && (!taskToEdit || t.id !== taskToEdit.id)
  );

  const handleToggleDependency = (depId: string) => {
    setDependencies(prev =>
      prev.includes(depId) ? prev.filter(id => id !== depId) : [...prev, depId]
    );
  };

  const handleProgressChange = (val: number) => {
    setProgress(val);
    if (val === 100) setStatus('completed');
    else if (val > 0 && status === 'not_started') setStatus('in_progress');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        projectId,
        title,
        startDate,
        endDate,
        durationDays,
        progress,
        status,
        assignedMemberId: assignedMemberId || undefined,
        dependencies,
        isMilestone,
        notes,
      });
    } else {
      addTask({
        projectId,
        title,
        startDate,
        endDate,
        durationDays,
        progress,
        status,
        assignedMemberId: assignedMemberId || undefined,
        dependencies,
        isMilestone,
        notes,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'تعديل مهمة في مخطط جانت' : 'إضافة مهمة جديدة لمخطط جانت'}
      subtitle="تحديد التواريخ، التبعيات، والمسؤول لحساب المسار الحرج تلقائياً"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            المشروع <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={projectId}
            onChange={e => {
              setProjectId(e.target.value);
              setDependencies([]);
            }}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            عنوان المهمة / المرحلة <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="مثال: بناء الواجهات البرمجية وتكامل بوابات الدفع"
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ البداية <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ النهاية <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-slate-600">المدة المحسوبة للمهمة:</span>
          <span className="font-mono font-bold text-slate-900">{durationDays} يوم</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">المسؤول عن التنفيذ</label>
            <select
              value={assignedMemberId}
              onChange={e => setAssignedMemberId(e.target.value)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">بدون تعيين مسؤول محدد</option>
              {db.teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">حالة المهمة</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="not_started">لم تبدأ بعد</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتملة</option>
              <option value="delayed">متأخرة عن الجدول</option>
            </select>
          </div>
        </div>

        {/* Progress Slider */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-700">نسبة الإنجاز:</span>
            <span className="font-mono font-bold text-emerald-700">{progress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={e => handleProgressChange(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Dependencies (Predecessors) for Critical Path Calculation */}
        <div className="pt-2 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            التبعيات (المهام السابقة المشروطة للبدء Finish-to-Start)
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            حدد المهام التي يجب اكتمالها قبل بدء هذه المهمة لحساب المسار الحرج (Critical Path)
          </p>

          {availableDependencies.length === 0 ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-400 text-center">
              لا توجد مهام أخرى مسجلة في هذا المشروع
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {availableDependencies.map(dep => {
                const isSelected = dependencies.includes(dep.id);
                return (
                  <label
                    key={dep.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-medium' : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleDependency(dep.id)}
                        className="rounded accent-emerald-600 text-emerald-600"
                      />
                      <span>{dep.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(dep.startDate)} ➔ {formatDate(dep.endDate)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="milestone"
            checked={isMilestone}
            onChange={e => setIsMilestone(e.target.checked)}
            className="rounded accent-emerald-600 text-emerald-600"
          />
          <label htmlFor="milestone" className="text-xs font-semibold text-slate-800 cursor-pointer">
            تعيين كنقطة علامة فارقة رئيسية (Milestone)
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات ومخرجات المهمة</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="تفاصيل التسليم، روابط التوثيق، الخ..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
          >
            {taskToEdit ? 'حفظ التعديلات' : 'إضافة المهمة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
