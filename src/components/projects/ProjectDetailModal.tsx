import React, { useState } from 'react';
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  Calendar,
  Layers,
  Percent,
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  Briefcase,
  AlertCircle,
  Download,
  FileSpreadsheet,
  ChevronDown,
  Wallet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatSAR, formatCurrency, formatPercent, formatDate, PROJECT_STATUS_MAP, INVOICE_STATUS_MAP, EXPENSE_CATEGORY_MAP, PAYMENT_METHOD_MAP } from '../../utils/formatters';
import { exportToExcel, exportDocumentToPDF } from '../../utils/exportService';

interface ProjectDetailModalProps {
  projectId: string | null;
  onClose: () => void;
  onOpenEdit: () => void;
  onOpenCreateInvoice: (projectId: string) => void;
  onOpenCreateClientPayment: (projectId: string) => void;
  onOpenCreateTeamPayment: (projectId: string, teamMemberId?: string) => void;
  onOpenCreateExpense: (projectId: string) => void;
  onPrintInvoice: (invoiceId: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  onClose,
  onOpenEdit,
  onOpenCreateInvoice,
  onOpenCreateClientPayment,
  onOpenCreateTeamPayment,
  onOpenCreateExpense,
  onPrintInvoice,
}) => {
  const { db, getProjectFinancials, deleteInvoice, deleteClientPayment, deleteTeamPayment, deleteExpense } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'client-payments' | 'team' | 'expenses' | 'gantt'>('overview');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  if (!projectId) return null;

  const project = db.projects.find(p => p.id === projectId);
  if (!project) return null;

  const client = db.clients.find(c => c.id === project.clientId);
  const fin = getProjectFinancials(projectId);
  const statusMeta = PROJECT_STATUS_MAP[project.status];
  const projectTasks = db.tasks.filter(t => t.projectId === projectId);

  const handleExportProjectExcel = () => {
    // 1. Overview Sheet
    const overviewHeaders = ['البند المالي', 'القيمة (SAR)'];
    const overviewRows = [
      ['قيمة العقد الإجمالية', project.contractValue],
      ['الميزانية المعتمدة للمصروفات', project.approvedBudget || 0],
      ['إجمالي الفواتير الصادرة', fin?.totalInvoiced || 0],
      ['إجمالي المبالغ المحصلة من العميل', fin?.totalCollected || 0],
      ['المتبقي بذمة العميل', fin?.clientRemaining || 0],
      ['إجمالي مستحقات أعضاء الفريق', fin?.totalTeamEntitlements || 0],
      ['إجمالي المسدد لأعضاء الفريق', fin?.totalTeamPaid || 0],
      ['المتبقي لأعضاء الفريق', fin?.teamRemaining || 0],
      ['إجمالي مصروفات المشروع المنفذة', fin?.totalExpenses || 0],
      ['المتبقي من الميزانية المعتمدة', fin?.budgetRemaining || 0],
      ['نسبة استهلاك الميزانية', `${(fin?.budgetUsagePercent || 0).toFixed(1)}%`],
      ['صافي الربح الفعلي المحقق', fin?.actualProfit || 0],
      ['صافي الربح المتوقع عند اكتمال العقد', fin?.expectedProfit || 0],
      ['نسبة هامش الربح الفعلي', `${(fin?.actualProfitMargin || 0).toFixed(1)}%`],
    ];

    // 2. Invoices Sheet
    const invoiceHeaders = ['رقم الفاتورة', 'تاريخ الإصدار', 'تاريخ الاستحقاق', 'المبلغ قبل الضريبة', 'الضريبة', 'الإجمالي', 'المسدد', 'المتبقي', 'الحالة'];
    const invoiceRows = (fin?.invoices || []).map(inv => [
      inv.invoiceNumber,
      formatDate(inv.issueDate),
      formatDate(inv.dueDate),
      inv.subtotal,
      inv.taxAmount,
      inv.totalAmount,
      inv.paidAmount,
      inv.remainingAmount,
      INVOICE_STATUS_MAP[inv.status]?.label || inv.status,
    ]);

    // 3. Client Payments Sheet
    const payHeaders = ['رقم السند', 'المبلغ', 'التاريخ', 'طريقة الدفع', 'الرقم المرجعي', 'ملاحظات'];
    const payRows = (fin?.clientPayments || []).map(cp => [
      cp.paymentNumber,
      cp.amount,
      formatDate(cp.paymentDate),
      PAYMENT_METHOD_MAP[cp.paymentMethod] || cp.paymentMethod,
      cp.referenceNumber,
      cp.notes || '',
    ]);

    // 4. Team Sheet
    const teamHeaders = ['العضو', 'الدور في المشروع', 'نوع المستحق', 'القيمة المحددة', 'إجمالي المستحق', 'المدفوع', 'المتبقي'];
    const teamRows = (fin?.teamMembers || []).map(tm => [
      tm.name,
      tm.role,
      tm.compensationType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت',
      tm.compensationType === 'percentage' ? `${tm.compensationValue}%` : tm.compensationValue,
      tm.entitledAmount,
      tm.paidAmount,
      tm.remainingAmount,
    ]);

    // 5. Expenses Sheet
    const expHeaders = ['رقم المصروف', 'التصنيف', 'الوصف', 'المورد', 'المبلغ', 'التاريخ', 'طريقة الدفع'];
    const expRows = (fin?.expenses || []).map(exp => [
      exp.expenseNumber,
      EXPENSE_CATEGORY_MAP[exp.category] || exp.category,
      exp.description,
      exp.vendor,
      exp.amount,
      formatDate(exp.expenseDate),
      exp.paymentMethod,
    ]);

    exportToExcel(`تقرير_مشروع_${project.code}`, [
      { name: 'الملخص المالي', headers: overviewHeaders, rows: overviewRows },
      { name: 'الفواتير', headers: invoiceHeaders, rows: invoiceRows },
      { name: 'دفعات العميل', headers: payHeaders, rows: payRows },
      { name: 'مستحقات الفريق', headers: teamHeaders, rows: teamRows },
      { name: 'المصروفات', headers: expHeaders, rows: expRows },
    ]);
  };

  const handleExportProjectPDF = () => {
    exportDocumentToPDF({
      title: `كشف حساب وتقرير أداء مشروع: ${project.name} (${project.code})`,
      subtitle: `العميل: ${client?.name || '-'} · الفترة: من ${formatDate(project.startDate)} إلى ${formatDate(project.endDate)}`,
      summaryCards: [
        { label: 'قيمة العقد', value: formatCurrency(project.contractValue, project.currency) },
        { label: 'الميزانية المعتمدة', value: formatCurrency(project.approvedBudget || 0, project.currency) },
        { label: 'المحصل من العميل', value: formatCurrency(fin?.totalCollected, project.currency) },
        { label: 'المصروفات المنفذة', value: formatCurrency(fin?.totalExpenses, project.currency) },
        { label: 'صافي الربح الفعلي', value: formatCurrency(fin?.actualProfit, project.currency) },
      ],
      headers: ['البيان المالي', `المبلغ (${project.currency === 'EGP' ? 'EGP' : 'SAR'})`, 'ملاحظات وتفاصيل الحساب'],
      rows: [
        ['قيمة العقد الإجمالية', formatCurrency(project.contractValue, project.currency), 'القيمة التعاقدية للمشروع'],
        ['الميزانية المعتمدة للمصروفات', formatCurrency(project.approvedBudget || 0, project.currency), `نسبة الاستهلاك الحالية ${(fin?.budgetUsagePercent || 0).toFixed(1)}%`],
        ['إجمالي الفواتير الصادرة', formatCurrency(fin?.totalInvoiced, project.currency), `${fin?.invoices.length || 0} فاتورة ضريبية`],
        ['إجمالي التحصيل الفعلي', formatCurrency(fin?.totalCollected, project.currency), 'المبالغ المودعة بحساب الشركة'],
        ['المتبقي بذمة العميل', formatCurrency(fin?.clientRemaining, project.currency), 'مطالبات جارية'],
        ['إجمالي مستحقات الفريق', formatCurrency(fin?.totalTeamEntitlements, project.currency), 'مجموع نسب ومبالغ الفريق'],
        ['المدفوع لأعضاء الفريق', formatCurrency(fin?.totalTeamPaid, project.currency), 'تحويلات مسددة'],
        ['المتبقي لأعضاء الفريق', formatCurrency(fin?.teamRemaining, project.currency), 'مستحقات معلقة'],
        ['مصروفات المشروع المباشرة', formatCurrency(fin?.totalExpenses, project.currency), `${fin?.expenses.length || 0} سند صرف`],
        ['الرصيد المتبقي بالميزانية', formatCurrency(fin?.budgetRemaining, project.currency), fin?.isOverBudget ? 'تنبيه: تجاوز الميزانية' : 'ضمن الحدود المقررة'],
        ['صافي الربح الفعلي الحالي', formatCurrency(fin?.actualProfit, project.currency), `هامش ربح ${(fin?.actualProfitMargin || 0).toFixed(1)}%`],
        ['الربح المتوقع الإجمالي', formatCurrency(fin?.expectedProfit, project.currency), `هامش متوقع ${(fin?.expectedProfitMargin || 0).toFixed(1)}%`],
      ],
    });
  };

  return (
    <Modal
      isOpen={Boolean(projectId)}
      onClose={onClose}
      title={`${project.code} - ${project.name}`}
      subtitle={`العميل: ${client?.name || 'غير محدد'} · القيمة: ${formatSAR(project.contractValue)}`}
      maxWidth="5xl"
    >
      <div className="space-y-6 text-right">
        {/* Top Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}>
              {statusMeta.label}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              من {formatDate(project.startDate)} إلى {formatDate(project.endDate)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(prev => !prev)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>تصدير الكشف</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-right animate-in fade-in duration-100">
                    <button
                      onClick={() => {
                        handleExportProjectExcel();
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تصدير كشف Excel</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportProjectPDF();
                        setExportMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-rose-600" />
                      <span>تقرير PDF للطباعة</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onOpenEdit}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              تعديل المشروع
            </button>
            <button
              onClick={() => onOpenCreateInvoice(project.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فاتورة</span>
            </button>
            <button
              onClick={() => onOpenCreateClientPayment(project.id)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>دفعة عميل</span>
            </button>
          </div>
        </div>

        {/* 10 Live Financial KPIs for this Project */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[11px] text-slate-500">قيمة المشروع</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(project.contractValue, project.currency)}</div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>الميزانية المعتمدة</span>
              {project.approvedBudget && project.approvedBudget > 0 ? (
                <span className={`font-mono text-[10px] font-bold ${
                  fin?.isOverBudget ? 'text-rose-600' : (fin?.budgetUsagePercent || 0) >= 90 ? 'text-orange-600' : 'text-emerald-700'
                }`}>
                  {(fin?.budgetUsagePercent || 0).toFixed(0)}%
                </span>
              ) : null}
            </div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(project.approvedBudget || 0, project.currency)}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[11px] text-slate-500">إجمالي الفواتير</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(fin?.totalInvoiced, project.currency)}</div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
            <div className="text-[11px] text-emerald-800 font-medium">إجمالي التحصيل</div>
            <div className="text-base font-bold font-mono text-emerald-900 mt-1">{formatCurrency(fin?.totalCollected, project.currency)}</div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
            <div className="text-[11px] text-amber-800 font-medium">المتبقي على العميل</div>
            <div className="text-base font-bold font-mono text-amber-900 mt-1">{formatCurrency(fin?.clientRemaining, project.currency)}</div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[11px] text-slate-500">مستحقات الفريق</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(fin?.totalTeamEntitlements, project.currency)}</div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[11px] text-slate-500">المدفوع للفريق</div>
            <div className="text-base font-bold font-mono text-amber-700 mt-1">{formatCurrency(fin?.totalTeamPaid, project.currency)}</div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="text-[11px] text-slate-500">المتبقي للفريق</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(fin?.teamRemaining, project.currency)}</div>
          </div>

          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg">
            <div className="flex justify-between items-center text-[11px] text-rose-800 font-medium">
              <span>المصروفات الحالية</span>
              {project.approvedBudget && project.approvedBudget > 0 && (
                <span className="font-mono text-[10px] text-rose-700">
                  من {formatCurrency(project.approvedBudget, project.currency)}
                </span>
              )}
            </div>
            <div className="text-base font-bold font-mono text-rose-900 mt-1">{formatCurrency(fin?.totalExpenses, project.currency)}</div>
          </div>

          <div className="p-3 bg-emerald-900 text-white rounded-lg col-span-2 sm:col-span-1 lg:col-span-3">
            <div className="flex justify-between items-center text-[11px] text-emerald-200">
              <span>الربح الفعلي المحقق</span>
              <span className="font-mono text-emerald-300 font-bold">{formatPercent(fin?.actualProfitMargin)}</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1">{formatCurrency(fin?.actualProfit, project.currency)}</div>
            <div className="text-[10px] text-emerald-300/80 mt-1">
              الربح المتوقع: <span className="font-mono">{formatCurrency(fin?.expectedProfit, project.currency)}</span>
            </div>
          </div>
        </div>

        {/* Budget Progress & Expenses Monitoring Section (Required by User Prompt) */}
        <div className={`p-4 rounded-xl border transition-all ${
          !project.approvedBudget || project.approvedBudget <= 0
            ? 'bg-slate-50/80 border-slate-200'
            : fin?.isOverBudget
            ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
            : (fin?.budgetUsagePercent || 0) >= 90
            ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-200'
            : (fin?.budgetUsagePercent || 0) >= 70
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-lg shrink-0 ${
                !project.approvedBudget || project.approvedBudget <= 0
                  ? 'bg-slate-200 text-slate-700'
                  : fin?.isOverBudget
                  ? 'bg-rose-600 text-white animate-pulse'
                  : (fin?.budgetUsagePercent || 0) >= 90
                  ? 'bg-orange-600 text-white'
                  : (fin?.budgetUsagePercent || 0) >= 70
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    مؤشر تقدم المصروفات مقابل الميزانية المعتمدة
                  </h4>
                  {/* Status Badge */}
                  {!project.approvedBudget || project.approvedBudget <= 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      لم تحدد ميزانية
                    </span>
                  ) : fin?.isOverBudget ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>تجاوز الميزانية بنسبة {((fin?.budgetUsagePercent || 0) - 100).toFixed(1)}%!</span>
                    </span>
                  ) : (fin?.budgetUsagePercent || 0) >= 90 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-600" />
                      <span>اقتراب من الحد الأقصى ({((fin?.budgetUsagePercent || 0)).toFixed(1)}%)</span>
                    </span>
                  ) : (fin?.budgetUsagePercent || 0) >= 70 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      استهلاك متقدم ({((fin?.budgetUsagePercent || 0)).toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>ضمن حدود الميزانية الآمنة ({((fin?.budgetUsagePercent || 0)).toFixed(1)}%)</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {project.approvedBudget && project.approvedBudget > 0
                    ? `إجمالي المصروفات المنفذة حتى الآن ${formatCurrency(fin?.totalExpenses, project.currency)} من أصل ${formatCurrency(project.approvedBudget, project.currency)} الميزانية المعتمدة`
                    : 'لم يتم اعتماد سقف ميزانية محددة لهذا المشروع'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {(!project.approvedBudget || project.approvedBudget <= 0) ? (
                <button
                  type="button"
                  onClick={onOpenEdit}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors"
                >
                  تعيين ميزانية معتمدة
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                    fin?.isOverBudget
                      ? 'bg-rose-100 border-rose-300 text-rose-800'
                      : (fin?.budgetUsagePercent || 0) >= 90
                      ? 'bg-orange-100 border-orange-300 text-orange-800'
                      : (fin?.budgetUsagePercent || 0) >= 70
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                  }`}>
                    {(fin?.budgetUsagePercent || 0).toFixed(1)}% تم استهلاكه
                  </span>
                  <button
                    type="button"
                    onClick={onOpenEdit}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 text-xs"
                    title="تعديل الميزانية المعتمدة"
                  >
                    تعديل
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar & Indicators */}
          {project.approvedBudget && project.approvedBudget > 0 ? (
            <div className="space-y-2 mt-3">
              {/* Outer Progress Track */}
              <div className="relative w-full bg-slate-200/90 rounded-full h-4 overflow-hidden p-0.5 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    fin?.isOverBudget
                      ? 'bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 animate-pulse'
                      : (fin?.budgetUsagePercent || 0) >= 90
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                      : (fin?.budgetUsagePercent || 0) >= 70
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, fin?.budgetUsagePercent || 0))}%` }}
                />
              </div>

              {/* Ticks and scale marks */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
                <span>0% (البداية)</span>
                <span>50%</span>
                <span className="text-amber-700 font-medium">75% (تحذير)</span>
                <span className="font-bold text-slate-800">100% (سقف الميزانية)</span>
              </div>

              {/* 4 Detail Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 text-right shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">الميزانية المعتمدة</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 mt-0.5 block">
                    {formatCurrency(project.approvedBudget, project.currency)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 text-right shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">المصروفات المنفذة</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-rose-700 mt-0.5 block">
                    {formatCurrency(fin?.totalExpenses, project.currency)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 text-right shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">
                    {fin?.isOverBudget ? 'العجز المتجاوز للميزانية' : 'الرصيد المتبقي بالميزانية'}
                  </span>
                  <span className={`font-mono font-bold text-xs sm:text-sm mt-0.5 block ${
                    fin?.isOverBudget ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {fin?.isOverBudget
                      ? `-${formatCurrency(Math.abs(fin.budgetRemaining), project.currency)}`
                      : formatCurrency(fin?.budgetRemaining, project.currency)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 text-right shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">نسبة الاستهلاك الحالية</span>
                  <span className={`font-mono font-bold text-xs sm:text-sm mt-0.5 block ${
                    fin?.isOverBudget
                      ? 'text-rose-700'
                      : (fin?.budgetUsagePercent || 0) >= 90
                      ? 'text-orange-700'
                      : (fin?.budgetUsagePercent || 0) >= 70
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}>
                    {(fin?.budgetUsagePercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Alert Banner if over budget */}
              {fin?.isOverBudget && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-950 flex items-start gap-2.5 mt-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">تحذير مالي: تجاوز الميزانية المعتمدة!</span>
                    <p className="text-[11px] text-rose-900 mt-0.5">
                      تجاوزت المصروفات المسجلة لهذا المشروع الميزانية المعتمدة بمقدار <strong>{formatCurrency(Math.abs(fin.budgetRemaining), project.currency)}</strong>. يرجى مراجعة وتدقيق بنود الصرف أو رفع طلب ملحق مالي للمشروع.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 mt-2">
              <span>لم يتم اعتماد سقف ميزانية للمصروفات لهذا المشروع. يمكنك تحديد الميزانية لمتابعة نسبة الإنفاق والتحكم بالتكاليف.</span>
              <button
                type="button"
                onClick={onOpenEdit}
                className="px-3 py-1 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg text-xs self-start sm:self-auto"
              >
                تحديد الميزانية الآن
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs inside Project Drawer */}
        <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نظرة عامة والربحية
          </button>
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'invoices'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>الفواتير</span>
            <span className="px-1.5 py-0.2 bg-slate-200 rounded text-[10px] font-mono">
              {fin?.invoices.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('client-payments')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'client-payments'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>دفعات العميل (المقبوضات)</span>
            <span className="px-1.5 py-0.2 bg-slate-200 rounded text-[10px] font-mono">
              {fin?.clientPayments.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('team')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'team'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>فريق العمل والمستحقات</span>
            <span className="px-1.5 py-0.2 bg-slate-200 rounded text-[10px] font-mono">
              {fin?.teamMembers.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'expenses'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>مصروفات المشروع</span>
            <span className="px-1.5 py-0.2 bg-slate-200 rounded text-[10px] font-mono">
              {fin?.expenses.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('gantt')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'gantt'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>مخطط المهام وجانت</span>
            <span className="px-1.5 py-0.2 bg-slate-200 rounded text-[10px] font-mono">
              {projectTasks.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeSubTab === 'overview' && (
          <div className="space-y-4">
            {project.description && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">وصف ونطاق المشروع:</span>
                <p>{project.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Financial Calculation Statement */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 border-b pb-2">بيان الربح الفعلي المحقق</h4>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(+) التحصيل الفعلي من العميل:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(fin?.totalCollected, project.currency)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(-) إجمالي المدفوع لأعضاء الفريق:</span>
                  <span className="font-mono font-bold text-amber-700">{formatCurrency(fin?.totalTeamPaid, project.currency)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(-) إجمالي مصروفات المشروع:</span>
                  <span className="font-mono font-bold text-rose-700">{formatCurrency(fin?.totalExpenses, project.currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-sm bg-slate-50 px-2 rounded">
                  <span className="text-slate-900">(=) صافي الربح الفعلي:</span>
                  <span className={`font-mono ${(fin?.actualProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(fin?.actualProfit, project.currency)}
                  </span>
                </div>
              </div>

              {/* Projected Profit Statement */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 border-b pb-2">بيان الربح المتوقع عند اكتمال العقد</h4>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(+) قيمة المشروع التعاقدية:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(project.contractValue, project.currency)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(-) إجمالي مستحقات الفريق الكلية:</span>
                  <span className="font-mono font-bold text-amber-700">{formatCurrency(fin?.totalTeamEntitlements, project.currency)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(-) مصروفات المشروع:</span>
                  <span className="font-mono font-bold text-rose-700">{formatCurrency(fin?.totalExpenses, project.currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-sm bg-slate-50 px-2 rounded">
                  <span className="text-slate-900">(=) صافي الربح المتوقع:</span>
                  <span className={`font-mono ${(fin?.expectedProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(fin?.expectedProfit, project.currency)}
                  </span>
                </div>
              </div>

              {/* Budget Control Statement */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span>بيان الميزانية المعتمدة والإنفاق</span>
                  {project.approvedBudget && project.approvedBudget > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      fin?.isOverBudget ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {(fin?.budgetUsagePercent || 0).toFixed(0)}%
                    </span>
                  )}
                </h4>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(+) الميزانية المعتمدة:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(project.approvedBudget || 0, project.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(-) المصروفات المنفذة:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatCurrency(fin?.totalExpenses, project.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">(=) {fin?.isOverBudget ? 'تجاوز العجز:' : 'الرصيد المتاح:'}</span>
                  <span className={`font-mono font-bold ${fin?.isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {fin?.isOverBudget
                      ? `-${formatCurrency(Math.abs(fin.budgetRemaining), project.currency)}`
                      : formatCurrency(fin?.budgetRemaining, project.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-xs bg-slate-50 px-2 rounded">
                  <span className="text-slate-900">حالة الالتزام:</span>
                  <span className={fin?.isOverBudget ? 'text-rose-700' : (fin?.budgetUsagePercent || 0) >= 90 ? 'text-orange-700' : 'text-emerald-700'}>
                    {fin?.isOverBudget
                      ? 'تجاوزت الميزانية'
                      : (fin?.budgetUsagePercent || 0) >= 90
                      ? 'اقتراب من السقف'
                      : 'ضمن النطاق الآمن'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Invoices */}
        {activeSubTab === 'invoices' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">فواتير المشروع الصادرة للعميل</span>
              <button
                type="button"
                onClick={() => onOpenCreateInvoice(project.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إصدار فاتورة جديدة</span>
              </button>
            </div>

            {fin?.invoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                لم تصدر أي فواتير لهذا المشروع حتى الآن
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">رقم الفاتورة</th>
                      <th className="py-2.5 px-3">تاريخ الإصدار</th>
                      <th className="py-2.5 px-3">تاريخ الاستحقاق</th>
                      <th className="py-2.5 px-3">قيمة الفاتورة</th>
                      <th className="py-2.5 px-3">المحصّل</th>
                      <th className="py-2.5 px-3">المتبقي</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fin?.invoices.map(inv => {
                      const statusMeta = INVOICE_STATUS_MAP[inv.status];
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(inv.issueDate)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(inv.dueDate)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatSAR(inv.totalAmount)}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-700">{formatSAR(inv.paidAmount)}</td>
                          <td className="py-2.5 px-3 font-mono text-amber-700">{formatSAR(inv.remainingAmount)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onPrintInvoice(inv.id)}
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100"
                              title="طباعة الفاتورة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteInvoice(inv.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Client Payments */}
        {activeSubTab === 'client-payments' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">دفعات المقبوضات المستلمة من العميل</span>
              <button
                type="button"
                onClick={() => onOpenCreateClientPayment(project.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل دفعة عميل</span>
              </button>
            </div>

            {fin?.clientPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                لم يتم تسجيل أي مقبوضات من العميل بعد
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">رقم الدفعة</th>
                      <th className="py-2.5 px-3">تاريخ الاستلام</th>
                      <th className="py-2.5 px-3">طريقة الدفع</th>
                      <th className="py-2.5 px-3">رقم المرجع / الحوالة</th>
                      <th className="py-2.5 px-3">المبلغ المستلم</th>
                      <th className="py-2.5 px-3">ملاحظات</th>
                      <th className="py-2.5 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fin?.clientPayments.map(cp => (
                      <tr key={cp.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{cp.paymentNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(cp.paymentDate)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{PAYMENT_METHOD_MAP[cp.paymentMethod] || cp.paymentMethod}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{cp.referenceNumber || '-'}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">+{formatSAR(cp.amount)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{cp.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => deleteClientPayment(cp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="حذف الدفعة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Team Entitlements & Payments */}
        {activeSubTab === 'team' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-900 block">أعضاء الفريق ومستحقاتهم ومدفوعاتهم</span>
                <span className="text-[11px] text-slate-500">حساب آلي للمستحق بناءً على النسبة أو المبلغ الثابت</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenCreateTeamPayment(project.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>صرف دفعة لعضو فريق</span>
              </button>
            </div>

            {fin?.teamMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                لا يوجد أعضاء فريق مسندين لهذا المشروع
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">العضو</th>
                      <th className="py-2.5 px-3">الدور بالمشروع</th>
                      <th className="py-2.5 px-3">نوع الاتفاق</th>
                      <th className="py-2.5 px-3">إجمالي المستحق</th>
                      <th className="py-2.5 px-3">إجمالي المدفوع</th>
                      <th className="py-2.5 px-3">المتبقي له</th>
                      <th className="py-2.5 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fin?.teamMembers.map(tm => (
                      <tr key={tm.assignmentId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{tm.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{tm.role}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono">
                          {tm.compensationType === 'percentage'
                            ? `نسبة ${tm.compensationValue}% من العقد`
                            : `مبلغ مقطوع (${formatSAR(tm.compensationValue)})`}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatSAR(tm.entitledAmount)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{formatSAR(tm.paidAmount)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700">{formatSAR(tm.remainingAmount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenCreateTeamPayment(project.id, tm.teamMemberId)}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                          >
                            صرف دفعة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* List of Team Payments Made */}
            <div className="pt-2">
              <h5 className="text-xs font-bold text-slate-800 mb-2">سجل الحوالات والدفعات المصروفة للفريق:</h5>
              {fin?.teamPayments.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded">لم تسجل أي حوالات بعد</div>
              ) : (
                <div className="space-y-1.5">
                  {fin?.teamPayments.map(tp => {
                    const member = db.teamMembers.find(m => m.id === tp.teamMemberId);
                    return (
                      <div
                        key={tp.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 font-semibold">{tp.paymentNumber}</span>
                          <span className="font-semibold text-slate-800">{member?.name}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{formatDate(tp.paymentDate)}</span>
                          {tp.referenceNumber && (
                            <span className="text-slate-400 font-mono text-[10px]">({tp.referenceNumber})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700">-{formatSAR(tp.amount)}</span>
                          <button
                            type="button"
                            onClick={() => deleteTeamPayment(tp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="حذف الحوالة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Expenses */}
        {activeSubTab === 'expenses' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">مصروفات وتكاليف المشروع التشغيلية</span>
              <button
                type="button"
                onClick={() => onOpenCreateExpense(project.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل مصروف جديد</span>
              </button>
            </div>

            {/* Quick Expense Budget Bar in Expenses SubTab */}
            {project.approvedBudget && project.approvedBudget > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Wallet className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">متابعة الميزانية المعتمدة:</span>
                    <span className="font-mono text-slate-600">
                      تم صرف {formatCurrency(fin?.totalExpenses, project.currency)} من أصل {formatCurrency(project.approvedBudget, project.currency)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      fin?.isOverBudget
                        ? 'bg-rose-100 text-rose-800'
                        : (fin?.budgetUsagePercent || 0) >= 90
                        ? 'bg-orange-100 text-orange-800'
                        : (fin?.budgetUsagePercent || 0) >= 70
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {(fin?.budgetUsagePercent || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-56">
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fin?.isOverBudget
                          ? 'bg-rose-600'
                          : (fin?.budgetUsagePercent || 0) >= 90
                          ? 'bg-orange-500'
                          : (fin?.budgetUsagePercent || 0) >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, fin?.budgetUsagePercent || 0))}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${
                    fin?.isOverBudget ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {fin?.isOverBudget
                      ? `عجز: ${formatCurrency(Math.abs(fin.budgetRemaining), project.currency)}`
                      : `متبقي: ${formatCurrency(fin?.budgetRemaining, project.currency)}`}
                  </span>
                </div>
              </div>
            )}

            {fin?.expenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                لا توجد مصروفات مسجلة لهذا المشروع
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-2.5 px-3">رقم المصروف</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">نوع المصروف</th>
                      <th className="py-2.5 px-3">الوصف</th>
                      <th className="py-2.5 px-3">المورد / الجهة</th>
                      <th className="py-2.5 px-3">المبلغ</th>
                      <th className="py-2.5 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fin?.expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{exp.expenseNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(exp.expenseDate)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{EXPENSE_CATEGORY_MAP[exp.category]}</td>
                        <td className="py-2.5 px-3 text-slate-700">{exp.description}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{exp.vendor}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">-{formatSAR(exp.amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => deleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* Tab 6: Gantt & Tasks */}
        {activeSubTab === 'gantt' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-900 block">مهام ومراحل المشروع المجدولة</span>
                <span className="text-[11px] text-slate-500">متابعة الإنجاز، التبعيات، والمهام المتأخرة</span>
              </div>
            </div>

            {projectTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                لا توجد مهام مسجلة لهذا المشروع في مخطط جانت
              </div>
            ) : (
              <div className="space-y-2">
                {projectTasks.map(task => {
                  const member = db.teamMembers.find(m => m.id === task.assignedMemberId);
                  const isCompleted = task.progress === 100;
                  const isDelayed = task.status === 'delayed';

                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{task.title}</span>
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              مكتملة
                            </span>
                          ) : isDelayed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                              متأخرة عن الجدول
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                              قيد التنفيذ ({task.progress}%)
                            </span>
                          )}
                          {task.isMilestone && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                              علامة فارقة
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="font-mono">
                            من {formatDate(task.startDate)} إلى {formatDate(task.endDate)} ({task.durationDays} يوم)
                          </span>
                          {member && (
                            <>
                              <span>·</span>
                              <span>المسؤول: {member.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress visual */}
                      <div className="w-28 shrink-0 text-left">
                        <div className="text-[10px] font-mono text-slate-600 mb-1">{task.progress}%</div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isCompleted ? 'bg-emerald-600' : isDelayed ? 'bg-rose-600' : 'bg-blue-600'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
