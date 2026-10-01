import React from 'react';
import {
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  FileQuestion,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProjectStatus, Project } from '../../types';
import { PROJECT_STATUS_MAP, formatCurrency } from '../../utils/formatters';

interface ProjectStatusSummaryWidgetProps {
  onSelectProject?: (id: string) => void;
  onNavigateToProjectsWithStatus?: (status: ProjectStatus) => void;
}

export const ProjectStatusSummaryWidget: React.FC<ProjectStatusSummaryWidgetProps> = ({
  onSelectProject,
  onNavigateToProjectsWithStatus,
}) => {
  const { db, allProjectFinancials, reportCurrency, setActiveTab, setFilters } = useApp();

  const projects = db.projects;
  const total = projects.length;

  if (total === 0) return null;

  // Counts & sums by status
  const inProgress = projects.filter((p) => p.status === 'in_progress');
  const completed = projects.filter((p) => p.status === 'completed');
  const onHold = projects.filter((p) => p.status === 'on_hold');
  const planning = projects.filter((p) => p.status === 'planning');

  const inProgressPercent = total > 0 ? (inProgress.length / total) * 100 : 0;
  const completedPercent = total > 0 ? (completed.length / total) * 100 : 0;
  const onHoldPercent = total > 0 ? (onHold.length / total) * 100 : 0;
  const planningPercent = total > 0 ? (planning.length / total) * 100 : 0;

  const inProgressValue = inProgress.reduce((sum, p) => sum + p.contractValue, 0);
  const completedValue = completed.reduce((sum, p) => sum + p.contractValue, 0);
  const onHoldValue = onHold.reduce((sum, p) => sum + p.contractValue, 0);
  const planningValue = planning.reduce((sum, p) => sum + p.contractValue, 0);

  const handleStatusClick = (status: ProjectStatus) => {
    if (onNavigateToProjectsWithStatus) {
      onNavigateToProjectsWithStatus(status);
    } else {
      setFilters((prev) => ({ ...prev, status }));
      setActiveTab('projects');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              متابعة حالة المشاريع وسير العمل
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {total} مشروع
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مؤشرات توزيع حالات المشاريع (قيد التنفيذ، مكتمل، متوقف، وتخطيط) والالتزامات التعاقدية
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start sm:self-auto"
        >
          <span>إدارة كافة المشاريع</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>نسبة توزيع الحالات في النظام</span>
          <span>{total} مشاريع مسجلة</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {inProgressPercent > 0 && (
            <div
              style={{ width: `${inProgressPercent}%` }}
              className="bg-emerald-600 transition-all hover:opacity-90"
              title={`قيد التنفيذ: ${inProgress.length} (${inProgressPercent.toFixed(0)}%)`}
            />
          )}
          {completedPercent > 0 && (
            <div
              style={{ width: `${completedPercent}%` }}
              className="bg-blue-600 transition-all hover:opacity-90"
              title={`مكتمل: ${completed.length} (${completedPercent.toFixed(0)}%)`}
            />
          )}
          {onHoldPercent > 0 && (
            <div
              style={{ width: `${onHoldPercent}%` }}
              className="bg-amber-500 transition-all hover:opacity-90"
              title={`متوقف: ${onHold.length} (${onHoldPercent.toFixed(0)}%)`}
            />
          )}
          {planningPercent > 0 && (
            <div
              style={{ width: `${planningPercent}%` }}
              className="bg-purple-500 transition-all hover:opacity-90"
              title={`تخطيط: ${planning.length} (${planningPercent.toFixed(0)}%)`}
            />
          )}
        </div>
      </div>

      {/* Status KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. In Progress */}
        <div
          onClick={() => handleStatusClick('in_progress')}
          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-emerald-600" />
              <span>قيد التنفيذ</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-900">
              {inProgress.length}
            </span>
            <span className="text-[11px] font-mono text-emerald-700">
              {inProgressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            العقود: {formatCurrency(inProgressValue, reportCurrency)}
          </div>
        </div>

        {/* 2. Completed */}
        <div
          onClick={() => handleStatusClick('completed')}
          className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>مكتمل</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-blue-900">
              {completed.length}
            </span>
            <span className="text-[11px] font-mono text-blue-700">
              {completedPercent.toFixed(0)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            المُسلّم: {formatCurrency(completedValue, reportCurrency)}
          </div>
        </div>

        {/* 3. On Hold */}
        <div
          onClick={() => handleStatusClick('on_hold')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer group shadow-2xs ${
            onHold.length > 0
              ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-50'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>متوقف</span>
            </span>
            {onHold.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900 animate-pulse">
                تنبيه
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-900">
              {onHold.length}
            </span>
            <span className="text-[11px] font-mono text-amber-700">
              {onHoldPercent.toFixed(0)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {onHold.length > 0 ? 'يتطلب متابعة واستئناف' : 'لا مشاريع متوقفة'}
          </div>
        </div>

        {/* 4. Planning */}
        <div
          onClick={() => handleStatusClick('planning')}
          className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50/80 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-purple-600" />
              <span>تخطيط</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-purple-900">
              {planning.length}
            </span>
            <span className="text-[11px] font-mono text-purple-700">
              {planningPercent.toFixed(0)}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            المتوقع: {formatCurrency(planningValue, reportCurrency)}
          </div>
        </div>
      </div>

      {/* Special Attention Alert for On Hold Projects */}
      {onHold.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">
                يوجد {onHold.length} {onHold.length === 1 ? 'مشروع متوقف حالياً' : 'مشاريع متوقفة حالياً'}:
              </span>{' '}
              <span className="text-amber-800">
                {onHold.map((p) => p.name).join(' ، ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleStatusClick('on_hold')}
            className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-md transition-colors self-start sm:self-auto shrink-0"
          >
            عرض المشاريع المتوقفة
          </button>
        </div>
      )}
    </div>
  );
};
