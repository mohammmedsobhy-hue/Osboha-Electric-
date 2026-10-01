import React, { useState } from 'react';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  FileQuestion,
  XCircle,
  ChevronDown,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { PROJECT_STATUS_MAP, formatDate } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface ProjectStatusTrackerProps {
  project: Project;
  compact?: boolean;
  allowChange?: boolean;
}

export const ProjectStatusTracker: React.FC<ProjectStatusTrackerProps> = ({
  project,
  compact = false,
  allowChange = true,
}) => {
  const { updateProjectStatus, userPermissions } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<ProjectStatus | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const canEdit = allowChange && (userPermissions.canManageProjects || userPermissions.canViewFinancials);
  const currentMeta = PROJECT_STATUS_MAP[project.status] || PROJECT_STATUS_MAP.in_progress;

  const statusList: { key: ProjectStatus; label: string; icon: any }[] = [
    { key: 'planning', label: 'تخطيط', icon: FileQuestion },
    { key: 'in_progress', label: 'قيد التنفيذ', icon: PlayCircle },
    { key: 'on_hold', label: 'متوقف', icon: PauseCircle },
    { key: 'completed', label: 'مكتمل', icon: CheckCircle2 },
    { key: 'cancelled', label: 'ملغي', icon: XCircle },
  ];

  const handleSelectStatus = (newStatus: ProjectStatus) => {
    setDropdownOpen(false);
    if (newStatus === project.status) return;

    if (newStatus === 'on_hold') {
      setSelectedTargetStatus(newStatus);
      setNoteInput(project.statusNote || 'متوقف مؤقتاً في انتظار متطلبات إضافية');
      setShowNoteModal(true);
      return;
    }

    updateProjectStatus(project.id, newStatus);
  };

  const handleConfirmWithNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetStatus) return;
    updateProjectStatus(project.id, selectedTargetStatus, noteInput.trim() || undefined);
    setShowNoteModal(false);
    setSelectedTargetStatus(null);
  };

  if (compact) {
    return (
      <div className="relative inline-block text-right">
        {canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${currentMeta.badgeClass} hover:opacity-90 shadow-2xs`}
            title="انقر لتغيير حالة المشروع"
          >
            <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass} animate-pulse`} />
            <span>{currentMeta.label}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${currentMeta.badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass}`} />
            <span>{currentMeta.label}</span>
          </span>
        )}

        {dropdownOpen && canEdit && (
          <>
            <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} />
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-right animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                تحديث حالة المشروع
              </div>
              {statusList.map((item) => {
                const meta = PROJECT_STATUS_MAP[item.key];
                const isCurrent = project.status === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectStatus(item.key);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-right transition-colors ${
                      isCurrent
                        ? 'bg-slate-100 font-bold text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      <span>{item.label}</span>
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Full Tracker View (used on Project Card & Detail Modal)
  return (
    <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3.5 space-y-3 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">مسار حالة المشروع:</span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentMeta.badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${currentMeta.dotClass} animate-pulse`} />
            <span>{currentMeta.label}</span>
          </span>
          {project.statusUpdatedAt && (
            <span className="text-[10px] text-slate-400 font-mono">
              (تحديث: {formatDate(project.statusUpdatedAt)})
            </span>
          )}
        </div>

        {canEdit && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen((prev) => !prev);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              <span>تغيير الحالة</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} />
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-right">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                    اختر الحالة الجديدة
                  </div>
                  {statusList.map((item) => {
                    const meta = PROJECT_STATUS_MAP[item.key];
                    const isCurrent = project.status === item.key;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectStatus(item.key);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-right transition-colors ${
                          isCurrent
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                          <div>
                            <span className="block font-semibold">{item.label}</span>
                            <span className="block text-[10px] text-slate-400">{meta.description}</span>
                          </div>
                        </div>
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Visual Workflow Steps */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 pt-1 text-center">
        {/* Step 1: Planning */}
        <div
          onClick={() => canEdit && handleSelectStatus('planning')}
          className={`p-2 rounded-lg border text-xs transition-all ${
            canEdit ? 'cursor-pointer hover:shadow-2xs' : ''
          } ${
            project.status === 'planning'
              ? 'bg-purple-100/80 border-purple-300 text-purple-900 font-bold'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-[10px] sm:text-xs">1. تخطيط</span>
          </div>
          <span className="text-[9px] text-slate-400 block hidden sm:block">إعداد النطاق</span>
        </div>

        {/* Step 2: In Progress */}
        <div
          onClick={() => canEdit && handleSelectStatus('in_progress')}
          className={`p-2 rounded-lg border text-xs transition-all ${
            canEdit ? 'cursor-pointer hover:shadow-2xs' : ''
          } ${
            project.status === 'in_progress'
              ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900 font-bold'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] sm:text-xs">2. قيد التنفيذ</span>
          </div>
          <span className="text-[9px] text-slate-400 block hidden sm:block">عمل الفريق</span>
        </div>

        {/* Step 3: On Hold (Conditional or pause step) */}
        <div
          onClick={() => canEdit && handleSelectStatus('on_hold')}
          className={`p-2 rounded-lg border text-xs transition-all ${
            canEdit ? 'cursor-pointer hover:shadow-2xs' : ''
          } ${
            project.status === 'on_hold'
              ? 'bg-amber-100/90 border-amber-300 text-amber-900 font-bold animate-pulse'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] sm:text-xs">3. متوقف</span>
          </div>
          <span className="text-[9px] text-slate-400 block hidden sm:block">تعليق مؤقت</span>
        </div>

        {/* Step 4: Completed */}
        <div
          onClick={() => canEdit && handleSelectStatus('completed')}
          className={`p-2 rounded-lg border text-xs transition-all ${
            canEdit ? 'cursor-pointer hover:shadow-2xs' : ''
          } ${
            project.status === 'completed'
              ? 'bg-blue-100/80 border-blue-300 text-blue-900 font-bold'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] sm:text-xs">4. مكتمل</span>
          </div>
          <span className="text-[9px] text-slate-400 block hidden sm:block">تسليم نهائي</span>
        </div>
      </div>

      {/* Status Note / Reason Banner (especially for On Hold) */}
      {project.status === 'on_hold' && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">المشروع متوقف حالياً:</span>{' '}
            <span>{project.statusNote || 'متوقف مؤقتاً في انتظار استكمال المتطلبات أو الاعتماد من العميل.'}</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => updateProjectStatus(project.id, 'in_progress')}
                className="mt-1.5 block text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded w-fit transition-colors"
              >
                استئناف التنفيذ الآن ⚡
              </button>
            )}
          </div>
        </div>
      )}

      {project.status === 'completed' && (
        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>تم اكتمال وتسليم المشروع بنجاح.</span>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => updateProjectStatus(project.id, 'in_progress')}
              className="text-[11px] text-blue-700 hover:underline font-semibold"
            >
              إعادة فتح المشروع
            </button>
          )}
        </div>
      )}

      {/* Note Modal when setting On Hold or updating status reason */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 text-right animate-in fade-in zoom-in-95">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                تحديث حالة المشروع إلى: {selectedTargetStatus ? PROJECT_STATUS_MAP[selectedTargetStatus]?.label : ''}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك كتابة سبب التوقف أو الملاحظات المصاحبة لهذا التغيير:
              </p>
            </div>
            <form onSubmit={handleConfirmWithNote} className="space-y-3">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="اكتب سبب إيقاف المشروع أو التحديث..."
                rows={3}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  حفظ وتغيير الحالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
