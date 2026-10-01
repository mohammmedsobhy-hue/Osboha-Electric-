import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Receipt,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Project, Client } from '../../types';
import { ProjectFinancials } from '../../types';
import { formatCurrency, formatSAR, formatPercent } from '../../utils/formatters';

export interface BudgetAlertItem {
  project: Project;
  client?: Client;
  financials: ProjectFinancials;
  approvedBudget: number;
  totalExpenses: number;
  usagePercent: number;
  remainingBudget: number;
  isOverBudget: boolean;
  severity: 'critical' | 'warning' | 'caution';
  severityLabel: string;
  message: string;
}

interface BudgetAlertsWidgetProps {
  projects: Project[];
  allProjectFinancials: Map<string, ProjectFinancials>;
  clients: Client[];
  onSelectProject: (projectId: string) => void;
  onOpenQuickAction?: (actionType: 'expense') => void;
  defaultThreshold?: number; // e.g., 80
}

export const BudgetAlertsWidget: React.FC<BudgetAlertsWidgetProps> = ({
  projects,
  allProjectFinancials,
  clients,
  onSelectProject,
  onOpenQuickAction,
  defaultThreshold = 80,
}) => {
  const [warningThreshold, setWarningThreshold] = useState<number>(defaultThreshold);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning'>('all');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Compute all budget alerts based on current threshold
  const alerts: BudgetAlertItem[] = useMemo(() => {
    const list: BudgetAlertItem[] = [];

    projects.forEach(project => {
      const approvedBudget = project.approvedBudget || 0;
      if (approvedBudget <= 0) return; // Skip projects with no approved budget defined

      const fin = allProjectFinancials.get(project.id);
      const totalExpenses = fin?.totalExpenses || 0;
      const usagePercent = (totalExpenses / approvedBudget) * 100;
      const remainingBudget = approvedBudget - totalExpenses;
      const client = clients.find(c => c.id === project.clientId);

      // 1. Critical: Exceeded 100% of approved budget
      if (usagePercent >= 100) {
        list.push({
          project,
          client,
          financials: fin!,
          approvedBudget,
          totalExpenses,
          usagePercent,
          remainingBudget,
          isOverBudget: true,
          severity: 'critical',
          severityLabel: 'تجاوز الميزانية المعتمدة',
          message: `تخطت المصروفات سقف الميزانية بنسبة ${usagePercent.toFixed(1)}% بعجز قدره ${formatCurrency(Math.abs(remainingBudget), project.currency || 'SAR')}`,
        });
      }
      // 2. Warning: Approaching the threshold (e.g. >= 80% and < 100%)
      else if (usagePercent >= warningThreshold) {
        list.push({
          project,
          client,
          financials: fin!,
          approvedBudget,
          totalExpenses,
          usagePercent,
          remainingBudget,
          isOverBudget: false,
          severity: 'warning',
          severityLabel: 'اقتراب من نفاد الميزانية',
          message: `تم استهلاك ${usagePercent.toFixed(1)}% من الميزانية المعتمدة، والمتبقي فقط ${formatCurrency(remainingBudget, project.currency || 'SAR')} قبل بلوغ السقف المحدد`,
        });
      }
    });

    // Sort: Critical first, then by usage percentage descending
    return list.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return b.usagePercent - a.usagePercent;
    });
  }, [projects, allProjectFinancials, clients, warningThreshold]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const filteredAlerts = useMemo(() => {
    if (filterSeverity === 'critical') return alerts.filter(a => a.severity === 'critical');
    if (filterSeverity === 'warning') return alerts.filter(a => a.severity === 'warning');
    return alerts;
  }, [alerts, filterSeverity]);

  // If dismissed temporarily, render a minimized restore button
  if (isDismissed && alerts.length > 0) {
    return (
      <div className="flex items-center justify-between p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-amber-900 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
          <span className="font-bold">
            تنبيهات الميزانية ({alerts.length}):
          </span>
          <span>
            يوجد {alerts.length} {alerts.length === 1 ? 'مشروع يقترب' : 'مشاريع تقترب'} من تجاوز الميزانية المحددة.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline px-2 py-1 rounded hover:bg-amber-100 transition-colors"
        >
          إظهار التنبيهات بالتفصيل
        </button>
      </div>
    );
  }

  // If no alerts exist at all (all projects below threshold)
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <span className="font-bold text-slate-800">حالة الميزانيات: منضبطة وآمنة</span>
            <span className="text-slate-500 mr-2">
              كافة المصروفات في المشاريع النشطة أقل من حد التحذير ({warningThreshold}% من الميزانية المعتمدة).
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
          <span>عتبة التنبيه: {warningThreshold}%</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs text-right ${
        criticalCount > 0
          ? 'bg-gradient-to-b from-rose-50/90 via-white to-rose-50/30 border-rose-300'
          : 'bg-gradient-to-b from-amber-50/90 via-white to-amber-50/30 border-amber-300'
      }`}
    >
      {/* Widget Header Banner */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          {/* Warning Icon Badge */}
          <div
            className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
              criticalCount > 0
                ? 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-100 animate-pulse'
                : 'bg-amber-500 text-white shadow-xs ring-4 ring-amber-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                تنبيهات الميزانيات والمصروفات
              </h3>

              {/* Alert Count Pill */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                  criticalCount > 0
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {alerts.length} {alerts.length === 1 ? 'مشروع يستوجب الانتباه' : 'مشاريع تستوجب الانتباه'}
              </span>

              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-600 text-white">
                  {criticalCount} تجاوز فعلي
                </span>
              )}

              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500 text-white">
                  {warningCount} اقتراب من السقف ({warningThreshold}%+)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-1">
              متابعة المشروعات التي تقترب مصروفاتها من سقف الميزانية المحددة لتفادي أي عجز مالي
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Threshold Adjuster Button */}
          <div className="flex items-center gap-1 bg-white/80 border border-slate-200 px-2 py-1 rounded-lg text-xs">
            <span className="text-slate-500 text-[11px]">حد التحذير:</span>
            <select
              value={warningThreshold}
              onChange={e => setWarningThreshold(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              title="تحديد نسبة المصروفات التي يبدأ عندها إطلاق التنبيه"
            >
              <option value={70}>70%</option>
              <option value={75}>75%</option>
              <option value={80}>80% (الافتراضي)</option>
              <option value={85}>85%</option>
              <option value={90}>90%</option>
            </select>
          </div>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1 text-xs"
            title={isExpanded ? 'طي بطاقات التنبيه' : 'توسيع بطاقات التنبيه'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">طي</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">عرض التفاصيل</span>
              </>
            )}
          </button>

          {/* Snooze / Hide temporarily */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="إخفاء مؤقت للتنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Alerts Cards List */}
      {isExpanded && (
        <div className="p-4 space-y-3.5 bg-white/50">
          {/* Quick Filter Tabs if multiple alerts */}
          {alerts.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs pb-1">
              <span className="text-slate-500 text-[11px]">تصفية التنبيهات:</span>
              <button
                type="button"
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterSeverity === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                الكل ({alerts.length})
              </button>
              {criticalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterSeverity('critical')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterSeverity === 'critical'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                  }`}
                >
                  تجاوز الميزانية ({criticalCount})
                </button>
              )}
              {warningCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterSeverity('warning')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterSeverity === 'warning'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  اقتراب من السقف ({warningCount})
                </button>
              )}
            </div>
          )}

          {/* Alert Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAlerts.map(alert => {
              const isOver = alert.isOverBudget;
              const currency = alert.project.currency || 'SAR';

              return (
                <div
                  key={alert.project.id}
                  className={`relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    isOver
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200/70'
                      : 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200/70'
                  }`}
                >
                  {/* Top Bar: Title & Severity Icon Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {/* Warning Icon with specific styling */}
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isOver
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectProject(alert.project.id)}
                          className="font-bold text-slate-900 text-sm hover:text-emerald-700 text-right transition-colors"
                        >
                          {alert.project.name}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mr-7">
                        <span className="font-mono text-[11px] font-semibold text-slate-600">
                          {alert.project.code}
                        </span>
                        {alert.client && (
                          <span>· العميل: {alert.client.name}</span>
                        )}
                      </div>
                    </div>

                    {/* Usage Percent Pill */}
                    <div className="text-left shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                          isOver
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                        <span>{alert.usagePercent.toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Warning Message Box */}
                  <div
                    className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${
                      isOver
                        ? 'bg-white text-rose-900 border-rose-200'
                        : 'bg-white text-amber-900 border-amber-200'
                    }`}
                  >
                    <p className="font-medium">{alert.message}</p>
                  </div>

                  {/* Visual Budget Progress Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 font-medium">مؤشر استهلاك الميزانية:</span>
                      <span
                        className={`font-mono font-bold ${
                          isOver ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {formatCurrency(alert.totalExpenses, currency)} / {formatCurrency(alert.approvedBudget, currency)}
                      </span>
                    </div>

                    <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                      {/* Marker for Warning Threshold */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                        style={{ right: `${warningThreshold}%` }}
                        title={`حد التحذير: ${warningThreshold}%`}
                      />

                      {/* Animated Progress Fill */}
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isOver
                            ? 'bg-gradient-to-l from-rose-600 to-red-600'
                            : 'bg-gradient-to-l from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, alert.usagePercent))}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>0%</span>
                      <span>سقف التحذير ({warningThreshold}%)</span>
                      <span className="font-bold text-slate-700">100% الميزانية</span>
                    </div>
                  </div>

                  {/* Financial Statistics Breakdown Row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-400">الميزانية المعتمدة</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {formatCurrency(alert.approvedBudget, currency)}
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-400">المصروفات الحالية</div>
                      <div
                        className={`font-mono font-bold mt-0.5 ${
                          isOver ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {formatCurrency(alert.totalExpenses, currency)}
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                      <div className="text-[10px] text-slate-400">
                        {isOver ? 'مقدار العجز' : 'المتبقي للصرف'}
                      </div>
                      <div
                        className={`font-mono font-bold mt-0.5 ${
                          isOver ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {isOver ? (
                          `-${formatCurrency(Math.abs(alert.remainingBudget), currency)}`
                        ) : (
                          formatCurrency(alert.remainingBudget, currency)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProject(alert.project.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isOver
                          ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs'
                          : 'bg-amber-600 text-white hover:bg-amber-700 shadow-2xs'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض تفاصيل المشروع والمصروفات</span>
                    </button>

                    {onOpenQuickAction && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickAction('expense')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        <span>تسجيل مصروف جديد</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
