import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  Briefcase,
  Receipt,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
  TrendingUp,
  Hourglass,
  Layers,
  Sparkles,
  Milestone as MilestoneIcon,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Project, ProjectTask, TeamMember, CalculatedInvoice, Currency } from '../../types';
import { formatDate, formatCurrency, PROJECT_STATUS_MAP } from '../../utils/formatters';

export type MilestoneType = 'kickoff' | 'task' | 'milestone' | 'financial' | 'delivery';
export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming' | 'delayed';

export interface TimelineMilestone {
  id: string;
  title: string;
  type: MilestoneType;
  typeLabel: string;
  date: string; // Target or effective date (YYYY-MM-DD)
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  status: MilestoneStatus;
  progress: number; // 0 - 100
  isKeyMilestone: boolean;
  assignedMemberName?: string;
  notes?: string;
  amount?: number;
  currency?: Currency;
  metaBadge?: string;
  sourceTaskId?: string;
  sourceInvoiceId?: string;
}

interface ProjectStatusTimelineProps {
  project: Project;
  tasks: ProjectTask[];
  teamMembers: TeamMember[];
  invoices?: CalculatedInvoice[];
  onNavigateToGantt?: () => void;
  onNavigateToInvoices?: () => void;
  compact?: boolean;
}

/**
 * Calculates day difference between two dates (d2 - d1)
 */
function getDaysDiff(d1: string | Date, d2: string | Date): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Formats relative days into friendly Arabic text
 */
function formatRelativeDays(targetDateStr: string): { text: string; isPast: boolean; isToday: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diff = getDaysDiff(today, target);

  if (diff === 0) {
    return { text: 'اليوم', isPast: false, isToday: true };
  } else if (diff < 0) {
    const abs = Math.abs(diff);
    return { text: `منجز منذ ${abs} ${abs === 1 ? 'يوم' : abs === 2 ? 'يومين' : abs <= 10 ? 'أيام' : 'يوماً'}`, isPast: true, isToday: false };
  } else {
    return { text: `متبقي ${diff} ${diff === 1 ? 'يوم' : diff === 2 ? 'يومين' : diff <= 10 ? 'أيام' : 'يوماً'}`, isPast: false, isToday: false };
  }
}

/**
 * Extracts and synthesizes all chronological project milestones
 */
export function extractProjectMilestones(
  project: Project,
  tasks: ProjectTask[],
  teamMembers: TeamMember[],
  invoices?: CalculatedInvoice[]
): TimelineMilestone[] {
  const milestones: TimelineMilestone[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);

  // 1. Kickoff & Contract Inception Milestone
  const isStarted = today >= projectStart || project.status === 'in_progress' || project.status === 'completed';
  milestones.push({
    id: `ms-kickoff-${project.id}`,
    title: 'انطلاق المشروع وتوقيع العقد الرسمي',
    type: 'kickoff',
    typeLabel: 'انطلاق وتعاقد',
    date: project.startDate,
    startDate: project.startDate,
    endDate: project.startDate,
    durationDays: 1,
    status: isStarted ? 'completed' : 'upcoming',
    progress: isStarted ? 100 : 0,
    isKeyMilestone: true,
    amount: project.contractValue,
    currency: project.currency,
    metaBadge: 'اعتماد التعاقد',
    notes: project.description || `توقيع عقد المشروع بقيمة ${project.contractValue.toLocaleString()} ${project.currency} واعتماد خطة العمل المبدئية.`,
  });

  // 2. Extract Tasks from db.tasks
  const projectTasks = tasks.filter(t => t.projectId === project.id);

  if (projectTasks.length > 0) {
    projectTasks.forEach(task => {
      const assigned = teamMembers.find(m => m.id === task.assignedMemberId);
      const taskEndDate = new Date(task.endDate);

      let status: MilestoneStatus = 'upcoming';
      if (task.progress === 100 || task.status === 'completed') {
        status = 'completed';
      } else if (task.status === 'delayed' || (today > taskEndDate && task.progress < 100)) {
        status = 'delayed';
      } else if (task.progress > 0 || (today >= new Date(task.startDate) && today <= taskEndDate)) {
        status = 'in_progress';
      }

      milestones.push({
        id: `ms-task-${task.id}`,
        title: task.title,
        type: task.isMilestone ? 'milestone' : 'task',
        typeLabel: task.isMilestone ? 'علامة فارقة' : 'مرحلة تنفيذية',
        date: task.endDate,
        startDate: task.startDate,
        endDate: task.endDate,
        durationDays: task.durationDays,
        status,
        progress: task.progress,
        isKeyMilestone: Boolean(task.isMilestone),
        assignedMemberName: assigned?.name,
        notes: task.notes,
        sourceTaskId: task.id,
      });
    });
  } else {
    // If no granular tasks exist yet, synthesize standard engineering phases
    const totalDays = Math.max(1, getDaysDiff(projectStart, projectEnd));
    const step1Date = new Date(projectStart.getTime() + (totalDays * 0.25) * 86400000).toISOString().split('T')[0];
    const step2Date = new Date(projectStart.getTime() + (totalDays * 0.55) * 86400000).toISOString().split('T')[0];
    const step3Date = new Date(projectStart.getTime() + (totalDays * 0.80) * 86400000).toISOString().split('T')[0];

    const isStep1Done = project.status === 'completed' || (project.status === 'in_progress' && today >= new Date(step1Date));
    const isStep2Done = project.status === 'completed' || (project.status === 'in_progress' && today >= new Date(step2Date));
    const isStep3Done = project.status === 'completed' || (project.status === 'in_progress' && today >= new Date(step3Date));

    milestones.push({
      id: `ms-synth-1-${project.id}`,
      title: 'تحليل المتطلبات وتوثيق النطاق الهندسي',
      type: 'task',
      typeLabel: 'مرحلة هندسية',
      date: step1Date,
      startDate: project.startDate,
      endDate: step1Date,
      durationDays: Math.round(totalDays * 0.25),
      status: isStep1Done ? 'completed' : project.status === 'in_progress' ? 'in_progress' : 'upcoming',
      progress: isStep1Done ? 100 : project.status === 'in_progress' ? 60 : 0,
      isKeyMilestone: true,
      notes: 'إعداد واعتماد مخططات النطاق والتجهيزات الأساسية.',
    });

    milestones.push({
      id: `ms-synth-2-${project.id}`,
      title: 'التنفيذ الأساسي للأعمال والتوريدات',
      type: 'task',
      typeLabel: 'مرحلة تنفيذية',
      date: step2Date,
      startDate: step1Date,
      endDate: step2Date,
      durationDays: Math.round(totalDays * 0.30),
      status: isStep2Done ? 'completed' : isStep1Done ? 'in_progress' : 'upcoming',
      progress: isStep2Done ? 100 : isStep1Done ? 45 : 0,
      isKeyMilestone: false,
      notes: 'تطبيق وبناء مخرجات المشروع الرئيسية واكتمال الهياكل.',
    });

    milestones.push({
      id: `ms-synth-3-${project.id}`,
      title: 'الاختبارات التشغيلية وضبط الجودة والفحص',
      type: 'milestone',
      typeLabel: 'علامة فارقة',
      date: step3Date,
      startDate: step2Date,
      endDate: step3Date,
      durationDays: Math.round(totalDays * 0.25),
      status: isStep3Done ? 'completed' : isStep2Done ? 'in_progress' : 'upcoming',
      progress: isStep3Done ? 100 : isStep2Done ? 30 : 0,
      isKeyMilestone: true,
      notes: 'فحص معايير الجودة والسلامة ومطابقة المواصفات الفنية.',
    });
  }

  // 3. Extract Key Invoices Milestones (Advance & Settlement)
  if (invoices && invoices.length > 0) {
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
    
    // First invoice (Advance / Kickoff billing)
    const firstInv = sortedInvoices[0];
    if (firstInv) {
      milestones.push({
        id: `ms-inv-${firstInv.id}`,
        title: `دفعة الفاتورة (${firstInv.invoiceNumber})`,
        type: 'financial',
        typeLabel: 'محطة مالية',
        date: firstInv.issueDate,
        startDate: firstInv.issueDate,
        endDate: firstInv.dueDate,
        status: firstInv.status === 'paid' ? 'completed' : firstInv.status === 'overdue' ? 'delayed' : 'in_progress',
        progress: firstInv.paidAmount && firstInv.totalAmount ? Math.min(100, Math.round((firstInv.paidAmount / firstInv.totalAmount) * 100)) : 0,
        isKeyMilestone: false,
        amount: firstInv.totalAmount,
        currency: firstInv.currency || project.currency,
        metaBadge: firstInv.status === 'paid' ? 'مسددة بالكامل' : firstInv.status === 'partially_paid' ? 'مسددة جزئياً' : 'قيد التحصيل',
        notes: firstInv.notes || `فاتورة مستحقة بقيمة ${firstInv.totalAmount.toLocaleString()} ${firstInv.currency || project.currency}`,
        sourceInvoiceId: firstInv.id,
      });
    }

    // If there is more than 1 invoice, include the final/latest one
    if (sortedInvoices.length > 1) {
      const lastInv = sortedInvoices[sortedInvoices.length - 1];
      milestones.push({
        id: `ms-inv-${lastInv.id}`,
        title: `فاتورة التسوية الختامية (${lastInv.invoiceNumber})`,
        type: 'financial',
        typeLabel: 'محطة مالية',
        date: lastInv.issueDate,
        startDate: lastInv.issueDate,
        endDate: lastInv.dueDate,
        status: lastInv.status === 'paid' ? 'completed' : lastInv.status === 'overdue' ? 'delayed' : 'in_progress',
        progress: lastInv.paidAmount && lastInv.totalAmount ? Math.min(100, Math.round((lastInv.paidAmount / lastInv.totalAmount) * 100)) : 0,
        isKeyMilestone: true,
        amount: lastInv.totalAmount,
        currency: lastInv.currency || project.currency,
        metaBadge: lastInv.status === 'paid' ? 'تمت التصفية' : 'مطالبة جارية',
        notes: lastInv.notes || 'فاتورة التسليم النهائي وإغلاق المستحقات التعاقدية.',
        sourceInvoiceId: lastInv.id,
      });
    }
  }

  // 4. Final Delivery & Project Commissioning Milestone
  const isCompleted = project.status === 'completed';
  const isOverdue = !isCompleted && today > projectEnd;
  const inProgressNearEnd = project.status === 'in_progress' && (today >= new Date(projectEnd.getTime() - 14 * 86400000));

  milestones.push({
    id: `ms-delivery-${project.id}`,
    title: 'التسليم النهائي، الفحص الفني، والإغلاق التعاقدي',
    type: 'delivery',
    typeLabel: 'تسليم ختامي',
    date: project.endDate,
    startDate: project.endDate,
    endDate: project.endDate,
    durationDays: 1,
    status: isCompleted ? 'completed' : isOverdue ? 'delayed' : inProgressNearEnd ? 'in_progress' : 'upcoming',
    progress: isCompleted ? 100 : 0,
    isKeyMilestone: true,
    metaBadge: 'الإغلاق والاعتماد',
    notes: 'التسليم الرسمي للمشروع، نقل الملكية التشغيلية للعميل، وتوثيق محضر الاستلام النهائي.',
  });

  // Sort chronologically by date
  return milestones.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    // Secondary tie-breaker: kickoff first, delivery last
    if (a.type === 'kickoff') return -1;
    if (b.type === 'kickoff') return 1;
    if (a.type === 'delivery') return 1;
    if (b.type === 'delivery') return -1;
    return 0;
  });
}

export const ProjectStatusTimeline: React.FC<ProjectStatusTimelineProps> = ({
  project,
  tasks,
  teamMembers,
  invoices,
  onNavigateToGantt,
  onNavigateToInvoices,
  compact = false,
}) => {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'milestones_only' | 'tasks' | 'financial'>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const milestones = useMemo(() => {
    return extractProjectMilestones(project, tasks, teamMembers, invoices);
  }, [project, tasks, teamMembers, invoices]);

  // Overall Timeline Calculations
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(project.startDate);
    const end = new Date(project.endDate);

    const totalDays = Math.max(1, getDaysDiff(start, end));
    const elapsedDays = Math.min(totalDays, Math.max(0, getDaysDiff(start, today)));
    const remainingDays = getDaysDiff(today, end);
    const timeElapsedPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const delayedMilestones = milestones.filter(m => m.status === 'delayed').length;
    const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;

    // Average progress
    const avgProgress = milestones.length > 0
      ? Math.round(milestones.reduce((acc, m) => acc + m.progress, 0) / milestones.length)
      : (project.status === 'completed' ? 100 : 0);

    // Schedule health diagnosis
    let healthLabel = 'ضمن الجدول الزمني المعتمد';
    let healthType: 'healthy' | 'warning' | 'delayed' | 'completed' = 'healthy';

    if (project.status === 'completed') {
      healthLabel = 'تم الإنجاز والإغلاق بنجاح';
      healthType = 'completed';
    } else if (project.status === 'on_hold') {
      healthLabel = 'المشروع معلق مؤقتاً';
      healthType = 'warning';
    } else if (remainingDays < 0 || delayedMilestones > 0) {
      healthLabel = `تأخر عن الجدول الزمني (${Math.abs(remainingDays)} يوم)`;
      healthType = 'delayed';
    } else if (timeElapsedPercent > avgProgress + 20) {
      healthLabel = 'انحراف زمني ملحوظ عن وتيرة الإنجاز';
      healthType = 'warning';
    } else {
      healthLabel = 'متقدم ومطابق للمسار المعتمد';
      healthType = 'healthy';
    }

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      timeElapsedPercent,
      completedMilestones,
      delayedMilestones,
      inProgressMilestones,
      totalMilestones: milestones.length,
      avgProgress,
      healthLabel,
      healthType,
    };
  }, [project, milestones]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    if (filterType === 'milestones_only') {
      return milestones.filter(m => m.isKeyMilestone || m.type === 'kickoff' || m.type === 'delivery');
    }
    if (filterType === 'tasks') {
      return milestones.filter(m => m.type === 'task' || m.type === 'milestone');
    }
    if (filterType === 'financial') {
      return milestones.filter(m => m.type === 'financial' || m.amount !== undefined);
    }
    return milestones;
  }, [milestones, filterType]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const statusMeta = PROJECT_STATUS_MAP[project.status];

  return (
    <div className="space-y-4 text-right">
      {/* 1. Header & Live Timeline Status Card */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg shrink-0">
              <MilestoneIcon className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  المسار الزمني لحالة المشروع ومحطاته الرئيسية
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                  {statusMeta.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  stats.healthType === 'completed'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : stats.healthType === 'healthy'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : stats.healthType === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {stats.healthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة تسلسل الإنجاز والتواريخ المعتمدة المستخرجة من عقود ومهام وفواتير المشروع
              </p>
            </div>
          </div>

          {onNavigateToGantt && (
            <button
              type="button"
              onClick={onNavigateToGantt}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>مخطط جانت الكامل</span>
            </button>
          )}
        </div>

        {/* Timeline Key Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>المدة التعاقدية</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-900">
              {stats.totalDays} يوم
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {formatDate(project.startDate)} ← {formatDate(project.endDate)}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>الأيام المنقضية والمتبقية</span>
              <Hourglass className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-900">
              {stats.elapsedDays} يوم <span className="text-xs font-normal text-slate-500">({stats.timeElapsedPercent}%)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stats.remainingDays < 0 ? (
                <span className="text-rose-600 font-bold">تجاوز الموعد بـ {Math.abs(stats.remainingDays)} يوم</span>
              ) : (
                <span>متبقي {stats.remainingDays} يوم حتى التسليم</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>محطات المشروع المنجزة</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-900">
              {stats.completedMilestones} <span className="text-xs font-normal text-slate-500">من أصل {stats.totalMilestones}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stats.inProgressMilestones > 0 && <span className="text-blue-700">{stats.inProgressMilestones} جارية</span>}
              {stats.delayedMilestones > 0 && <span className="text-rose-700 font-semibold mr-1">· {stats.delayedMilestones} متأخرة</span>}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>متوسط إنجاز الأعمال</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold font-mono text-emerald-800">
              {stats.avgProgress}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              مقابل {stats.timeElapsedPercent}% استهلاك زمني
            </div>
          </div>
        </div>

        {/* Dual Progress Track (Time vs Work) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px] text-slate-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>إنجاز المهام: <strong className="font-mono text-slate-900">{stats.avgProgress}%</strong></span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span>الزمن المستهلك: <strong className="font-mono text-slate-700">{stats.timeElapsedPercent}%</strong></span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {stats.avgProgress >= stats.timeElapsedPercent ? 'وتيرة الإنجاز متقدمة' : 'فارق زمني طفيف'}
            </span>
          </div>

          <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
            {/* Background time consumption line */}
            <div
              className="absolute top-0 right-0 h-full bg-slate-200/80 rounded-full transition-all duration-500"
              style={{ width: `${stats.timeElapsedPercent}%` }}
              title={`الزمن المستهلك: ${stats.timeElapsedPercent}%`}
            />
            {/* Foreground work execution line */}
            <div
              className="relative h-full bg-gradient-to-l from-emerald-500 to-teal-600 rounded-full transition-all duration-700 shadow-xs"
              style={{ width: `${stats.avgProgress}%` }}
              title={`نسبة الإنجاز الفعلي: ${stats.avgProgress}%`}
            />
          </div>
        </div>
      </div>

      {/* 2. Interactive Horizontal Step Roadmap */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold text-slate-900">المسار التفاعلي للمحطات (Milestone Stepper)</h4>
          </div>
          <span className="text-[11px] text-slate-500">انقر على أي محطة للانتقال لتفاصيلها</span>
        </div>

        {/* Scrollable Horizontal Stepper Track */}
        <div className="overflow-x-auto pb-3 pt-2">
          <div className="flex items-start min-w-[650px] relative px-4">
            {milestones.map((m, index) => {
              const isSelected = selectedMilestoneId === m.id;
              const isLast = index === milestones.length - 1;
              const nextM = !isLast ? milestones[index + 1] : null;
              const lineCompleted = m.status === 'completed' && nextM && nextM.status === 'completed';

              return (
                <div key={m.id} className="flex-1 flex flex-col items-center relative group">
                  {/* Connecting Line to next node */}
                  {!isLast && (
                    <div
                      className={`absolute top-4 left-0 right-1/2 h-0.5 -z-0 transition-colors ${
                        lineCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                  {index > 0 && (
                    <div
                      className={`absolute top-4 right-0 left-1/2 h-0.5 -z-0 transition-colors ${
                        m.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Node Circle */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMilestoneId(m.id);
                      const el = document.getElementById(`milestone-card-${m.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'ring-4 ring-emerald-200 scale-110'
                        : 'hover:scale-105'
                    } ${
                      m.status === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : m.status === 'delayed'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : m.status === 'in_progress'
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                        : 'bg-white border-2 border-slate-300 text-slate-500 hover:border-slate-400'
                    }`}
                    title={`${m.title} (${m.status})`}
                  >
                    {m.status === 'completed' ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : m.status === 'delayed' ? (
                      <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                    ) : m.status === 'in_progress' ? (
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span className="text-[11px] font-mono font-bold">{index + 1}</span>
                    )}
                  </button>

                  {/* Node Caption */}
                  <div className="mt-2 text-center px-1 max-w-[130px]">
                    <div className={`text-[11px] font-bold line-clamp-2 leading-tight ${
                      isSelected ? 'text-emerald-800' : 'text-slate-800'
                    }`}>
                      {m.title}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 whitespace-nowrap">
                      {formatDate(m.date)}
                    </div>
                    <div className="mt-0.5">
                      <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        m.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : m.status === 'delayed'
                          ? 'bg-rose-50 text-rose-700'
                          : m.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Filter Controls & Milestone Cards List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع المحطات ({milestones.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('milestones_only')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                filterType === 'milestones_only'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المعالم الفارقة ({milestones.filter(m => m.isKeyMilestone).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('tasks')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                filterType === 'tasks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المراحل التنفيذية ({milestones.filter(m => m.type === 'task' || m.type === 'milestone').length})
            </button>
            {invoices && invoices.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('financial')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                  filterType === 'financial'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المحطات المالية ({milestones.filter(m => m.type === 'financial' || m.amount).length})
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {filteredMilestones.length} محطة معروضة
          </span>
        </div>

        {/* Detailed Vertical Timeline Spine & Cards */}
        <div className="relative pr-6 space-y-3 before:absolute before:top-3 before:bottom-3 before:right-2.5 before:w-0.5 before:bg-slate-200">
          {filteredMilestones.map((m, index) => {
            const isSelected = selectedMilestoneId === m.id;
            const isExpanded = expandedCards[m.id] !== false; // default expanded
            const relativeTime = formatRelativeDays(m.date);

            return (
              <div
                key={m.id}
                id={`milestone-card-${m.id}`}
                className={`relative transition-all duration-200 ${
                  isSelected ? 'scale-[1.01]' : ''
                }`}
              >
                {/* Node icon on the vertical timeline spine */}
                <div
                  className={`absolute -right-6 top-3 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center transition-all ${
                    m.status === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : m.status === 'delayed'
                      ? 'bg-rose-600 text-white'
                      : m.status === 'in_progress'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {m.status === 'completed' ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : m.status === 'delayed' ? (
                    <AlertTriangle className="w-2.5 h-2.5 stroke-[3]" />
                  ) : m.status === 'in_progress' ? (
                    <Clock className="w-2.5 h-2.5" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>

                {/* Milestone Card */}
                <div
                  className={`p-3.5 bg-white rounded-xl border transition-all shadow-2xs ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{index + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {m.title}
                      </h4>

                      {/* Type Label */}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        m.type === 'kickoff'
                          ? 'bg-slate-100 text-slate-700'
                          : m.type === 'milestone'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : m.type === 'financial'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'delivery'
                          ? 'bg-purple-100 text-purple-800 font-bold'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.typeLabel}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        m.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'delayed'
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : m.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.status === 'completed'
                          ? 'مكتملة'
                          : m.status === 'delayed'
                          ? 'متأخرة عن الموعد'
                          : m.status === 'in_progress'
                          ? 'قيد التنفيذ'
                          : 'مرحلة قادمة'}
                      </span>

                      {m.metaBadge && (
                        <span className="text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded bg-slate-50">
                          {m.metaBadge}
                        </span>
                      )}
                    </div>

                    {/* Target Date & Relative Time */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(m.date)}</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        relativeTime.isPast
                          ? 'bg-slate-100 text-slate-600'
                          : relativeTime.isToday
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {relativeTime.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(m.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                        title={isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600 animate-in fade-in duration-150">
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">نسبة الإنجاز في هذه المحطة</span>
                          <span className="font-mono font-bold text-slate-900">{m.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              m.status === 'completed'
                                ? 'bg-emerald-600'
                                : m.status === 'delayed'
                                ? 'bg-rose-600'
                                : m.status === 'in_progress'
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Notes & Description */}
                      {m.notes && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px] leading-relaxed border border-slate-150">
                          {m.notes}
                        </p>
                      )}

                      {/* Metadata Row: Assigned Member, Duration, Amounts */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500 pt-0.5">
                        {m.startDate && m.endDate && m.startDate !== m.endDate && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">الفترة:</span>
                            <span className="font-mono text-slate-700">
                              من {formatDate(m.startDate)} إلى {formatDate(m.endDate)}
                            </span>
                          </div>
                        )}

                        {m.durationDays && m.durationDays > 1 && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">المدة:</span>
                            <span className="font-mono font-bold text-slate-700">{m.durationDays} يوم</span>
                          </div>
                        )}

                        {m.assignedMemberName && (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400">المسؤول:</span>
                            <span className="font-medium text-slate-800">{m.assignedMemberName}</span>
                          </div>
                        )}

                        {m.amount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-slate-400">المبلغ:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatCurrency(m.amount, m.currency || project.currency)}
                            </span>
                          </div>
                        )}

                        {/* Quick links to Gantt / Invoice */}
                        {m.sourceTaskId && onNavigateToGantt && (
                          <button
                            type="button"
                            onClick={onNavigateToGantt}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline mr-auto font-medium"
                          >
                            عرض بالمخطط ←
                          </button>
                        )}
                        {m.sourceInvoiceId && onNavigateToInvoices && (
                          <button
                            type="button"
                            onClick={onNavigateToInvoices}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline mr-auto font-medium"
                          >
                            عرض الفاتورة ←
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
