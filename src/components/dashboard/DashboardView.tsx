import React from 'react';
import {
  Briefcase,
  Layers,
  FileText,
  ArrowDownLeft,
  Clock,
  UserCheck,
  ArrowUpRight,
  ShieldAlert,
  Receipt,
  TrendingUp,
  Percent,
  Plus,
  Eye,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { FinancialCharts } from './FinancialCharts';
import { FilterBar } from './FilterBar';
import { BudgetAlertsWidget } from './BudgetAlertsWidget';
import { ProjectStatusSummaryWidget } from './ProjectStatusSummaryWidget';
import { ProjectStatusTracker } from '../projects/ProjectStatusTracker';
import {
  formatCurrency,
  formatSAR,
  formatPercent,
  formatDate,
  CURRENCY_INFO,
  PROJECT_STATUS_MAP,
  INVOICE_STATUS_MAP,
} from '../../utils/formatters';

interface DashboardViewProps {
  onOpenQuickAction: (actionType: 'project' | 'invoice' | 'client-payment' | 'team-payment' | 'expense') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenQuickAction }) => {
  const {
    db,
    overallFinancials,
    allProjectFinancials,
    setSelectedProjectId,
    setActiveTab,
    filters,
    currentUser,
    userPermissions,
    reportCurrency,
    setReportCurrency,
    exchangeRateSARtoEGP,
  } = useApp();

  const currentCurrencyInfo = CURRENCY_INFO[reportCurrency];
  const symbol = currentCurrencyInfo.symbol;

  // If team member, compute personal stats
  const memberId = currentUser.teamMemberId;
  const member = memberId ? db.teamMembers.find(m => m.id === memberId) : null;

  const myAssignments = memberId ? db.projectAssignments.filter(pa => pa.teamMemberId === memberId) : [];
  let myEntitled = 0;
  myAssignments.forEach(pa => {
    const proj = db.projects.find(p => p.id === pa.projectId);
    if (proj) {
      myEntitled += pa.compensationType === 'percentage' ? (pa.compensationValue / 100) * proj.contractValue : pa.compensationValue;
    }
  });

  const myPaid = memberId
    ? db.teamPayments.filter(tp => tp.teamMemberId === memberId).reduce((s, tp) => s + tp.amount, 0)
    : 0;

  const myRemaining = Math.max(0, myEntitled - myPaid);

  const myTasks = memberId ? db.tasks.filter(t => t.assignedMemberId === memberId) : [];
  const myCompletedTasks = myTasks.filter(t => t.progress === 100).length;
  const myDelayedTasks = myTasks.filter(t => t.status === 'delayed').length;

  // Prepare project breakdowns for charts
  const projectBreakdowns = db.projects
    .filter(p => {
      if (filters.projectId && filters.projectId !== 'all' && p.id !== filters.projectId) return false;
      if (filters.clientId && filters.clientId !== 'all' && p.clientId !== filters.clientId) return false;
      if (filters.status && filters.status !== 'all' && p.status !== filters.status) return false;
      return true;
    })
    .map(p => {
      const fin = allProjectFinancials.get(p.id);
      return {
        name: p.name,
        code: p.code,
        contractValue: p.contractValue,
        collected: fin?.totalCollected || 0,
        actualProfit: fin?.actualProfit || 0,
        expectedProfit: fin?.expectedProfit || 0,
        status: p.status,
      };
    });

  // Recent client payments (top 4)
  const recentClientPayments = [...db.clientPayments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 4);

  // Recent invoices (top 4)
  const recentInvoices = [...db.invoices]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 4);

  // Budget Alerts Calculation (Approaching >=80% or Exceeded >=100%)
  const budgetAlertsCount = db.projects.filter(p => {
    if (!p.approvedBudget || p.approvedBudget <= 0) return false;
    const fin = allProjectFinancials.get(p.id);
    return (fin?.budgetUsagePercent || 0) >= 80;
  }).length;

  const hasCriticalBudgetAlert = db.projects.some(p => {
    if (!p.approvedBudget || p.approvedBudget <= 0) return false;
    const fin = allProjectFinancials.get(p.id);
    return (fin?.budgetUsagePercent || 0) >= 100;
  });

  // If role is team_member, render tailored personal portal
  if (currentUser.role === 'team_member') {
    return (
      <div className="space-y-6 text-right">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>مرحباً، {currentUser.name}</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                بوابة عضو الفريق
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              متابعة مشاريعك المسندة، مهامك في مخطط جانت، ومستحقاتك المالية الشخصية
            </p>
          </div>

          <button
            onClick={() => setActiveTab('gantt')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <span>فتح مخطط جانت والمسار الحرج</span>
          </button>
        </div>

        {/* Personal Financial & Task KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatCard
            title="إجمالي مستحقاتك المكتسبة"
            value={formatSAR(myEntitled)}
            subtitle="من المشاريع المسندة لك"
            icon={UserCheck}
          />
          <StatCard
            title="المبالغ المسددة لك"
            value={formatSAR(myPaid)}
            subtitle="حوالات بنكية مستلمة"
            variant="highlight"
            badge="مستلم"
            badgeType="positive"
          />
          <StatCard
            title="المتبقي المستحق لك"
            value={formatSAR(myRemaining)}
            subtitle="معلق للصرف"
            variant={myRemaining > 0 ? 'warning' : 'default'}
            badge="متبقي"
            badgeType={myRemaining > 0 ? 'warning' : 'neutral'}
          />
          <StatCard
            title="مهامك في مخطط جانت"
            value={myTasks.length.toString()}
            subtitle={`${myCompletedTasks} مكتملة · ${myDelayedTasks} متأخرة`}
            variant={myDelayedTasks > 0 ? 'danger' : 'default'}
          />
        </div>

        {/* My Assigned Tasks Section */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">مهامك المجدولة للتنفيذ</h3>
            <button
              onClick={() => setActiveTab('gantt')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              عرض في مخطط جانت الكامل ➔
            </button>
          </div>

          {myTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
              لا توجد مهام مسندة لك حالياً
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myTasks.map(task => {
                const proj = db.projects.find(p => p.id === task.projectId);
                return (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{task.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        المشروع: {proj?.name} · من {formatDate(task.startDate)} إلى {formatDate(task.endDate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-800">{task.progress}%</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          task.progress === 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'delayed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {task.progress === 100 ? 'مكتملة' : task.status === 'delayed' ? 'متأخرة' : 'قيد التنفيذ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Assigned Projects */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">مشاريعك المشارك بها</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myAssignments.map(pa => {
              const proj = db.projects.find(p => p.id === pa.projectId);
              if (!proj) return null;
              return (
                <div
                  key={pa.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{proj.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{proj.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-2 font-mono">
                    <span>دورك: {pa.roleInProject}</span>
                    <span className="font-bold text-emerald-800">
                      {pa.compensationType === 'percentage'
                        ? `نسبة ${pa.compensationValue}% (${formatSAR((pa.compensationValue / 100) * proj.contractValue)})`
                        : formatSAR(pa.compensationValue)}
                    </span>
                  </div>
                  {(() => {
                    const projFin = allProjectFinancials.get(proj.id);
                    if (proj.approvedBudget && projFin?.budgetUsagePercent && projFin.budgetUsagePercent >= 80) {
                      return (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 font-semibold text-amber-800">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>
                              {projFin.isOverBudget ? 'تجاوز للميزانية' : 'اقتراب من سقف الميزانية'}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-amber-700">{projFin.budgetUsagePercent.toFixed(0)}%</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            لوحة مؤشرات الأداء والمالية (Dashboard)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            رصد لحظي للمشاريع، الفواتير، التحصيلات، مستحقات الفريق، المصروفات وصافي الأرباح
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setReportCurrency('SAR')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                reportCurrency === 'SAR'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇸🇦</span>
              <span>ر.س (SAR)</span>
            </button>
            <button
              onClick={() => setReportCurrency('EGP')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                reportCurrency === 'EGP'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇪🇬</span>
              <span>ج.م (EGP)</span>
            </button>
          </div>

          <button
            onClick={() => onOpenQuickAction('project')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>مشروع جديد</span>
          </button>
          <button
            onClick={() => onOpenQuickAction('invoice')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>إصدار فاتورة</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* Budget & Expense Warning Alerts Widget */}
      <BudgetAlertsWidget
        projects={db.projects}
        allProjectFinancials={allProjectFinancials}
        clients={db.clients}
        onSelectProject={setSelectedProjectId}
        onOpenQuickAction={type => onOpenQuickAction(type as any)}
      />

      {/* Project Status Tracking & Workflow Distribution Widget */}
      <ProjectStatusSummaryWidget onSelectProject={setSelectedProjectId} />

      {/* Primary KPI Grid (10 Core Metrics Required by Prompt) */}
      <div className="space-y-4">
        {/* Row 1: High Level Revenue & Collections */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. عدد المشاريع */}
          <StatCard
            title="1. عدد المشاريع"
            value={overallFinancials.totalProjectsCount.toString()}
            subtitle="مشاريع تحت الإدارة"
            icon={Briefcase}
            badge="إجمالي"
          />

          {/* 2. إجمالي قيمة المشاريع */}
          <StatCard
            title={`2. إجمالي قيمة المشاريع (${symbol})`}
            value={formatCurrency(overallFinancials.totalContractValue, reportCurrency)}
            subtitle={`القيمة التعاقدية الكلية (${currentCurrencyInfo.name})`}
            icon={Layers}
            variant="default"
          />

          {/* 3. إجمالي الفواتير */}
          <StatCard
            title={`3. إجمالي الفواتير (${symbol})`}
            value={formatCurrency(overallFinancials.totalInvoiced, reportCurrency)}
            subtitle="فواتير تم إصدارها"
            icon={FileText}
          />

          {/* 4. إجمالي التحصيل */}
          <StatCard
            title={`4. إجمالي التحصيل (${symbol})`}
            value={formatCurrency(overallFinancials.totalCollected, reportCurrency)}
            subtitle="المبالغ المقبوضة فعلياً"
            icon={ArrowDownLeft}
            variant="highlight"
            badge="مقبوض"
            badgeType="positive"
          />

          {/* 5. المبالغ المتبقية على العملاء */}
          <StatCard
            title={`5. المتبقي على العملاء (${symbol})`}
            value={formatCurrency(overallFinancials.totalClientRemaining, reportCurrency)}
            subtitle="مستحقات معلقة على العملاء"
            icon={Clock}
            variant={overallFinancials.totalClientRemaining > 0 ? 'warning' : 'default'}
            badge="مستحق"
            badgeType={overallFinancials.totalClientRemaining > 0 ? 'warning' : 'neutral'}
          />
        </div>

        {/* Row 2: Team Obligations, Expenses & Net Profits */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 6. إجمالي مستحقات الفريق */}
          <StatCard
            title={`6. إجمالي مستحقات الفريق (${symbol})`}
            value={formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency)}
            subtitle="نسب + مبالغ ثابتة"
            icon={UserCheck}
          />

          {/* 7. إجمالي المدفوع للفريق */}
          <StatCard
            title={`7. إجمالي المدفوع للفريق (${symbol})`}
            value={formatCurrency(overallFinancials.totalTeamPaid, reportCurrency)}
            subtitle="حوالات تم صرفها"
            icon={ArrowUpRight}
          />

          {/* 8. المبالغ المتبقية للفريق */}
          <StatCard
            title={`8. المتبقي للفريق (${symbol})`}
            value={formatCurrency(overallFinancials.totalTeamRemaining, reportCurrency)}
            subtitle="مستحقات لم تصرف بعد"
            icon={ShieldAlert}
            variant={overallFinancials.totalTeamRemaining > 0 ? 'warning' : 'default'}
            badge="التزام"
            badgeType={overallFinancials.totalTeamRemaining > 0 ? 'warning' : 'neutral'}
          />

          {/* 9. إجمالي المصروفات */}
          <StatCard
            title={`9. إجمالي المصروفات (${symbol})`}
            value={formatCurrency(overallFinancials.totalExpenses, reportCurrency)}
            subtitle="سيرفرات وتراخيص وغيرها"
            icon={Receipt}
            variant={hasCriticalBudgetAlert ? 'danger' : budgetAlertsCount > 0 ? 'warning' : 'default'}
            badge={budgetAlertsCount > 0 ? `${budgetAlertsCount} تنبيه ميزانية` : undefined}
            badgeType={hasCriticalBudgetAlert ? 'negative' : budgetAlertsCount > 0 ? 'warning' : undefined}
          />

          {/* 10. صافي الربح الفعلي */}
          <StatCard
            title={`10. صافي الربح الفعلي (${symbol})`}
            value={formatCurrency(overallFinancials.totalActualProfit, reportCurrency)}
            subtitle={`الربح المتوقع: ${formatCurrency(overallFinancials.totalExpectedProfit, reportCurrency)}`}
            icon={TrendingUp}
            variant={overallFinancials.totalActualProfit >= 0 ? 'success' : 'danger'}
            badge={formatPercent(overallFinancials.actualProfitMargin)}
            badgeType={overallFinancials.totalActualProfit >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>

      {/* Formula Explanation Callout (Transparent financial audit) */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-slate-700">
        <div className="font-bold text-emerald-950 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-emerald-700" />
            <span>المعادلات المالية المحسوبة آلياً (موحدة بـ {currentCurrencyInfo.name} {symbol}):</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            سعر الصرف المعتمد: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div>
            <span className="font-semibold text-emerald-900">• الربح الفعلي المحقق: </span>
            <span className="font-mono text-slate-800">إجمالي التحصيل ({formatCurrency(overallFinancials.totalCollected, reportCurrency)})</span> - 
            <span className="font-mono text-slate-800"> المدفوع للفريق ({formatCurrency(overallFinancials.totalTeamPaid, reportCurrency)})</span> - 
            <span className="font-mono text-slate-800"> المصروفات ({formatCurrency(overallFinancials.totalExpenses, reportCurrency)})</span> = 
            <span className="font-mono font-bold text-emerald-900"> {formatCurrency(overallFinancials.totalActualProfit, reportCurrency)}</span>
          </div>
          <div>
            <span className="font-semibold text-emerald-900">• الربح المتوقع عند الإغلاق: </span>
            <span className="font-mono text-slate-800">قيمة المشاريع ({formatCurrency(overallFinancials.totalContractValue, reportCurrency)})</span> - 
            <span className="font-mono text-slate-800"> مستحقات الفريق ({formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency)})</span> - 
            <span className="font-mono text-slate-800"> المصروفات ({formatCurrency(overallFinancials.totalExpenses, reportCurrency)})</span> = 
            <span className="font-mono font-bold text-emerald-900"> {formatCurrency(overallFinancials.totalExpectedProfit, reportCurrency)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <FinancialCharts
        totalCollected={overallFinancials.totalCollected}
        totalTeamPaid={overallFinancials.totalTeamPaid}
        totalExpenses={overallFinancials.totalExpenses}
        actualProfit={overallFinancials.totalActualProfit}
        totalContractValue={overallFinancials.totalContractValue}
        totalTeamEntitlements={overallFinancials.totalTeamEntitlements}
        expectedProfit={overallFinancials.totalExpectedProfit}
        projectBreakdowns={projectBreakdowns}
      />

      {/* Projects Table Preview with Direct Drill-Down */}
      <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">قائمة المشاريع ومؤشرات الربحية المباشرة</h3>
            <p className="text-xs text-slate-500 mt-0.5">انقر على أي مشروع لفتح تفاصيله الشاملة والمالية</p>
          </div>
          <button
            onClick={() => setActiveTab('projects')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>عرض كافة المشاريع</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-3">رقم واسم المشروع</th>
                <th className="py-2.5 px-3">العميل</th>
                <th className="py-2.5 px-3">القيمة الإجمالية</th>
                <th className="py-2.5 px-3">المحصّل الفعلي</th>
                <th className="py-2.5 px-3">المتبقي للعميل</th>
                <th className="py-2.5 px-3">المدفوع للفريق</th>
                <th className="py-2.5 px-3">المصروفات</th>
                <th className="py-2.5 px-3">الربح الفعلي</th>
                <th className="py-2.5 px-3">الحالة</th>
                <th className="py-2.5 px-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.projects.map(project => {
                const client = db.clients.find(c => c.id === project.clientId);
                const fin = allProjectFinancials.get(project.id);
                const statusMeta = PROJECT_STATUS_MAP[project.status];

                return (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {project.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">{project.code}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{client?.name || '-'}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                      {formatSAR(project.contractValue)}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-emerald-700">
                      {formatSAR(fin?.totalCollected)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatSAR(fin?.clientRemaining)}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-700">
                      {formatSAR(fin?.totalTeamPaid)}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-700">
                      <div>{formatSAR(fin?.totalExpenses)}</div>
                      {project.approvedBudget && project.approvedBudget > 0 && (fin?.budgetUsagePercent || 0) >= 80 ? (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              fin?.isOverBudget
                                ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                            title={
                              fin?.isOverBudget
                                ? `تجاوز الميزانية المعتمدة بنسبة ${fin.budgetUsagePercent.toFixed(1)}%`
                                : `تحذير: اقتراب المصروفات من سقف الميزانية بنسبة ${fin?.budgetUsagePercent.toFixed(1)}%`
                            }
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>{fin?.isOverBudget ? 'تجاوز' : 'اقتراب'} ({fin?.budgetUsagePercent.toFixed(0)}%)</span>
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={(fin?.actualProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {formatSAR(fin?.actualProfit)}
                      </span>
                    </td>
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <ProjectStatusTracker project={project} compact={true} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="عرض تفاصيل المشروع"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Stream: Recent Invoices & Recent Client Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Invoices */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">أحدث الفواتير المصدرة</h3>
            <button
              onClick={() => setActiveTab('invoices')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              عرض الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map(inv => {
              const project = db.projects.find(p => p.id === inv.projectId);
              const fin = allProjectFinancials.get(inv.projectId);
              const invCalculated = fin?.invoices.find(i => i.id === inv.id);
              const status = invCalculated?.status || 'unpaid';
              const statusMeta = INVOICE_STATUS_MAP[status];

              return (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{project?.name}</div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="font-bold text-slate-900">{formatSAR(inv.totalAmount)}</div>
                    <div className="text-[11px] text-slate-400">{formatDate(inv.issueDate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Client Collections */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">أحدث دفعات العملاء المستلمة</h3>
            <button
              onClick={() => setActiveTab('client-payments')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              عرض الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClientPayments.map(cp => {
              const project = db.projects.find(p => p.id === cp.projectId);
              const client = db.clients.find(c => c.id === cp.clientId);

              return (
                <div key={cp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-700">{cp.paymentNumber}</span>
                      <span className="text-slate-700 font-medium">{client?.name}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{project?.name}</div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="font-bold text-emerald-700">+{formatSAR(cp.amount)}</div>
                    <div className="text-[11px] text-slate-400">{formatDate(cp.paymentDate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
