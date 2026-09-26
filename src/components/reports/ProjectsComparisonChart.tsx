import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpDown,
  Filter,
  DollarSign,
  Briefcase,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Printer,
} from 'lucide-react';
import { Project, Currency, ProjectStatus } from '../../types';
import { formatCurrency, formatPercent, convertCurrency, CURRENCY_INFO } from '../../utils/formatters';

interface ProjectsComparisonChartProps {
  projects: Project[];
  allProjectFinancials: Map<string, any>;
  reportCurrency: Currency;
  exchangeRateSARtoEGP: number;
  onSelectProject?: (projectId: string) => void;
  onExportPDF?: () => void;
}

type MetricMode = 'actual' | 'contract';
type ChartType = 'bar' | 'composed' | 'horizontal';
type SortOption = 'profit_desc' | 'profit_asc' | 'revenue_desc' | 'expenses_desc' | 'margin_desc';

export const ProjectsComparisonChart: React.FC<ProjectsComparisonChartProps> = ({
  projects,
  allProjectFinancials,
  reportCurrency,
  exchangeRateSARtoEGP,
  onSelectProject,
  onExportPDF,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('actual');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('profit_desc');

  const currencyInfo = CURRENCY_INFO[reportCurrency];
  const symbol = currencyInfo.symbol;

  // Process data for each project
  const chartData = useMemo(() => {
    // 1. Filter by status if selected
    const filtered = projects.filter(p => {
      if (statusFilter === 'all') return true;
      return p.status === statusFilter;
    });

    // 2. Map into chart metrics converted to reportCurrency
    const processed = filtered.map(p => {
      const fin = allProjectFinancials.get(p.id);
      const fromCurr = p.currency || 'SAR';

      // Revenue: Actual Cash Collected vs Contract Value
      const rawRevenue = metricMode === 'actual' ? (fin?.totalCollected || 0) : p.contractValue;
      const revenue = convertCurrency(rawRevenue, fromCurr, reportCurrency, exchangeRateSARtoEGP);

      // Total Expenses & Direct Costs: (Team Paid + Direct Expenses) in actual mode, OR (Team Entitlements + Direct Expenses) in contract mode
      const rawExpenses = metricMode === 'actual'
        ? ((fin?.totalTeamPaid || 0) + (fin?.totalExpenses || 0))
        : ((fin?.totalTeamEntitlements || 0) + (fin?.totalExpenses || 0));
      const expenses = convertCurrency(rawExpenses, fromCurr, reportCurrency, exchangeRateSARtoEGP);

      // Direct separate expenses & team compensation
      const directExpenses = convertCurrency(fin?.totalExpenses || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      const teamCost = convertCurrency(
        metricMode === 'actual' ? (fin?.totalTeamPaid || 0) : (fin?.totalTeamEntitlements || 0),
        fromCurr,
        reportCurrency,
        exchangeRateSARtoEGP
      );

      // Net Profit
      const netProfit = revenue - expenses;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Short label for X-Axis (e.g., Code + shortened name)
      const shortName = p.name.length > 18 ? `${p.name.slice(0, 16)}...` : p.name;
      const axisLabel = `${p.code}`;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        shortName,
        axisLabel,
        revenue,
        expenses,
        directExpenses,
        teamCost,
        netProfit,
        profitMargin,
        status: p.status,
        originalCurrency: fromCurr,
        contractValueOriginal: p.contractValue,
      };
    });

    // 3. Sort based on user selection
    processed.sort((a, b) => {
      switch (sortBy) {
        case 'profit_desc':
          return b.netProfit - a.netProfit;
        case 'profit_asc':
          return a.netProfit - b.netProfit;
        case 'revenue_desc':
          return b.revenue - a.revenue;
        case 'expenses_desc':
          return b.expenses - a.expenses;
        case 'margin_desc':
          return b.profitMargin - a.profitMargin;
        default:
          return b.netProfit - a.netProfit;
      }
    });

    return processed;
  }, [projects, allProjectFinancials, reportCurrency, exchangeRateSARtoEGP, metricMode, statusFilter, sortBy]);

  // Aggregate highlights
  const totals = useMemo(() => {
    const totalRev = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExp = chartData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalProfit = totalRev - totalExp;
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const topProject = [...chartData].sort((a, b) => b.netProfit - a.netProfit)[0];

    return { totalRev, totalExp, totalProfit, avgMargin, topProject };
  }, [chartData]);

  const handleBarClick = (entry: any) => {
    if (onSelectProject && entry && typeof entry.id === 'string') {
      onSelectProject(entry.id);
    }
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProfitable = data.netProfit >= 0;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-right text-xs max-w-xs space-y-2 pointer-events-none">
          <div className="border-b border-slate-800 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-cyan-400 font-bold">{data.code}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {data.originalCurrency}
              </span>
            </div>
            <div className="font-bold text-white text-sm mt-0.5">{data.name}</div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{metricMode === 'actual' ? 'الإيرادات المحصلة:' : 'قيمة العقد:'}</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(data.revenue, reportCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>إجمالي المصروفات والتكاليف:</span>
              </span>
              <span className="font-mono font-bold text-rose-400">
                {formatCurrency(data.expenses, reportCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold">
              <span className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isProfitable ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                <span className="text-white">صافي الربح:</span>
              </span>
              <span className={`font-mono text-sm ${isProfitable ? 'text-cyan-300' : 'text-amber-400'}`}>
                {formatCurrency(data.netProfit, reportCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>هامش الربح الصافي:</span>
              <span className={`font-mono font-bold ${isProfitable ? 'text-cyan-400' : 'text-rose-400'}`}>
                {data.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {onSelectProject && (
            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 text-center">
              انقر على العمود لفتح تفاصيل المشروع
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5 text-right">
      {/* Header & Controls Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                مقارنة الإيرادات والمصروفات والأرباح الصافية لكل مشروع
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحليل بياني مباشر ودقيق يوضح أداء كل مشروع على حدة بالعملة الموحدة ({currencyInfo.name} - {symbol})
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Mode Switch: Actual Cash vs Contractual */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('actual')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                metricMode === 'actual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              التحصيل الفعلي والمصروفات
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('contract')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                metricMode === 'contract'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              قيمة العقود والالتزامات الكلية
            </button>
          </div>

          {/* Chart Presentation Style Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="مخطط أعمدة مقارنة ثلاثي"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">أعمدة ثلاثية</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('composed')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                chartType === 'composed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="مخطط هجين مع خط هامش الربحية"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مع هامش الربح %</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('horizontal')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                chartType === 'horizontal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="مخطط أفقي تفصيلي"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">أفقي</span>
            </button>
          </div>

          {/* Export to PDF Button */}
          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
              title="تصدير لوحة الرسوم البيانية والأرباح إلى ملف PDF معتمد"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>طباعة / تصدير PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sorting Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">حالة المشروع:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 font-medium"
            >
              <option value="all">جميع المشاريع ({projects.length})</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">مكتمل</option>
              <option value="pending">معلق / قيد التجهيز</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">الترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 font-medium"
            >
              <option value="profit_desc">الأعلى صافي ربح</option>
              <option value="profit_asc">الأقل ربحاً (أو الأكثر خسارة)</option>
              <option value="revenue_desc">الأعلى إيراداً</option>
              <option value="expenses_desc">الأعلى مصروفات وتكاليف</option>
              <option value="margin_desc">الأعلى هامش ربح (%)</option>
            </select>
          </div>
        </div>

        {/* Quick Highlights Summary Badges */}
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            إجمالي الإيرادات: <strong className="font-mono">{formatCurrency(totals.totalRev, reportCurrency)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-medium">
            إجمالي التكاليف: <strong className="font-mono">{formatCurrency(totals.totalExp, reportCurrency)}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-900 border border-cyan-200 font-bold">
            صافي الأرباح: <strong className="font-mono">{formatCurrency(totals.totalProfit, reportCurrency)}</strong>
          </span>
          {totals.topProject && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-medium hidden sm:inline">
              المشروع الأعلى ربحاً: <strong className="font-bold">{totals.topProject.name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="w-full">
        {chartData.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">لا توجد مشاريع مطابقة للفلاتر المحددة</p>
            <p className="text-xs text-slate-400 mt-1">جرّب اختيار فلتر حالة آخر لعرض المشاريع</p>
          </div>
        ) : chartType === 'horizontal' ? (
          /* Horizontal Bar Chart (Great for long project names or detailed comparisons) */
          <div className="w-full h-[420px] sm:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis
                  dataKey="shortName"
                  type="category"
                  stroke="#64748b"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700 mx-1">{value}</span>
                  )}
                />
                <Bar
                  dataKey="revenue"
                  name={metricMode === 'actual' ? 'الإيرادات المحصلة' : 'قيمة العقد'}
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="expenses"
                  name="المصروفات والتكاليف"
                  fill="#f43f5e"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="netProfit"
                  name="صافي الربح"
                  fill="#06b6d4"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : chartType === 'composed' ? (
          /* Composed Chart: Grouped Bars + Profit Margin % Line */
          <div className="w-full h-[420px] sm:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="axisLabel"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={val => `${val.toFixed(0)}%`}
                  stroke="#f59e0b"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700 mx-1">{value}</span>
                  )}
                />
                <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name={metricMode === 'actual' ? 'الإيرادات المحصلة' : 'قيمة العقد'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  yAxisId="left"
                  dataKey="expenses"
                  name="المصروفات والتكاليف"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  yAxisId="left"
                  dataKey="netProfit"
                  name="صافي الربح"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="profitMargin"
                  name="هامش الربح %"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Standard Triple-Bar Grouped Chart (Default & Most Direct) */
          <div className="w-full h-[420px] sm:h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: 15, bottom: 40 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="axisLabel"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={value => (
                    <span className="text-xs font-semibold text-slate-700 mx-1">{value}</span>
                  )}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                <Bar
                  dataKey="revenue"
                  name={metricMode === 'actual' ? 'الإيرادات المحصلة' : 'قيمة العقد'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="expenses"
                  name="المصروفات والتكاليف"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="netProfit"
                  name="صافي الربح"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.netProfit >= 0 ? '#06b6d4' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend & Explanatory Footnote */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span className="font-medium text-slate-700">
              {metricMode === 'actual' ? 'الإيرادات (التحصيل الفعلي المستلم)' : 'الإيرادات (قيمة العقد المعتمدة)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
            <span className="font-medium text-slate-700">
              {metricMode === 'actual' ? 'المصروفات (المدفوع للفريق + مصروفات المشاريع)' : 'التكاليف (مستحقات الفريق + المصروفات)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
            <span className="font-medium text-slate-700">صافي الربح المحقق لكل مشروع</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          المبالغ بالآلاف (k) وموحدة بـ <span className="font-bold text-slate-600">{currencyInfo.name} ({symbol})</span>
        </div>
      </div>
    </div>
  );
};
