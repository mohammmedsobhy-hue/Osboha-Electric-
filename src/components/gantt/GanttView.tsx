import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  User,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProjectTask, CalculatedTask } from '../../types';
import { calculateCriticalPath } from '../../utils/ganttCalculator';
import { formatDate, getTaskStatusInfo } from '../../utils/formatters';
import { TaskModal } from './TaskModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

type TimeScale = 'days' | 'weeks' | 'months';

export const GanttView: React.FC = () => {
  const { db, currentUser, userPermissions, updateTaskProgress, deleteTask } = useApp();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return db.projects[0]?.id || '';
  });

  const [timeScale, setTimeScale] = useState<TimeScale>('days');
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);
  const [showDelaysOnly, setShowDelaysOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<ProjectTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Active Project
  const currentProject = db.projects.find(p => p.id === selectedProjectId) || db.projects[0];

  // Raw tasks for current project
  const projectRawTasks = useMemo(() => {
    if (!currentProject) return [];
    return db.tasks.filter(t => t.projectId === currentProject.id);
  }, [db.tasks, currentProject]);

  // Calculated Tasks with Critical Path and Slack
  const calculatedTasks = useMemo(() => {
    return calculateCriticalPath(projectRawTasks);
  }, [projectRawTasks]);

  // Filter tasks based on UI toggles & role
  const visibleTasks = useMemo(() => {
    return calculatedTasks.filter(task => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = task.title.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (showCriticalPathOnly && !task.isCritical) return false;
      if (showDelaysOnly && !task.isDelayed) return false;

      // If logged in as team_member, optionally highlight or prioritize their tasks
      return true;
    });
  }, [calculatedTasks, searchQuery, showCriticalPathOnly, showDelaysOnly]);

  // Compute timeline boundaries
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (calculatedTasks.length === 0) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 5);
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { timelineStart: start, timelineEnd: end, totalDays: 35 };
    }

    const startTimes = calculatedTasks.map(t => new Date(t.startDate).getTime());
    const endTimes = calculatedTasks.map(t => new Date(t.endDate).getTime());

    const min = new Date(Math.min(...startTimes));
    min.setDate(min.getDate() - 3); // padding
    const max = new Date(Math.max(...endTimes));
    max.setDate(max.getDate() + 7); // padding

    const days = Math.max(15, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    return { timelineStart: min, timelineEnd: max, totalDays: days };
  }, [calculatedTasks]);

  // Pixel column width per day based on timescale
  const dayColWidth = {
    days: 42,
    weeks: 24,
    months: 12,
  }[timeScale];

  // Helper to map date to X pixel offset from timelineStart (in RTL coordinate system)
  const getXOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffDays = (d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays * dayColWidth);
  };

  const getWidth = (startDateStr: string, endDateStr: string, isMilestone?: boolean) => {
    if (isMilestone) return 24;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days * dayColWidth;
  };

  // Today marker offset
  const todayX = getXOffset(new Date().toISOString().slice(0, 10));

  // Statistics for active project Gantt
  const criticalTasksCount = calculatedTasks.filter(t => t.isCritical).length;
  const delayedTasksCount = calculatedTasks.filter(t => t.isDelayed).length;
  const completedTasksCount = calculatedTasks.filter(t => t.progress === 100).length;

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>مخطط جانت والمسار الحرج للمشاريع</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Gantt & CPM
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            الجدول الزمني التفاعلي للمهام، التبعيات، كشف التأخيرات، وحساب المسار الحرج (Critical Path) آلياً
          </p>
        </div>

        {userPermissions.canManageGantt && (
          <button
            onClick={() => {
              setTaskToEdit(null);
              setTaskModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مهمة جديدة</span>
          </button>
        )}
      </div>

      {/* KPI Cards for Gantt Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="إجمالي المهام والمراحل"
          value={calculatedTasks.length.toString()}
          subtitle="مهام المشروع المجدولة"
          icon={Calendar}
        />
        <StatCard
          title="مهام على المسار الحرج (Critical)"
          value={criticalTasksCount.toString()}
          subtitle="أي تأخير يؤخر تسليم المشروع"
          variant="warning"
          badge="حرج"
          badgeType="warning"
        />
        <StatCard
          title="مهام متأخرة عن الجدول"
          value={delayedTasksCount.toString()}
          subtitle="تجاوزت موعد النهاية"
          variant={delayedTasksCount > 0 ? 'danger' : 'default'}
          badge={delayedTasksCount > 0 ? 'تنبيه' : 'منتظم'}
          badgeType={delayedTasksCount > 0 ? 'negative' : 'positive'}
        />
        <StatCard
          title="المهام المنجزة بالكامل"
          value={completedTasksCount.toString()}
          subtitle={`من أصل ${calculatedTasks.length} مهمة`}
          variant="highlight"
        />
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 flex-wrap">
        {/* Project Selector & Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <div className="w-full sm:w-64">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              {db.projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في مهام المشروع..."
              className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* View toggles: Critical Path, Delays, Timescale */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
          {/* Critical Path Toggle Button */}
          <button
            onClick={() => setHighlightCriticalPath(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              highlightCriticalPath
                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>إبراز المسار الحرج (Critical Path)</span>
          </button>

          {/* Show Delays Only */}
          <button
            onClick={() => setShowDelaysOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              showDelaysOnly
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>المتأخرة فقط</span>
          </button>

          {/* Timescale Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTimeScale('days')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeScale === 'days' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              أيام
            </button>
            <button
              onClick={() => setTimeScale('weeks')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeScale === 'weeks' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              أسابيع
            </button>
            <button
              onClick={() => setTimeScale('months')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeScale === 'months' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              شهور
            </button>
          </div>
        </div>
      </div>

      {/* Critical Path Notice Bar */}
      {highlightCriticalPath && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>المسار الحرج (Critical Path):</strong> محدد باللون الأحمر المتوهج. هذه المهام مدتها الصفرية (Slack = 0)؛ وأي تأخير في أي منها يؤدي مباشرة لتأخير تاريخ تسليم المشروع النهائي.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-rose-200">
            {criticalTasksCount} مهام حرجة
          </span>
        </div>
      )}

      {/* Main Gantt Timeline Container */}
      {calculatedTasks.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-bold text-slate-700">لا توجد مهام مسجلة لهذا المشروع بعد</p>
          <p className="text-xs text-slate-500 mt-1">
            أضف مهام المشروع وحدد التواريخ والتبعيات لحساب المسار الحرج
          </p>
          {userPermissions.canManageGantt && (
            <button
              onClick={() => {
                setTaskToEdit(null);
                setTaskModalOpen(true);
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              إضافة المهمة الأولى
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Timeline Scrollable Viewport */}
          <div className="overflow-x-auto">
            <div
              className="flex min-w-max relative"
              style={{ minWidth: `${360 + totalDays * dayColWidth}px` }}
            >
              {/* Left Fixed Task Details Column */}
              <div className="w-80 sm:w-96 shrink-0 bg-slate-50 border-l border-slate-200 z-20">
                {/* Header of Table */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 font-bold text-xs text-slate-700">
                  <span>اسم المهمة والمرحلة</span>
                  <span className="text-[10px] text-slate-400">الإنجاز / المسؤول</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-200/70">
                  {visibleTasks.map((task, index) => {
                    const member = db.teamMembers.find(m => m.id === task.assignedMemberId);
                    const isUserAssigned = currentUser.role === 'team_member' && currentUser.teamMemberId === task.assignedMemberId;

                    return (
                      <div
                        key={task.id}
                        className={`h-14 px-3 flex items-center justify-between text-xs transition-colors ${
                          isUserAssigned
                            ? 'bg-amber-50/70 border-r-4 border-amber-500'
                            : task.isCritical && highlightCriticalPath
                            ? 'bg-rose-50/40'
                            : 'hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {task.isCritical && highlightCriticalPath && (
                              <span title="مهمة على المسار الحرج">
                                <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              </span>
                            )}
                            <span
                              className={`font-semibold truncate ${task.isCritical && highlightCriticalPath ? 'text-rose-950 font-bold' : 'text-slate-900'}`}
                              title={task.title}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                            <span>{task.durationDays} يوم</span>
                            <span>·</span>
                            <span>{formatDate(task.startDate)}</span>
                            {task.isDelayed && (
                              <span className="text-rose-600 font-bold">
                                متأخرة ({task.daysDelayed} يوم)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assignee & Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(() => {
                            const statusInfo = getTaskStatusInfo(task.status);
                            return (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border hidden sm:inline-flex items-center gap-1 ${statusInfo.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                                <span>{statusInfo.emoji} {statusInfo.label}</span>
                              </span>
                            );
                          })()}

                          {member && (
                            <span
                              className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 truncate max-w-[80px]"
                              title={member.name}
                            >
                              {member.name.split(' ')[0]}
                            </span>
                          )}

                          <span className="font-mono text-[11px] font-bold text-emerald-800 w-8 text-left">
                            {task.progress}%
                          </span>

                          {userPermissions.canManageGantt && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  setTaskToEdit(task);
                                  setTaskModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-200"
                                title="تعديل المهمة"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setTaskToDelete(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                title="حذف المهمة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Gantt SVG Canvas Timeline */}
              <div className="flex-1 relative bg-white">
                {/* Timeline Header (Dates) */}
                <div className="h-12 border-b border-slate-200 flex bg-slate-50/80 sticky top-0 z-10">
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const d = new Date(timelineStart);
                    d.setDate(d.getDate() + i);
                    const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Friday/Saturday weekend in Saudi Arabia
                    const isToday = d.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={i}
                        className={`shrink-0 border-l border-slate-200/60 flex flex-col items-center justify-center text-[10px] select-none ${
                          isToday ? 'bg-emerald-100/60 font-bold text-emerald-900' : isWeekend ? 'bg-slate-100/40 text-slate-400' : 'text-slate-600'
                        }`}
                        style={{ width: `${dayColWidth}px` }}
                      >
                        <span className="font-mono">{d.getDate()}</span>
                        <span className="text-[9px] text-slate-400">
                          {d.toLocaleDateString('ar-SA', { month: 'narrow' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* SVG Overlay for Dependency Curves */}
                <svg
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{ top: '48px', width: `${totalDays * dayColWidth}px`, height: `${visibleTasks.length * 56}px` }}
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#e11d48" />
                    </marker>
                  </defs>

                  {/* Render Dependencies Arrows */}
                  {visibleTasks.map((task, taskIdx) => {
                    return (task.dependencies || []).map(depId => {
                      const predIdx = visibleTasks.findIndex(t => t.id === depId);
                      if (predIdx === -1) return null;
                      const predTask = visibleTasks[predIdx];

                      const predEndX = getXOffset(predTask.endDate);
                      const predY = predIdx * 56 + 28;
                      const succStartX = getXOffset(task.startDate);
                      const succY = taskIdx * 56 + 28;

                      const isCriticalLink = highlightCriticalPath && predTask.isCritical && task.isCritical;

                      // Cubic Bezier curve connecting predecessor end to successor start
                      const midX = (predEndX + succStartX) / 2;
                      const pathData = `M ${predEndX} ${predY} C ${midX} ${predY}, ${midX} ${succY}, ${succStartX} ${succY}`;

                      return (
                        <path
                          key={`${depId}->${task.id}`}
                          d={pathData}
                          fill="none"
                          stroke={isCriticalLink ? '#e11d48' : '#94a3b8'}
                          strokeWidth={isCriticalLink ? '2' : '1.5'}
                          strokeDasharray={isCriticalLink ? 'none' : '3 3'}
                          markerEnd={isCriticalLink ? 'url(#arrow-critical)' : 'url(#arrow)'}
                        />
                      );
                    });
                  })}
                </svg>

                {/* Timeline Grid Background */}
                <div className="relative divide-y divide-slate-100">
                  {visibleTasks.map((task, rowIdx) => {
                    const left = getXOffset(task.startDate);
                    const width = getWidth(task.startDate, task.endDate, task.isMilestone);
                    const isCritical = task.isCritical && highlightCriticalPath;

                    return (
                      <div
                        key={task.id}
                        className="h-14 relative flex items-center group hover:bg-slate-50/50 transition-colors"
                        style={{ width: `${totalDays * dayColWidth}px` }}
                      >
                        {/* Day Grid Lines */}
                        {Array.from({ length: totalDays }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ right: `${i * dayColWidth}px`, width: `${dayColWidth}px` }}
                          />
                        ))}

                        {/* Red Line for Today */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-10 pointer-events-none"
                          style={{ right: `${todayX}px` }}
                          title="اليوم"
                        />

                        {/* Gantt Task Bar / Diamond */}
                        {task.isMilestone ? (
                          // Milestone Diamond
                          <div
                            className="absolute z-20 transform -translate-x-1/2 cursor-pointer transition-transform hover:scale-125"
                            style={{ right: `${left}px` }}
                            title={`علامة فارقة: ${task.title}`}
                            onClick={() => {
                              if (userPermissions.canManageGantt) {
                                setTaskToEdit(task);
                                setTaskModalOpen(true);
                              }
                            }}
                          >
                            <div className="w-5 h-5 bg-amber-500 rotate-45 border-2 border-white shadow-md flex items-center justify-center" />
                          </div>
                        ) : (
                          // Standard Task Bar
                          <div
                            className={`absolute h-7 rounded-md shadow-xs z-20 flex items-center overflow-hidden transition-all duration-200 cursor-pointer ${
                              isCritical
                                ? 'ring-2 ring-rose-500 shadow-rose-200 shadow-md animate-pulse-subtle'
                                : 'hover:ring-2 hover:ring-emerald-400'
                            } ${
                              task.status === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : task.status === 'delayed'
                                ? 'bg-rose-600 text-white'
                                : task.status === 'in_progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-300 text-slate-800'
                            }`}
                            style={{
                              right: `${left}px`,
                              width: `${Math.max(dayColWidth, width)}px`,
                            }}
                            title={`${task.title} · ${task.progress}% مكتمل · ${task.durationDays} يوم · ${isCritical ? 'على المسار الحرج' : `سماحية: ${task.slack} يوم`}`}
                            onClick={() => {
                              if (userPermissions.canManageGantt) {
                                setTaskToEdit(task);
                                setTaskModalOpen(true);
                              }
                            }}
                          >
                            {/* Internal Progress Fill Bar */}
                            <div
                              className="absolute top-0 bottom-0 right-0 bg-black/20 transition-all duration-300 pointer-events-none"
                              style={{ width: `${task.progress}%` }}
                            />

                            {/* Label inside bar */}
                            <div className="relative px-2 text-[10px] font-medium truncate flex items-center justify-between w-full z-10">
                              <span className="truncate">{task.title}</span>
                              <span className="font-mono text-[9px] opacity-90 mr-1">{task.progress}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Footer Legend */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600" />
                <span>مكتملة (100%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600" />
                <span>قيد التنفيذ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-600" />
                <span>متأخرة عن الجدول</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-300" />
                <span>لم تبدأ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-500 rotate-45 border border-white" />
                <span>علامة فارقة (Milestone)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 border-rose-500 bg-rose-50" />
                <span>مسار حرج (Critical Path)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              المسار الحرج: {criticalTasksCount} من {calculatedTasks.length} مهام
            </div>
          </div>
        </div>
      )}

      {/* Task Modal (Add/Edit) */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        defaultProjectId={selectedProjectId}
        taskToEdit={taskToEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) deleteTask(taskToDelete);
        }}
        title="حذف المهمة من المخطط"
        message="هل أنت متأكد من حذف هذه المهمة؟ سيتم إزالتها وتحديث كافة التبعيات والمسار الحرج آلياً."
      />
    </div>
  );
};
