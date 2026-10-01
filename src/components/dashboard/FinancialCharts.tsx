import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Layers,
  Percent,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatPercent, convertCurrency, CURRENCY_INFO } from '../../utils/formatters';

interface FinancialChartsProps {
  totalCollected: number;
  totalTeamPaid: number;
  totalExpenses: number;
  actualProfit: number;
  totalContractValue: number;
  totalTeamEntitlements: number;
  expectedProfit: number;
  projectBreakdowns?: {
    name: string;
    code: string;
    contractValue: number;
    collected: number;
    actualProfit: number;
    expectedProfit: number;
    status: string;
  }[];
}

interface MonthlyPoint {
  monthKey: string;
  monthName: string;
  shortMonth: string;
  income: number;
  projectExpenses: number;
  teamExpenses: number;
  totalExpenses: number;
  netProfit: number;
  cumulativeProfit: number;
  profitMargin: number;
  coverageRatio: number;
}

const MONTH_NAMES_AR: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  totalCollected,
  totalTeamPaid,
  totalExpenses: fallbackTotalExpenses,
  actualProfit,
  expectedProfit,
}) => {
  const { db, reportCurrency, exchangeRateSARtoEGP, filters } = useApp();
  const [activeTab, setActiveTab] = useState<'both' | 'profit' | 'income_vs_expense'>('both');
  const [timeRange, setTimeRange] = useState<'all' | 'q1' | 'y2026'>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const currencyInfo = CURRENCY_INFO[reportCurrency] || CURRENCY_INFO.SAR;

  // Aggregate monthly data from all transactions
  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    const map = new Map<string, { income: number; projectExpenses: number; teamExpenses: number }>();

    // Seed default baseline months for 2026 so chart is continuous
    const defaultMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    defaultMonths.forEach(m => {
      map.set(m, { income: 0, projectExpenses: 0, teamExpenses: 0 });
    });

    // 1. Process Client Payments (Income)
    db.clientPayments.forEach(cp => {
      if (filters.projectId && filters.projectId !== 'all' && cp.projectId !== filters.projectId) return;
      if (filters.clientId && filters.clientId !== 'all' && cp.clientId !== filters.clientId) return;

      const dateStr = cp.paymentDate || cp.createdAt;
      if (!dateStr) return;
      const monthKey = dateStr.slice(0, 7); // "YYYY-MM"

      const project = db.projects.find(p => p.id === cp.projectId);
      const curr = cp.currency || project?.currency || 'SAR';
      const convAmount = convertCurrency(cp.amount, curr, reportCurrency, exchangeRateSARtoEGP);

      const entry = map.get(monthKey) || { income: 0, projectExpenses: 0, teamExpenses: 0 };
      entry.income += convAmount;
      map.set(monthKey, entry);
    });

    // 2. Process Direct Project Expenses
    db.expenses.forEach(exp => {
      if (filters.projectId && filters.projectId !== 'all' && exp.projectId !== filters.projectId) return;

      const dateStr = exp.expenseDate || exp.createdAt;
      if (!dateStr) return;
      const monthKey = dateStr.slice(0, 7);

      const project = db.projects.find(p => p.id === exp.projectId);
      const curr = exp.currency || project?.currency || 'SAR';
      const convAmount = convertCurrency(exp.amount, curr, reportCurrency, exchangeRateSARtoEGP);

      const entry = map.get(monthKey) || { income: 0, projectExpenses: 0, teamExpenses: 0 };
      entry.projectExpenses += convAmount;
      map.set(monthKey, entry);
    });

    // 3. Process Team Payments
    db.teamPayments.forEach(tp => {
      if (filters.projectId && filters.projectId !== 'all' && tp.projectId !== filters.projectId) return;

      const dateStr = tp.paymentDate || tp.createdAt;
      if (!dateStr) return;
      const monthKey = dateStr.slice(0, 7);

      const project = db.projects.find(p => p.id === tp.projectId);
      const curr = tp.currency || project?.currency || 'SAR';
      const convAmount = convertCurrency(tp.amount, curr, reportCurrency, exchangeRateSARtoEGP);

      const entry = map.get(monthKey) || { income: 0, projectExpenses: 0, teamExpenses: 0 };
      entry.teamExpenses += convAmount;
      map.set(monthKey, entry);
    });

    // Sort months chronologically
    const sortedKeys = Array.from(map.keys()).sort();

    let cumulative = 0;
    return sortedKeys.map(key => {
      const data = map.get(key)!;
      const totalExp = data.projectExpenses + data.teamExpenses;
      const net = data.income - totalExp;
      cumulative += net;

      const monthPart = key.split('-')[1];
      const yearPart = key.split('-')[0];
      const monthName = `${MONTH_NAMES_AR[monthPart] || monthPart} ${yearPart}`;
      const shortMonth = MONTH_NAMES_AR[monthPart] || monthPart;
      const margin = data.income > 0 ? (net / data.income) * 100 : 0;
      const coverage = totalExp > 0 ? (data.income / totalExp) * 100 : data.income > 0 ? 100 : 0;

      return {
        monthKey: key,
        monthName,
        shortMonth,
        income: Math.round(data.income),
        projectExpenses: Math.round(data.projectExpenses),
        teamExpenses: Math.round(data.teamExpenses),
        totalExpenses: Math.round(totalExp),
        netProfit: Math.round(net),
        cumulativeProfit: Math.round(cumulative),
        profitMargin: Math.round(margin * 10) / 10,
        coverageRatio: Math.round(coverage),
      };
    });
  }, [db.clientPayments, db.expenses, db.teamPayments, db.projects, reportCurrency, exchangeRateSARtoEGP, filters]);

  // Filtered by selected time range
  const displayedMonthlyData = useMemo(() => {
    if (timeRange === 'q1') {
      return monthlyData.filter(d => ['2026-01', '2026-02', '2026-03'].includes(d.monthKey));
    }
    if (timeRange === 'y2026') {
      return monthlyData.filter(d => d.monthKey.startsWith('2026'));
    }
    return monthlyData;
  }, [monthlyData, timeRange]);

  // Overall calculations across displayed months
  const totalPeriodIncome = displayedMonthlyData.reduce((s, d) => s + d.income, 0);
  const totalPeriodExpenses = displayedMonthlyData.reduce((s, d) => s + d.totalExpenses, 0);
  const totalPeriodProfit = totalPeriodIncome - totalPeriodExpenses;
  const avgMonthlyProfit = displayedMonthlyData.length > 0 ? Math.round(totalPeriodProfit / displayedMonthlyData.length) : 0;
  const peakProfitMonth = [...displayedMonthlyData].sort((a, b) => b.netProfit - a.netProfit)[0];
  const peakIncomeMonth = [...displayedMonthlyData].sort((a, b) => b.income - a.income)[0];

  // Custom Interactive Tooltip for Profit Evolution Chart
  const CustomProfitTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyPoint = payload[0].payload;
      const isPositive = data.netProfit >= 0;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-right text-xs min-w-[210px] space-y-2 backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-emerald-400">{data.monthName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-800 text-slate-300">
              هامش: {data.profitMargin}%
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>الدخل / التحصيل:</span>
              </span>
              <span className="font-bold text-emerald-400">+{formatCurrency(data.income, reportCurrency)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>إجمالي المصاريف:</span>
              </span>
              <span className="font-bold text-rose-400">-{formatCurrency(data.totalExpenses, reportCurrency)}</span>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold">
              <span className="text-slate-200 font-sans">صافي الربح الشهري:</span>
              <span className={`text-sm ${isPositive ? 'text-emerald-300' : 'text-rose-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(data.netProfit, reportCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
              <span className="font-sans">الأرباح التراكمية:</span>
              <span className="text-blue-300 font-bold">{formatCurrency(data.cumulativeProfit, reportCurrency)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Interactive Tooltip for Expenses vs Income Chart
  const CustomComparisonTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyPoint = payload[0].payload;
      const difference = data.income - data.totalExpenses;
      const hasSurplus = difference >= 0;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-right text-xs min-w-[220px] space-y-2 backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
            <span className="text-cyan-400">{data.monthName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              hasSurplus ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              {hasSurplus ? 'فائض نقدي' : 'عجز في الشهر'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>إجمالي الدخل (المقبوضات):</span>
              </span>
              <span className="font-bold text-emerald-400">+{formatCurrency(data.income, reportCurrency)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>إجمالي المصروفات والمدفوعات:</span>
              </span>
              <span className="font-bold text-rose-400">-{formatCurrency(data.totalExpenses, reportCurrency)}</span>
            </div>

            <div className="text-[10px] text-slate-400 pl-4 pr-4 space-y-0.5 pt-1 border-t border-slate-800/80 font-sans">
              <div className="flex justify-between">
                <span>• مصاريف المشاريع:</span>
                <span className="font-mono text-slate-300">{formatCurrency(data.projectExpenses, reportCurrency)}</span>
              </div>
              <div className="flex justify-between">
                <span>• مدفوعات الفريق:</span>
                <span className="font-mono text-slate-300">{formatCurrency(data.teamExpenses, reportCurrency)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold">
              <span className="text-slate-200 font-sans">الرصيد الصافي (الفائض):</span>
              <span className={`text-sm ${hasSurplus ? 'text-emerald-300' : 'text-rose-400'}`}>
                {hasSurplus ? '+' : ''}{formatCurrency(difference, reportCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
              <span className="font-sans">نسبة تغطية الدخل للمصاريف:</span>
              <span className="font-bold text-cyan-300">{data.coverageRatio}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5 text-right">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                الرسوم البيانية التفاعلية للأرباح والتدفقات المالية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة دقيقة لتطور الأرباح الشهرية ومقارنة المصاريف مقابل الدخل بالـ ({currencyInfo.name}) عبر مكتبة Recharts
              </p>
            </div>
          </div>
        </div>

        {/* View and Period Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Chart View Mode Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عرض متكامل
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profit')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'profit' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تطور الأرباح
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('income_vs_expense')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'income_vs_expense' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المصاريف مقابل الدخل
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة الأشهر
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('q1')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                timeRange === 'q1' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الربع الأول Q1
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('y2026')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                timeRange === 'y2026' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عام 2026
            </button>
          </div>
        </div>
      </div>

      {/* 4 Interactive Monthly Financial KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>إجمالي الدخل المحصل</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-950">
            {formatCurrency(totalPeriodIncome || totalCollected, reportCurrency)}
          </div>
          {peakIncomeMonth && (
            <div className="text-[10px] text-emerald-700/90 mt-1 truncate">
              أعلى شهر: {peakIncomeMonth.monthName} ({formatCurrency(peakIncomeMonth.income, reportCurrency)})
            </div>
          )}
        </div>

        <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-rose-800 font-semibold mb-1">
            <span>إجمالي المصاريف والمدفوعات</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-950">
            {formatCurrency(totalPeriodExpenses || fallbackTotalExpenses, reportCurrency)}
          </div>
          <div className="text-[10px] text-rose-700/90 mt-1">
            نسبة المصاريف: {totalPeriodIncome > 0 ? ((totalPeriodExpenses / totalPeriodIncome) * 100).toFixed(1) : 0}% من الدخل
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
            <span>صافي الربح الفعلي المحقق</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className={`text-lg font-bold font-mono ${totalPeriodProfit >= 0 ? 'text-blue-950' : 'text-rose-700'}`}>
            {formatCurrency(totalPeriodProfit || actualProfit, reportCurrency)}
          </div>
          {peakProfitMonth && (
            <div className="text-[10px] text-blue-700/90 mt-1 truncate">
              ذروة الأرباح: {peakProfitMonth.monthName} ({formatCurrency(peakProfitMonth.netProfit, reportCurrency)})
            </div>
          )}
        </div>

        <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-purple-800 font-semibold mb-1">
            <span>متوسط الربح الشهري</span>
            <Percent className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-950">
            {formatCurrency(avgMonthlyProfit, reportCurrency)}
          </div>
          <div className="text-[10px] text-purple-700/90 mt-1">
            هامش الربح الكلي: {totalPeriodIncome > 0 ? ((totalPeriodProfit / totalPeriodIncome) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className={`grid gap-6 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* CHART 1: تطور الأرباح الشهرية (Monthly Profit Evolution) */}
        {(activeTab === 'both' || activeTab === 'profit') && (
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="text-sm font-bold text-slate-900">
                    تطور الأرباح الشهرية والتراكمية (Monthly Profit Evolution)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  منحنى صافي الأرباح المحققة شهرياً مع المسار التراكمي للأرباح
                </p>
              </div>

              {activeTab === 'profit' && (
                <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      chartType === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    مساحي انسيابي
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    أعمدة
                  </button>
                </div>
              )}
            </div>

            {/* Recharts Container */}
            <div className="w-full h-72 sm:h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayedMonthlyData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                  <XAxis
                    dataKey="shortMonth"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  />

                  <Tooltip content={<CustomProfitTooltip />} />

                  <Legend
                    verticalAlign="top"
                    height={36}
                    content={() => (
                      <div className="flex items-center justify-center gap-5 text-xs text-slate-600 pb-2" dir="rtl">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="font-medium">صافي الربح الشهري</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
                          <span className="font-medium">تراكمي الأرباح</span>
                        </div>
                      </div>
                    )}
                  />

                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />

                  {/* Profit Area or Bar */}
                  {chartType === 'area' || activeTab === 'both' ? (
                    <Area
                      type="monotone"
                      dataKey="netProfit"
                      name="صافي الربح الشهري"
                      stroke="#059669"
                      strokeWidth={2.5}
                      fill="url(#profitGradient)"
                      activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  ) : (
                    <Bar
                      dataKey="netProfit"
                      name="صافي الربح الشهري"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  )}

                  {/* Cumulative Profit Line */}
                  <Line
                    type="monotone"
                    dataKey="cumulativeProfit"
                    name="تراكمي الأرباح"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2563eb' }}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <span className="text-[10px] text-slate-500 block">أعلى ربح مسجل</span>
                <span className="font-mono font-bold text-emerald-700">
                  {peakProfitMonth ? formatCurrency(peakProfitMonth.netProfit, reportCurrency) : '-'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <span className="text-[10px] text-slate-500 block">متوسط الربح الشهري</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(avgMonthlyProfit, reportCurrency)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <span className="text-[10px] text-slate-500 block">إجمالي أرباح الفترة</span>
                <span className="font-mono font-bold text-blue-700">
                  {formatCurrency(totalPeriodProfit, reportCurrency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CHART 2: المصاريف مقابل الدخل (Expenses vs Income) */}
        {(activeTab === 'both' || activeTab === 'income_vs_expense') && (
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <h4 className="text-sm font-bold text-slate-900">
                    المصاريف مقابل الدخل والتحصيلات (Expenses vs. Income)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  مقارنة شهرية مباشرة بين التدفقات النقدية الداخلة والخارجة ونسبة الفائض
                </p>
              </div>

              <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto font-mono">
                فائض الفترة: {formatCurrency(totalPeriodProfit, reportCurrency)}
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-72 sm:h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayedMonthlyData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                  <XAxis
                    dataKey="shortMonth"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />

                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  />

                  <Tooltip content={<CustomComparisonTooltip />} />

                  <Legend
                    verticalAlign="top"
                    height={36}
                    content={() => (
                      <div className="flex items-center justify-center gap-5 text-xs text-slate-600 pb-2" dir="rtl">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                          <span className="font-medium">الدخل والتحصيلات</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-rose-500" />
                          <span className="font-medium">إجمالي المصاريف والمدفوعات</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 bg-indigo-600 rounded-full" />
                          <span className="font-medium">الفائض النقدي الصافي</span>
                        </div>
                      </div>
                    )}
                  />

                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />

                  {/* Income Bar */}
                  <Bar
                    dataKey="income"
                    name="الدخل والتحصيلات"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />

                  {/* Total Expenses Bar */}
                  <Bar
                    dataKey="totalExpenses"
                    name="إجمالي المصاريف والمدفوعات"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />

                  {/* Net Cashflow Line */}
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="الفائض النقدي الصافي"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50/50">
                <span className="text-[10px] text-emerald-800 block">إجمالي المقبوضات</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(totalPeriodIncome, reportCurrency)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50/50">
                <span className="text-[10px] text-rose-800 block">إجمالي المصاريف</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatCurrency(totalPeriodExpenses, reportCurrency)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50">
                <span className="text-[10px] text-slate-500 block">معدل تغطية الدخل</span>
                <span className="font-mono font-bold text-slate-900">
                  {totalPeriodExpenses > 0 ? ((totalPeriodIncome / totalPeriodExpenses) * 100).toFixed(0) : 100}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Financial Table Summary (Collapsible/Auditable Breakdown) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-800">بيان تفصيلي بالأرقام الشهرية المحققة</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {displayedMonthlyData.length} أشهر معروضة ({currencyInfo.symbol})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">الشهر المالي</th>
                <th className="py-2.5 px-3">الدخل / المقبوضات</th>
                <th className="py-2.5 px-3">مصاريف المشاريع</th>
                <th className="py-2.5 px-3">مدفوعات الفريق</th>
                <th className="py-2.5 px-3">إجمالي المصاريف</th>
                <th className="py-2.5 px-3 font-bold">صافي الربح الشهري</th>
                <th className="py-2.5 px-3">هامش الربح %</th>
                <th className="py-2.5 px-3">تراكمي الأرباح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {displayedMonthlyData.map(row => {
                const isPositive = row.netProfit >= 0;
                return (
                  <tr key={row.monthKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">{row.monthName}</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">+{formatCurrency(row.income, reportCurrency)}</td>
                    <td className="py-2 px-3 text-slate-600">-{formatCurrency(row.projectExpenses, reportCurrency)}</td>
                    <td className="py-2 px-3 text-slate-600">-{formatCurrency(row.teamExpenses, reportCurrency)}</td>
                    <td className="py-2 px-3 text-rose-700 font-bold">-{formatCurrency(row.totalExpenses, reportCurrency)}</td>
                    <td className={`py-2 px-3 font-bold text-xs ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(row.netProfit, reportCurrency)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.profitMargin >= 30 ? 'bg-emerald-100 text-emerald-800' : row.profitMargin > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.profitMargin}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-blue-700">{formatCurrency(row.cumulativeProfit, reportCurrency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
