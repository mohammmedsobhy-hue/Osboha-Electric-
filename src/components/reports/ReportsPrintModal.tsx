import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileSpreadsheet,
  Download,
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
  Check,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Currency, ProjectStatus } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  convertCurrency,
  CURRENCY_INFO,
  PROJECT_STATUS_MAP,
} from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportService';
import { BrandLogo } from '../common/BrandLogo';

interface ReportsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: 'profit_loss' | 'financial_charts' | 'projects_matrix';
}

export const ReportsPrintModal: React.FC<ReportsPrintModalProps> = ({
  isOpen,
  onClose,
  initialReportType = 'financial_charts',
}) => {
  const {
    db,
    allProjectFinancials,
    reportCurrency,
    setReportCurrency,
    exchangeRateSARtoEGP,
  } = useApp();

  // Print customization states
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [includeProjectCards, setIncludeProjectCards] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [metricMode, setMetricMode] = useState<'actual' | 'contract'>('actual');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const currencyInfo = CURRENCY_INFO[reportCurrency];
  const symbol = currencyInfo.symbol;
  const issueDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issueTime = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const reportRef = `OEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Filter projects
  const filteredProjects = useMemo(() => {
    return db.projects.filter(p => {
      if (statusFilter === 'all') return true;
      return p.status === statusFilter;
    });
  }, [db.projects, statusFilter]);

  // Process data for charts and report
  const projectsData = useMemo(() => {
    return filteredProjects.map(p => {
      const fin = allProjectFinancials.get(p.id);
      const client = db.clients.find(c => c.id === p.clientId);
      const fromCurr = p.currency || 'SAR';

      // Revenue: Collected Cash vs Contract Value
      const rawRevenue = metricMode === 'actual' ? (fin?.totalCollected || 0) : p.contractValue;
      const revenue = convertCurrency(rawRevenue, fromCurr, reportCurrency, exchangeRateSARtoEGP);

      // Total Expenses & Team Costs
      const rawExpenses = metricMode === 'actual'
        ? ((fin?.totalTeamPaid || 0) + (fin?.totalExpenses || 0))
        : ((fin?.totalTeamEntitlements || 0) + (fin?.totalExpenses || 0));
      const expenses = convertCurrency(rawExpenses, fromCurr, reportCurrency, exchangeRateSARtoEGP);

      const teamCost = convertCurrency(
        metricMode === 'actual' ? (fin?.totalTeamPaid || 0) : (fin?.totalTeamEntitlements || 0),
        fromCurr,
        reportCurrency,
        exchangeRateSARtoEGP
      );

      const directExpenses = convertCurrency(
        fin?.totalExpenses || 0,
        fromCurr,
        reportCurrency,
        exchangeRateSARtoEGP
      );

      const contractConverted = convertCurrency(p.contractValue, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      const netProfit = revenue - expenses;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        clientName: client?.name || client?.companyName || '-',
        status: p.status,
        originalCurrency: fromCurr,
        contractValueOriginal: p.contractValue,
        contractValueConverted: contractConverted,
        revenue,
        expenses,
        teamCost,
        directExpenses,
        netProfit,
        profitMargin,
      };
    });
  }, [filteredProjects, allProjectFinancials, db.clients, reportCurrency, exchangeRateSARtoEGP, metricMode]);

  // Aggregated totals
  const totals = useMemo(() => {
    const totalContract = projectsData.reduce((acc, curr) => acc + curr.contractValueConverted, 0);
    const totalRev = projectsData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExp = projectsData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalTeam = projectsData.reduce((acc, curr) => acc + curr.teamCost, 0);
    const totalDirect = projectsData.reduce((acc, curr) => acc + curr.directExpenses, 0);
    const totalProfit = totalRev - totalExp;
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const profitableCount = projectsData.filter(p => p.netProfit > 0).length;

    return {
      totalContract,
      totalRev,
      totalExp,
      totalTeam,
      totalDirect,
      totalProfit,
      avgMargin,
      profitableCount,
    };
  }, [projectsData]);

  if (!isOpen) return null;

  // Direct Browser Print
  const handlePrint = () => {
    // Add print active class on body to ensure clean printing
    document.body.classList.add('printing-report');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-report');
    }, 150);
  };

  // Export Table & Overview to Excel
  const handleExportExcel = () => {
    const headers = [
      'كود المشروع',
      'اسم المشروع',
      'العميل',
      'الحالة',
      'عملة العقد الأصلية',
      `قيمة العقد (${symbol})`,
      `الإيراد (${symbol})`,
      `تكلفة الفريق (${symbol})`,
      `المصروفات المباشرة (${symbol})`,
      `إجمالي التكاليف (${symbol})`,
      `صافي الربح (${symbol})`,
      'هامش الربح %',
    ];

    const rows = projectsData.map(p => [
      p.code,
      p.name,
      p.clientName,
      PROJECT_STATUS_MAP[p.status as ProjectStatus]?.label || p.status,
      p.originalCurrency,
      p.contractValueConverted,
      p.revenue,
      p.teamCost,
      p.directExpenses,
      p.expenses,
      p.netProfit,
      `${p.profitMargin.toFixed(1)}%`,
    ]);

    // Summary row
    rows.push([
      'الإجمالي العام',
      `عدد المشاريع: ${projectsData.length}`,
      '-',
      '-',
      '-',
      totals.totalContract,
      totals.totalRev,
      totals.totalTeam,
      totals.totalDirect,
      totals.totalExp,
      totals.totalProfit,
      `${totals.avgMargin.toFixed(1)}%`,
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    exportToExcel(`osboha_financial_report_${reportCurrency}_${timestamp}`, [
      {
        name: 'تقرير أرباح ورسوم المشاريع',
        headers,
        rows,
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/80 backdrop-blur-xs text-right print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* ========================================================= */}
        {/* Interactive Top Actions & Customization Bar (NO-PRINT) */}
        {/* ========================================================= */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  معاينة وتصدير لوحة التقارير والرسوم البيانية إلى PDF
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  منصة Osboha Electric لإدارة المشاريع والمالية والأرباح · تنسيق طباعة معتمد باللغة العربية مع دعم الرسوم البيانية والجداول
                </p>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-xl transition-all shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>إكسيل (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-md hover:shadow-emerald-900/40 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ كملف PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Report Customization Filters */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Section Toggles */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-300">
              <span className="text-slate-400 font-semibold">محتويات التقرير:</span>
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700/80">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={e => setIncludeCharts(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <span>الرسوم البيانية (Recharts)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700/80">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={e => setIncludeSummary(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <span>المؤشرات المالية</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700/80">
                <input
                  type="checkbox"
                  checked={includeTable}
                  onChange={e => setIncludeTable(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <span>جدول المقارنة التفصيلي</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700/80">
                <input
                  type="checkbox"
                  checked={includeProjectCards}
                  onChange={e => setIncludeProjectCards(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <span>أعمدة المقارنة للمشاريع</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-700/80">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={e => setIncludeSignatures(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0"
                />
                <span>التوقيعات والاعتماد الرسمي</span>
              </label>
            </div>

            {/* Currency & Mode controls */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">العملة:</span>
              <div className="flex bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setReportCurrency('SAR')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    reportCurrency === 'SAR' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  SAR (ر.س)
                </button>
                <button
                  type="button"
                  onClick={() => setReportCurrency('EGP')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    reportCurrency === 'EGP' ? 'bg-amber-600 text-white' : 'text-slate-400'
                  }`}
                >
                  EGP (ج.م)
                </button>
              </div>

              <span className="text-slate-400 mr-2">القياس:</span>
              <select
                value={metricMode}
                onChange={e => setMetricMode(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1"
              >
                <option value="actual">التحصيل والمصروف الفعلي</option>
                <option value="contract">قيمة التعاقد والتكلفة التقديرية</option>
              </select>

              <span className="text-slate-400 mr-2">الحالة:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1"
              >
                <option value="all">جميع المشاريع</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
                <option value="pending">معلق</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Printable Certified Document (A4/Landscape Styled) */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-10 bg-white text-slate-900 printable-report space-y-7 print:p-0 print:space-y-6">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <BrandLogo variant="light" size="md" />
              <h3 className="text-sm font-bold text-slate-800 mt-2">
                شركة أصبوحة إلكتريك للمقاولات والتجهيزات الهندسية الكهربائية
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                الرقم الضريبي (VAT): 310998877600003 · سجل تجاري (CR): 1010889922
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                المملكة العربية السعودية · الرياض · info@osboha-electric.com
              </p>
            </div>

            <div className="text-left font-mono space-y-1">
              <span className="inline-block px-3 py-1 rounded bg-slate-950 text-white text-xs font-bold tracking-wider uppercase">
                تقرير مالي رسمي معتمد
              </span>
              <h1 className="text-lg font-black text-slate-950 font-sans tracking-tight">
                تقرير الأداء المالي المقارن والرسوم البيانية للمشاريع
              </h1>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                <div>رقم المرجع: <span className="font-bold text-slate-900">{reportRef}</span></div>
                <div>تاريخ الإصدار: <span className="font-bold text-slate-900">{issueDate} ({issueTime})</span></div>
                <div>
                  العملة الموحدة:{' '}
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {currencyInfo.name} ({symbol})
                  </span>
                </div>
                {reportCurrency === 'EGP' && (
                  <div className="text-[10px] text-slate-500">
                    سعر الصرف المعتمد: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Executive Summary KPI Cards */}
          {includeSummary && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-600" />
                  <span>المؤشرات المالية التنفيذية الإجمالية (Financial KPIs)</span>
                </h4>
                <span className="text-[10px] text-slate-500">
                  {metricMode === 'actual' ? 'بناءً على التدفقات النقدية المحصلة' : 'بناءً على إجمالي قيم التعاقدات'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-emerald-800 block">
                    {metricMode === 'actual' ? 'إجمالي الإيرادات المحصلة' : 'إجمالي قيمة العقود'}
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-emerald-950 block mt-1">
                    {formatCurrency(totals.totalRev, reportCurrency)}
                  </span>
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    {projectsData.length} مشاريع مشمولة بالتقرير
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-rose-800 block">
                    إجمالي التكاليف والمصروفات
                  </span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-rose-950 block mt-1">
                    {formatCurrency(totals.totalExp, reportCurrency)}
                  </span>
                  <span className="text-[10px] text-rose-700 mt-1 block">
                    فريق: {formatCurrency(totals.totalTeam, reportCurrency)} · نثريات: {formatCurrency(totals.totalDirect, reportCurrency)}
                  </span>
                </div>

                <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-cyan-900 block">
                    صافي الأرباح المحققة
                  </span>
                  <span className={`text-lg sm:text-xl font-bold font-mono block mt-1 ${
                    totals.totalProfit >= 0 ? 'text-cyan-950' : 'text-rose-700'
                  }`}>
                    {formatCurrency(totals.totalProfit, reportCurrency)}
                  </span>
                  <span className="text-[10px] text-cyan-800 mt-1 block font-medium">
                    {totals.profitableCount} من أصل {projectsData.length} مشروع رابح
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    متوسط هامش الربح الصافي
                  </span>
                  <span className={`text-lg sm:text-xl font-bold font-mono block mt-1 ${
                    totals.avgMargin >= 0 ? 'text-slate-900' : 'text-rose-700'
                  }`}>
                    {totals.avgMargin.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    صافي العائد على الإيرادات
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Recharts Graphical Comparison */}
          {includeCharts && (
            <div className="space-y-3 break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                    <span>الرسم البياني التوضيحي لمقارنة أداء المشاريع (Recharts Visual Comparison)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    مقارنة ثلاثية بين الإيراد، إجمالي التكاليف والمصروفات، وصافي الربح المحقق لكل مشروع ({symbol})
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                    <span>الإيرادات</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
                    <span>المصروفات والتكاليف</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
                    <span>صافي الربح</span>
                  </span>
                </div>
              </div>

              {/* Vector SVG Chart (Recharts) */}
              <div className="w-full h-80 bg-white p-2 rounded-xl border border-slate-200">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={projectsData.map(p => ({
                      code: p.code,
                      name: p.name,
                      revenue: p.revenue,
                      expenses: p.expenses,
                      netProfit: p.netProfit,
                    }))}
                    margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="code"
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      interval={0}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                      stroke="#94a3b8"
                      fontSize={11}
                      tick={{ fill: '#64748b' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                      formatter={value => {
                        if (value === 'revenue') return 'الإيرادات';
                        if (value === 'expenses') return 'التكاليف والمصروفات';
                        if (value === 'netProfit') return 'صافي الربح';
                        return value;
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="revenue"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="expenses"
                      name="expenses"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="netProfit"
                      name="netProfit"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Section: Comparative Visual Breakdown Cards / Progress Bars */}
          {includeProjectCards && (
            <div className="space-y-3 break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-600" />
                <span>التحليل البصري المقارن لأداء المشاريع (Project Visual Performance Bars)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {projectsData.map(p => {
                  const maxVal = Math.max(p.revenue, p.expenses, 1);
                  const revPercent = Math.min(100, (p.revenue / maxVal) * 100);
                  const expPercent = Math.min(100, (p.expenses / maxVal) * 100);
                  const isProfitable = p.netProfit >= 0;

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 break-inside-avoid"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                            {p.code}
                          </span>
                          <span className="font-bold text-slate-800">{p.name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isProfitable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isProfitable ? '+' : ''}
                          {p.profitMargin.toFixed(1)}% هامش
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>العميل: <strong className="text-slate-700">{p.clientName}</strong></span>
                        <span>
                          العقد: <strong className="text-slate-700 font-mono">{formatCurrency(p.contractValueConverted, reportCurrency)}</strong>
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="space-y-1.5 pt-1">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                            <span className="font-semibold text-emerald-700">الإيراد:</span>
                            <span className="font-mono font-bold text-emerald-800">{formatCurrency(p.revenue, reportCurrency)}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${revPercent}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                            <span className="font-semibold text-rose-700">التكاليف والمصروفات:</span>
                            <span className="font-mono font-bold text-rose-800">{formatCurrency(p.expenses, reportCurrency)}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full"
                              style={{ width: `${expPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-200 flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-700">صافي ربح المشروع:</span>
                          <span className={`font-mono font-bold ${isProfitable ? 'text-cyan-800' : 'text-rose-700'}`}>
                            {formatCurrency(p.netProfit, reportCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Detailed Financial Table */}
          {includeTable && (
            <div className="space-y-3 break-inside-avoid">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" />
                  <span>جدول البيانات المالية التفصيلي للمشاريع (Financial Performance Matrix)</span>
                </h4>
                <span className="text-[10px] text-slate-500">
                  جميع المبالغ بالـ ({currencyInfo.name} - {symbol})
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-l border-slate-200">كود</th>
                      <th className="p-2.5 border-l border-slate-200">المشروع</th>
                      <th className="p-2.5 border-l border-slate-200">العميل</th>
                      <th className="p-2.5 border-l border-slate-200">قيمة العقد</th>
                      <th className="p-2.5 border-l border-slate-200">الإيراد</th>
                      <th className="p-2.5 border-l border-slate-200">تكلفة الفريق</th>
                      <th className="p-2.5 border-l border-slate-200">المصروفات</th>
                      <th className="p-2.5 border-l border-slate-200">إجمالي التكاليف</th>
                      <th className="p-2.5 border-l border-slate-200">صافي الربح</th>
                      <th className="p-2.5 border-l border-slate-200">هامش الربح</th>
                      <th className="p-2.5">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectsData.map((p, idx) => {
                      const isProfitable = p.netProfit >= 0;
                      return (
                        <tr
                          key={p.id}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-slate-100/60`}
                        >
                          <td className="p-2 font-mono font-bold text-slate-900 border-l border-slate-200">
                            {p.code}
                          </td>
                          <td className="p-2 font-medium text-slate-800 border-l border-slate-200">
                            {p.name}
                          </td>
                          <td className="p-2 text-slate-600 border-l border-slate-200">
                            {p.clientName}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-l border-slate-200">
                            {formatCurrency(p.contractValueConverted, reportCurrency)}
                          </td>
                          <td className="p-2 font-mono font-semibold text-emerald-800 border-l border-slate-200">
                            {formatCurrency(p.revenue, reportCurrency)}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-l border-slate-200">
                            {formatCurrency(p.teamCost, reportCurrency)}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-l border-slate-200">
                            {formatCurrency(p.directExpenses, reportCurrency)}
                          </td>
                          <td className="p-2 font-mono font-semibold text-rose-800 border-l border-slate-200">
                            {formatCurrency(p.expenses, reportCurrency)}
                          </td>
                          <td
                            className={`p-2 font-mono font-bold border-l border-slate-200 ${
                              isProfitable ? 'text-cyan-800' : 'text-rose-700'
                            }`}
                          >
                            {formatCurrency(p.netProfit, reportCurrency)}
                          </td>
                          <td
                            className={`p-2 font-mono font-bold border-l border-slate-200 ${
                              isProfitable ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {p.profitMargin.toFixed(1)}%
                          </td>
                          <td className="p-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {PROJECT_STATUS_MAP[p.status as ProjectStatus]?.label || p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary Totals Row */}
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                      <td colSpan={3} className="p-2.5 text-center text-xs">
                        الإجمالي العام ({projectsData.length} مشاريع)
                      </td>
                      <td className="p-2.5 font-mono text-xs">
                        {formatCurrency(totals.totalContract, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-emerald-300 text-xs">
                        {formatCurrency(totals.totalRev, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-slate-300 text-xs">
                        {formatCurrency(totals.totalTeam, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-slate-300 text-xs">
                        {formatCurrency(totals.totalDirect, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-rose-300 text-xs">
                        {formatCurrency(totals.totalExp, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-cyan-300 text-xs">
                        {formatCurrency(totals.totalProfit, reportCurrency)}
                      </td>
                      <td className="p-2.5 font-mono text-amber-300 text-xs">
                        {totals.avgMargin.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-xs text-slate-400">مكتمل</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Official Endorsements & Signatures */}
          {includeSignatures && (
            <div className="pt-6 border-t-2 border-slate-300 space-y-4 break-inside-avoid">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>المصادقة والاعتماد الرسمي (Official Approvals & Signatures)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  شهادة بصحة البيانات المالية وتطابقها مع الفواتير وسندات الصرف
                </span>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center text-xs pt-2">
                {/* 1. Accountant */}
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/50 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">إعداد: المحاسب المالي</span>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1 text-slate-400 font-script">
                    سليمان الحصين
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>التاريخ: {issueDate}</span>
                    <span>التوقيع: معتمد ✓</span>
                  </div>
                </div>

                {/* 2. Project Manager */}
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/50 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">مراجعة: مدير إدارة المشاريع</span>
                  <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-center pb-1 text-slate-400 font-script">
                    م. طارق المهندس
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>التاريخ: {issueDate}</span>
                    <span>التوقيع: معتمد ✓</span>
                  </div>
                </div>

                {/* 3. General Manager & Seal */}
                <div className="p-4 rounded-xl border-2 border-slate-900 bg-slate-50/50 relative overflow-hidden space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">اعتماد: المدير العام وختم المنشأة</span>
                  <div className="h-10 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-600 flex items-center justify-center rotate-12 opacity-85 text-emerald-700 text-[9px] font-bold text-center leading-tight">
                      ختم الاعتماد<br />Osboha<br />Electric
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    عبدالرحمن الشريف · الرئيس التنفيذي
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Official Footer Note */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
            <div>
              تم استخراج وتوثيق هذا التقرير تلقائيًا من منصة <strong className="text-slate-600">Osboha Electric</strong> لإدارة المشاريع والمالية والأرباح
            </div>
            <div>
              صفحة 1 من 1 · سري وخاص بالإدارة المالية · كود الوثيقة: {reportRef}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
