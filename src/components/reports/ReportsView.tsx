import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  ArrowRightLeft,
  Check,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Currency, ProjectStatus } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  convertCurrency,
  CURRENCY_INFO,
  PROJECT_STATUS_MAP,
  DEFAULT_EXCHANGE_RATE_SAR_TO_EGP,
} from '../../utils/formatters';
import { exportToExcel, exportDocumentToPDF } from '../../utils/exportService';
import { StatCard } from '../common/StatCard';
import { ProjectsComparisonChart } from './ProjectsComparisonChart';
import { ReportsPrintModal } from './ReportsPrintModal';

export const ReportsView: React.FC = () => {
  const {
    db,
    overallFinancials,
    allProjectFinancials,
    setSelectedProjectId,
    reportCurrency,
    setReportCurrency,
    exchangeRateSARtoEGP,
    setExchangeRateSARtoEGP,
  } = useApp();

  const [reportType, setReportType] = useState<
    'profit_loss' | 'financial_charts' | 'projects_matrix' | 'team_payables' | 'client_receivables'
  >('profit_loss');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [showChartInMatrix, setShowChartInMatrix] = useState(true);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [customRateInput, setCustomRateInput] = useState(exchangeRateSARtoEGP.toString());

  const currentCurrencyInfo = CURRENCY_INFO[reportCurrency];
  const symbol = currentCurrencyInfo.symbol;

  const handleApplyExchangeRate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseFloat(customRateInput);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRateSARtoEGP(parsed);
      setIsEditingRate(false);
    }
  };

  // -------------------------------------------------------------
  // Data Extraction & Conversion for Tables & Exports
  // -------------------------------------------------------------
  const getReportData = () => {
    if (reportType === 'profit_loss' || reportType === 'projects_matrix' || reportType === 'financial_charts') {
      const headers = [
        'كود المشروع',
        'اسم المشروع',
        'العميل',
        'الحالة',
        'عملة التعاقد',
        'قيمة العقد الأصلية',
        `قيمة العقد الموحدة (${symbol})`,
        `إجمالي الفواتير (${symbol})`,
        `إجمالي التحصيل (${symbol})`,
        `المتبقي على العميل (${symbol})`,
        `مستحقات الفريق (${symbol})`,
        `المدفوع للفريق (${symbol})`,
        `المتبقي للفريق (${symbol})`,
        `المصروفات (${symbol})`,
        `صافي الربح الفعلي (${symbol})`,
        `الربح المتوقع (${symbol})`,
        'هامش الربح %',
      ];

      const rows = db.projects.map(p => {
        const client = db.clients.find(c => c.id === p.clientId);
        const fin = allProjectFinancials.get(p.id);
        const fromCurr = p.currency || 'SAR';

        const convertedContract = convertCurrency(p.contractValue, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedInvoiced = convertCurrency(fin?.totalInvoiced || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedCollected = convertCurrency(fin?.totalCollected || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedClientRem = convertCurrency(fin?.clientRemaining || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedTeamEntitled = convertCurrency(fin?.totalTeamEntitlements || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedTeamPaid = convertCurrency(fin?.totalTeamPaid || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedTeamRem = convertCurrency(fin?.teamRemaining || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedExpenses = convertCurrency(fin?.totalExpenses || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedActualProfit = convertCurrency(fin?.actualProfit || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
        const convertedExpectedProfit = convertCurrency(fin?.expectedProfit || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);

        return [
          p.code,
          p.name,
          client?.name || client?.companyName || '-',
          PROJECT_STATUS_MAP[p.status as ProjectStatus]?.label || p.status,
          CURRENCY_INFO[fromCurr].label,
          formatCurrency(p.contractValue, fromCurr),
          convertedContract,
          convertedInvoiced,
          convertedCollected,
          convertedClientRem,
          convertedTeamEntitled,
          convertedTeamPaid,
          convertedTeamRem,
          convertedExpenses,
          convertedActualProfit,
          convertedExpectedProfit,
          `${(fin?.actualProfitMargin || 0).toFixed(1)}%`,
        ];
      });

      return {
        title:
          reportType === 'profit_loss'
            ? `قائمة الأرباح والخسائر المجمعة (P&L) - ${currentCurrencyInfo.name}`
            : `جدول مقارنة ربحية المشاريع - موحد بـ ${currentCurrencyInfo.name}`,
        headers,
        rows,
        summaryCards: [
          { label: `إجمالي العقود (${symbol})`, value: formatCurrency(overallFinancials.totalContractValue, reportCurrency) },
          { label: `إجمالي التحصيل (${symbol})`, value: formatCurrency(overallFinancials.totalCollected, reportCurrency) },
          { label: `صافي الربح الفعلي (${symbol})`, value: formatCurrency(overallFinancials.totalActualProfit, reportCurrency) },
          { label: 'هامش الربح الإجمالي', value: `${(overallFinancials.actualProfitMargin || 0).toFixed(1)}%` },
        ],
      };
    } else if (reportType === 'team_payables') {
      const headers = [
        'عضو الفريق',
        'المسمى الوظيفي',
        'المشاريع المسندة',
        `إجمالي المستحق (${symbol})`,
        `المسدد له (${symbol})`,
        `المتبقي له (${symbol})`,
      ];

      const rows = db.teamMembers.map(m => {
        const assignments = db.projectAssignments.filter(pa => pa.teamMemberId === m.id);
        let entitledInReportCurr = 0;

        assignments.forEach(pa => {
          const p = db.projects.find(proj => proj.id === pa.projectId);
          if (p) {
            const rawEntitled =
              pa.compensationType === 'percentage'
                ? (pa.compensationValue / 100) * p.contractValue
                : pa.compensationValue;
            entitledInReportCurr += convertCurrency(
              rawEntitled,
              p.currency || 'SAR',
              reportCurrency,
              exchangeRateSARtoEGP
            );
          }
        });

        // Team payments for this member across projects
        let paidInReportCurr = 0;
        const memberPayments = db.teamPayments.filter(tp => tp.teamMemberId === m.id);
        memberPayments.forEach(tp => {
          const p = db.projects.find(proj => proj.id === tp.projectId);
          const payCurr = (tp.currency || p?.currency || 'SAR') as Currency;
          paidInReportCurr += convertCurrency(tp.amount, payCurr, reportCurrency, exchangeRateSARtoEGP);
        });

        const remInReportCurr = Math.max(0, entitledInReportCurr - paidInReportCurr);

        return [
          m.name,
          m.role,
          assignments.length,
          entitledInReportCurr,
          paidInReportCurr,
          remInReportCurr,
        ];
      });

      return {
        title: `تقرير مستحقات وأرصدة أعضاء الفريق - موحد بـ ${currentCurrencyInfo.name}`,
        headers,
        rows,
        summaryCards: [
          { label: 'عدد الكوادر', value: String(db.teamMembers.length) },
          { label: `إجمالي المستحقات (${symbol})`, value: formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency) },
          { label: `إجمالي المسدد (${symbol})`, value: formatCurrency(overallFinancials.totalTeamPaid, reportCurrency) },
          { label: `المتبقي في ذمة المشاريع (${symbol})`, value: formatCurrency(overallFinancials.totalTeamRemaining, reportCurrency) },
        ],
      };
    } else {
      // client_receivables
      const headers = [
        'العميل',
        'اسم المنشأة',
        'عدد المشاريع',
        `قيمة العقود (${symbol})`,
        `إجمالي المفوتر (${symbol})`,
        `المحصل الفعلي (${symbol})`,
        `المتبقي بذمته (${symbol})`,
      ];

      const rows = db.clients.map(c => {
        const projs = db.projects.filter(p => p.clientId === c.id);
        let cv = 0;
        let inv = 0;
        let col = 0;

        projs.forEach(p => {
          const pCurr = p.currency || 'SAR';
          cv += convertCurrency(p.contractValue, pCurr, reportCurrency, exchangeRateSARtoEGP);
          const fin = allProjectFinancials.get(p.id);
          if (fin) {
            inv += convertCurrency(fin.totalInvoiced, pCurr, reportCurrency, exchangeRateSARtoEGP);
            col += convertCurrency(fin.totalCollected, pCurr, reportCurrency, exchangeRateSARtoEGP);
          }
        });

        const rem = Math.max(0, inv - col);

        return [c.name, c.companyName || '-', projs.length, cv, inv, col, rem];
      });

      return {
        title: `تقرير أرصدة ومطالبات العملاء - موحد بـ ${currentCurrencyInfo.name}`,
        headers,
        rows,
        summaryCards: [
          { label: 'عدد العملاء', value: String(db.clients.length) },
          { label: `إجمالي الفواتير الصادرة (${symbol})`, value: formatCurrency(overallFinancials.totalInvoiced, reportCurrency) },
          { label: `إجمالي التحصيل (${symbol})`, value: formatCurrency(overallFinancials.totalCollected, reportCurrency) },
          { label: `المتبقي على العملاء (${symbol})`, value: formatCurrency(overallFinancials.totalClientRemaining, reportCurrency) },
        ],
      };
    }
  };

  // Handle Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const data = getReportData();
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToExcel(`osboha_${reportType}_${reportCurrency}_${timestamp}`, [
      {
        name: data.title.slice(0, 31),
        headers: data.headers,
        rows: data.rows,
      },
    ]);
  };

  // Handle Export to PDF
  const handleExportPDF = () => {
    const data = getReportData();
    exportDocumentToPDF({
      title: data.title,
      subtitle: `تقرير مالي موحد بعملة ${currentCurrencyInfo.name} (${symbol}) · سعر الصرف المعتمد: 1 ر.س = ${exchangeRateSARtoEGP.toFixed(2)} ج.م`,
      summaryCards: data.summaryCards,
      headers: data.headers,
      rows: data.rows.map(row =>
        row.map(cell => {
          if (typeof cell === 'number') {
            return formatCurrency(cell, reportCurrency);
          }
          return cell;
        })
      ),
      footerNotes: `تم توليد هذا التقرير تلقائياً بواسطة منصة Osboha Electric المالية. جميع المبالغ موحدة بعملة (${currentCurrencyInfo.name} - ${symbol}).`,
    });
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    const data = getReportData();
    const csvContent =
      '\uFEFF' +
      [
        data.headers.join(','),
        ...data.rows.map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `osboha_${reportType}_${reportCurrency}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Calculate currency breakdown stats
  const sarProjects = db.projects.filter(p => (p.currency || 'SAR') === 'SAR');
  const egpProjects = db.projects.filter(p => p.currency === 'EGP');

  const totalSarOriginal = sarProjects.reduce((s, p) => s + p.contractValue, 0);
  const totalEgpOriginal = egpProjects.reduce((s, p) => s + p.contractValue, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            التقارير المالية وقوائم الأرباح والخسائر
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            بيانات تحليلية مجمعة وموحدة بعملة واحدة للمشاريع، التدفقات النقدية، ومستحقات الشركاء والعملاء
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Main Interactive Print & PDF Export Button */}
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-all active:scale-95"
            title="معاينة وتصدير لوحة التقارير والرسوم البيانية إلى PDF"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>تصدير / طباعة PDF</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>خيارات التصدير</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-60 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-right animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold border-b border-slate-100">
                    تصدير موحد بـ ({currentCurrencyInfo.name})
                  </div>
                  <button
                    onClick={() => {
                      setPrintModalOpen(true);
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 bg-cyan-50/70 hover:bg-cyan-100 hover:text-cyan-900 transition-colors border-b border-cyan-100"
                  >
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                    <span>لوحة التقارير والرسوم إلى PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير ملف Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-rose-600" />
                    <span>تصدير جدول البيانات إلى PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>تصدير CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Prominent Currency Selection & Conversion Control Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-l from-emerald-900 via-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800/40 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Section 1: Selector Tabs */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ArrowRightLeft className="w-4 h-4" />
              <span>اختر عملة عرض التقارير الموحدة (Single Report Currency)</span>
            </div>
            <p className="text-xs text-slate-300">
              يتم تحويل كافة بيانات المشاريع والفواتير والمستحقات تلقائياً إلى العملة المختارة أدناه:
            </p>
          </div>

          {/* Currency Toggle Switch Buttons */}
          <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setReportCurrency('SAR')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                reportCurrency === 'SAR'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span className="text-base">🇸🇦</span>
              <span>الريال السعودي (SAR)</span>
              {reportCurrency === 'SAR' && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setReportCurrency('EGP')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                reportCurrency === 'EGP'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span className="text-base">🇪🇬</span>
              <span>الجنيه المصري (EGP)</span>
              {reportCurrency === 'EGP' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Section 2: Conversion Rate Controls & Informational Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          {/* Rate adjuster */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-300 font-medium">سعر التحويل المعتمد:</span>
            {!isEditingRate ? (
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-mono font-bold text-amber-300 text-xs">
                  1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
                </span>
                <button
                  onClick={() => {
                    setCustomRateInput(exchangeRateSARtoEGP.toString());
                    setIsEditingRate(true);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                >
                  تعديل سعر الصرف
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyExchangeRate} className="flex items-center gap-2">
                <span className="text-slate-300">1 ر.س =</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={customRateInput}
                  onChange={e => setCustomRateInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <span className="text-slate-300">ج.م</span>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md transition-colors"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
                >
                  إلغاء
                </button>
              </form>
            )}

            {/* Quick Rate Presets */}
            <div className="flex items-center gap-1 mr-2">
              <span className="text-[11px] text-slate-400">سريع:</span>
              {[12.5, 13.0, 13.5, 14.0].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setExchangeRateSARtoEGP(val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    exchangeRateSARtoEGP === val
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val.toFixed(1)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setExchangeRateSARtoEGP(DEFAULT_EXCHANGE_RATE_SAR_TO_EGP)}
                title="استعادة السعر الافتراضي"
                className="p-1 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Active summary badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>التقارير معروضة الآن بـ:</span>
              <strong className="font-bold underline">{currentCurrencyInfo.name} ({symbol})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Report Segmented Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setReportType('profit_loss')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            reportType === 'profit_loss'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          قائمة الأرباح والخسائر المجمعة (P&L)
        </button>
        <button
          onClick={() => setReportType('financial_charts')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'financial_charts'
              ? 'bg-white text-cyan-800 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-cyan-600" />
          <span>مقارنة المشاريع بيانيًا (Recharts)</span>
        </button>
        <button
          onClick={() => setReportType('projects_matrix')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            reportType === 'projects_matrix'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          جدول مقارنة ربحية المشاريع
        </button>
        <button
          onClick={() => setReportType('team_payables')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            reportType === 'team_payables'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          تقرير مستحقات وأرصدة الفريق
        </button>
        <button
          onClick={() => setReportType('client_receivables')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            reportType === 'client_receivables'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          تقرير أرصدة ومستحقات العملاء
        </button>
      </div>

      {/* ============================================================= */}
      {/* Tab 1: Comprehensive P&L Statement */}
      {/* ============================================================= */}
      {reportType === 'profit_loss' && (
        <div className="space-y-6">
          {/* Executive Overview Cards in Selected Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title={`إجمالي التحصيل الفعلي (${symbol})`}
              value={formatCurrency(overallFinancials.totalCollected, reportCurrency)}
              subtitle="إيرادات نقدية محققة"
              variant="highlight"
            />
            <StatCard
              title={`المدفوع للفريق والمصروفات (${symbol})`}
              value={formatCurrency(
                overallFinancials.totalTeamPaid + overallFinancials.totalExpenses,
                reportCurrency
              )}
              subtitle="إجمالي التكاليف المنصرفة"
              variant="warning"
            />
            <StatCard
              title={`صافي الربح الفعلي المحقق (${symbol})`}
              value={formatCurrency(overallFinancials.totalActualProfit, reportCurrency)}
              subtitle={`هامش ربح ${formatPercent(overallFinancials.actualProfitMargin)}`}
              variant="success"
            />
            <StatCard
              title={`صافي الربح المتوقع (${symbol})`}
              value={formatCurrency(overallFinancials.totalExpectedProfit, reportCurrency)}
              subtitle={`هامش ربح ${formatPercent(overallFinancials.expectedProfitMargin)}`}
            />
          </div>

          {/* Quick CTA to Recharts Comparison */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-900/90 via-slate-900 to-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-cyan-700/40 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  استعراض المقارنة البيانية التفاعلية للمشاريع (Recharts Visual Analysis)
                </h4>
                <p className="text-[11px] text-slate-300">
                  مقارنة بصرية مباشرة بين الإيرادات والمصروفات والأرباح الصافية وهوامش الربح لكل مشروع على حدة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReportType('financial_charts')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
            >
              <span>فتح الرسوم البيانية</span>
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dual-Currency Portfolio Composition Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <span>🇸🇦</span>
                  <span>المشاريع بالريال السعودي (SAR)</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {sarProjects.length} مشاريع
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-emerald-900">
                <span>القيمة الأصلية بالريال:</span>
                <span className="font-mono font-bold text-sm">{formatCurrency(totalSarOriginal, 'SAR')}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-emerald-700 mt-1">
                <span>القيمة المعادلة بـ ({symbol}):</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(
                    convertCurrency(totalSarOriginal, 'SAR', reportCurrency, exchangeRateSARtoEGP),
                    reportCurrency
                  )}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                  <span>🇪🇬</span>
                  <span>المشاريع بالجنيه المصري (EGP)</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {egpProjects.length} مشاريع
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-amber-900">
                <span>القيمة الأصلية بالجنيه:</span>
                <span className="font-mono font-bold text-sm">{formatCurrency(totalEgpOriginal, 'EGP')}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-amber-700 mt-1">
                <span>القيمة المعادلة بـ ({symbol}):</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(
                    convertCurrency(totalEgpOriginal, 'EGP', reportCurrency, exchangeRateSARtoEGP),
                    reportCurrency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Formal Accounting P&L Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  بيان الدخل والأرباح المجمعة (Statement of Profit & Loss)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حسابات مالية موحدة ومعتمدة بـ <strong className="text-emerald-700">{currentCurrencyInfo.name} ({symbol})</strong> لكافة المشاريع
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded-lg self-start sm:self-auto">
                سعر التحويل: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Revenue Section */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 bg-slate-100 p-2 rounded">
                  أولاً: الإيرادات والتحصيلات التعاقدية (Revenues)
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-slate-600">إجمالي قيمة العقود الموقع عليها:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(overallFinancials.totalContractValue, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-slate-600">إجمالي الفواتير الصادرة للعملاء:</span>
                  <span className="font-mono text-slate-700">
                    {formatCurrency(overallFinancials.totalInvoiced, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1 text-emerald-800 font-semibold bg-emerald-50/50 rounded">
                  <span>إجمالي التحصيل الفعلي المستلم (المقبوضات البنكية):</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(overallFinancials.totalCollected, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1 text-amber-800">
                  <span>المستحقات المعلقة على العملاء (فواتير لم تسدد بعد):</span>
                  <span className="font-mono">
                    {formatCurrency(overallFinancials.totalClientRemaining, reportCurrency)}
                  </span>
                </div>
              </div>

              {/* Direct Project Costs */}
              <div className="space-y-1.5 pt-2">
                <div className="font-bold text-slate-900 bg-slate-100 p-2 rounded">
                  ثانياً: تكاليف المشاريع المباشرة والتشغيلية (Direct Costs)
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-slate-600">إجمالي مستحقات أعضاء الفريق الكلية:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1 text-amber-900 bg-amber-50/50 rounded">
                  <span>إجمالي المدفوع فعلياً لأعضاء الفريق:</span>
                  <span className="font-mono font-bold">
                    -{formatCurrency(overallFinancials.totalTeamPaid, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1 text-rose-900 bg-rose-50/50 rounded">
                  <span>إجمالي مصروفات ونفقات المشاريع (سيرفرات، تراخيص، موردين):</span>
                  <span className="font-mono font-bold">
                    -{formatCurrency(overallFinancials.totalExpenses, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-1 text-slate-500 font-mono">
                  <span>المتبقي في ذمة المشاريع لأعضاء الفريق (التزامات مستقبلية):</span>
                  <span>
                    {formatCurrency(overallFinancials.totalTeamRemaining, reportCurrency)}
                  </span>
                </div>
              </div>

              {/* Net Profit Summary */}
              <div className="pt-4 border-t-2 border-slate-900 space-y-2">
                <div className="flex justify-between p-3 rounded-lg bg-emerald-900 text-white text-sm font-bold">
                  <span>صافي الربح الفعلي المحقق (السيولة الناتجة من التحصيل):</span>
                  <span className="font-mono text-base">
                    {formatCurrency(overallFinancials.totalActualProfit, reportCurrency)}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-slate-800 text-slate-100 text-xs">
                  <span>صافي الربح المتوقع عند اكتمال سداد وتحصيل كامل العقود:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(overallFinancials.totalExpectedProfit, reportCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Tab: Dedicated Projects Financial Comparison (Recharts)       */}
      {/* ============================================================= */}
      {reportType === 'financial_charts' && (
        <div className="space-y-6">
          <ProjectsComparisonChart
            projects={db.projects}
            allProjectFinancials={allProjectFinancials}
            reportCurrency={reportCurrency}
            exchangeRateSARtoEGP={exchangeRateSARtoEGP}
            onSelectProject={setSelectedProjectId}
            onExportPDF={() => setPrintModalOpen(true)}
          />
        </div>
      )}

      {/* ============================================================= */}
      {/* Tab 2: Projects Matrix Table */}
      {/* ============================================================= */}
      {reportType === 'projects_matrix' && (
        <div className="space-y-6">
          {/* Integrated Recharts Comparison in Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-600" />
                <span className="text-xs font-bold text-slate-800">
                  التمثيل البياني لمقارنة إيرادات ومصروفات وأرباح المشاريع (Recharts)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowChartInMatrix(prev => !prev)}
                className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
              >
                {showChartInMatrix ? 'إخفاء الرسم البياني' : 'إظهار الرسم البياني'}
              </button>
            </div>

            {showChartInMatrix && (
              <div className="p-2 sm:p-4">
                <ProjectsComparisonChart
                  projects={db.projects}
                  allProjectFinancials={allProjectFinancials}
                  reportCurrency={reportCurrency}
                  exchangeRateSARtoEGP={exchangeRateSARtoEGP}
                  onSelectProject={setSelectedProjectId}
                  onExportPDF={() => setPrintModalOpen(true)}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  جدول مقارنة ربحية المشاريع (موحد بـ {currentCurrencyInfo.name} - {symbol})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تظهر جميع أرقام المشاريع محولة وموحدة بالعملة المختارة، مع إيضاح العملة الأصلية لكل مشروع.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono">
                سعر التحويل: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
              </span>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3">كود</th>
                  <th className="py-3 px-3">المشروع</th>
                  <th className="py-3 px-3">العميل</th>
                  <th className="py-3 px-3">عملة التعاقد</th>
                  <th className="py-3 px-3">القيمة الأصلية</th>
                  <th className="py-3 px-3">القيمة الموحدة ({symbol})</th>
                  <th className="py-3 px-3">الفواتير ({symbol})</th>
                  <th className="py-3 px-3">التحصيل ({symbol})</th>
                  <th className="py-3 px-3">متبقي العميل ({symbol})</th>
                  <th className="py-3 px-3">مستحق الفريق ({symbol})</th>
                  <th className="py-3 px-3">مدفوع الفريق ({symbol})</th>
                  <th className="py-3 px-3">المصروفات ({symbol})</th>
                  <th className="py-3 px-3">الربح الفعلي ({symbol})</th>
                  <th className="py-3 px-3">الربح المتوقع ({symbol})</th>
                  <th className="py-3 px-3">هامش الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.projects.map(proj => {
                  const client = db.clients.find(c => c.id === proj.clientId);
                  const fin = allProjectFinancials.get(proj.id);
                  const fromCurr = proj.currency || 'SAR';

                  const convContract = convertCurrency(proj.contractValue, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convInvoiced = convertCurrency(fin?.totalInvoiced || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convCollected = convertCurrency(fin?.totalCollected || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convClientRem = convertCurrency(fin?.clientRemaining || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convTeamEntitled = convertCurrency(fin?.totalTeamEntitlements || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convTeamPaid = convertCurrency(fin?.totalTeamPaid || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convExpenses = convertCurrency(fin?.totalExpenses || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convActualProfit = convertCurrency(fin?.actualProfit || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);
                  const convExpectedProfit = convertCurrency(fin?.expectedProfit || 0, fromCurr, reportCurrency, exchangeRateSARtoEGP);

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedProjectId(proj.id)}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-500">{proj.code}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 hover:text-emerald-700">{proj.name}</td>
                      <td className="py-3 px-3 text-slate-600">{client?.name || '-'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            fromCurr === 'EGP'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <span>{fromCurr === 'EGP' ? '🇪🇬' : '🇸🇦'}</span>
                          <span>{CURRENCY_INFO[fromCurr].code}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(proj.contractValue, fromCurr)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(convContract, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(convInvoiced, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(convCollected, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-700 whitespace-nowrap">
                        {formatCurrency(convClientRem, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(convTeamEntitled, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-800 whitespace-nowrap">
                        {formatCurrency(convTeamPaid, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-700 whitespace-nowrap">
                        {formatCurrency(convExpenses, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {formatCurrency(convActualProfit, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatCurrency(convExpectedProfit, reportCurrency)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {formatPercent(fin?.actualProfitMargin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Overall Row Footer in Selected Currency */}
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="py-3 px-3 text-slate-900">
                    الإجمالي الموحد بـ ({currentCurrencyInfo.name} - {symbol}):
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-900 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalContractValue, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-900 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalInvoiced, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-800 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalCollected, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-800 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalClientRemaining, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-900 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-900 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalTeamPaid, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-rose-900 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalExpenses, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-950 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalActualProfit, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-950 whitespace-nowrap">
                    {formatCurrency(overallFinancials.totalExpectedProfit, reportCurrency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-900">
                    {formatPercent(overallFinancials.actualProfitMargin)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* ============================================================= */}
      {/* Tab 3: Team Payables Balance */}
      {/* ============================================================= */}
      {reportType === 'team_payables' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                كشف أرصدة ومستحقات أعضاء الفريق (موحد بـ {currentCurrencyInfo.name} - {symbol})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يتم تحويل استحقاقات ودفعات الكوادر من مختلف المشاريع إلى العملة الموحدة المختارة.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono">
              سعر الصرف: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">عضو الفريق</th>
                  <th className="py-3 px-4">المسمى الوظيفي</th>
                  <th className="py-3 px-4">عدد المشاريع</th>
                  <th className="py-3 px-4">إجمالي المستحق ({symbol})</th>
                  <th className="py-3 px-4">المسدد له ({symbol})</th>
                  <th className="py-3 px-4">المتبقي المطلوب صرفه ({symbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.teamMembers.map(m => {
                  const assignments = db.projectAssignments.filter(pa => pa.teamMemberId === m.id);
                  let entitled = 0;
                  assignments.forEach(pa => {
                    const p = db.projects.find(proj => proj.id === pa.projectId);
                    if (p) {
                      const val =
                        pa.compensationType === 'percentage'
                          ? (pa.compensationValue / 100) * p.contractValue
                          : pa.compensationValue;
                      entitled += convertCurrency(
                        val,
                        p.currency || 'SAR',
                        reportCurrency,
                        exchangeRateSARtoEGP
                      );
                    }
                  });

                  let paid = 0;
                  const memberPayments = db.teamPayments.filter(tp => tp.teamMemberId === m.id);
                  memberPayments.forEach(tp => {
                    const p = db.projects.find(proj => proj.id === tp.projectId);
                    const payCurr = (tp.currency || p?.currency || 'SAR') as Currency;
                    paid += convertCurrency(tp.amount, payCurr, reportCurrency, exchangeRateSARtoEGP);
                  });

                  const rem = Math.max(0, entitled - paid);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4 text-slate-600">{m.role}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{assignments.length}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(entitled, reportCurrency)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {formatCurrency(paid, reportCurrency)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {formatCurrency(rem, reportCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-900">
                    الإجمالي الموحد للفريق:
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900">
                    {formatCurrency(overallFinancials.totalTeamEntitlements, reportCurrency)}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-800">
                    {formatCurrency(overallFinancials.totalTeamPaid, reportCurrency)}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-800">
                    {formatCurrency(overallFinancials.totalTeamRemaining, reportCurrency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Tab 4: Client Receivables */}
      {/* ============================================================= */}
      {reportType === 'client_receivables' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                كشف ذمم ومستحقات العملاء (موحد بـ {currentCurrencyInfo.name} - {symbol})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تفصيل العقود، الفواتير، التحصيلات، والأرصدة المستحقة بذمة العملاء محولة للعملة الموحدة.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono">
              سعر الصرف: 1 ر.س = {exchangeRateSARtoEGP.toFixed(2)} ج.م
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الشركة</th>
                  <th className="py-3 px-4">المشاريع</th>
                  <th className="py-3 px-4">إجمالي العقود ({symbol})</th>
                  <th className="py-3 px-4">إجمالي الفواتير ({symbol})</th>
                  <th className="py-3 px-4">المحصل الفعلي ({symbol})</th>
                  <th className="py-3 px-4">المتبقي بذمته ({symbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.clients.map(c => {
                  const projs = db.projects.filter(p => p.clientId === c.id);
                  let cv = 0;
                  let inv = 0;
                  let col = 0;

                  projs.forEach(p => {
                    const pCurr = p.currency || 'SAR';
                    cv += convertCurrency(p.contractValue, pCurr, reportCurrency, exchangeRateSARtoEGP);
                    const fin = allProjectFinancials.get(p.id);
                    if (fin) {
                      inv += convertCurrency(fin.totalInvoiced, pCurr, reportCurrency, exchangeRateSARtoEGP);
                      col += convertCurrency(fin.totalCollected, pCurr, reportCurrency, exchangeRateSARtoEGP);
                    }
                  });

                  const rem = Math.max(0, inv - col);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-slate-600">{c.companyName || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{projs.length}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {formatCurrency(cv, reportCurrency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {formatCurrency(inv, reportCurrency)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {formatCurrency(col, reportCurrency)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {formatCurrency(rem, reportCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-slate-900">
                    الإجمالي الموحد لكافة العملاء:
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900">
                    {formatCurrency(overallFinancials.totalContractValue, reportCurrency)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900">
                    {formatCurrency(overallFinancials.totalInvoiced, reportCurrency)}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-800">
                    {formatCurrency(overallFinancials.totalCollected, reportCurrency)}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-800">
                    {formatCurrency(overallFinancials.totalClientRemaining, reportCurrency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Official Printable PDF Modal with Recharts & Performance Matrix */}
      <ReportsPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        initialReportType={reportType === 'team_payables' || reportType === 'client_receivables' ? 'profit_loss' : reportType}
      />
    </div>
  );
};
