import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  Printer,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceStatus } from '../../types';
import { formatSAR, formatCurrency, convertTransactionAmount, CURRENCY_INFO, formatDate, INVOICE_STATUS_MAP } from '../../utils/formatters';
import { exportInvoicesData } from '../../utils/exportService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface InvoicesViewProps {
  onOpenCreateInvoice: () => void;
  onOpenEditInvoice: (invoice: Invoice) => void;
  onOpenCreatePaymentForInvoice: (projectId: string, invoiceId: string) => void;
  onPrintInvoice: (invoiceId: string) => void;
  onSelectProject: (projectId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenCreateInvoice,
  onOpenEditInvoice,
  onOpenCreatePaymentForInvoice,
  onPrintInvoice,
  onSelectProject,
}) => {
  const { db, allProjectFinancials, deleteInvoice } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Gather calculated invoices
  const allCalculatedInvoices = db.invoices.map(invoice => {
    const project = db.projects.find(p => p.id === invoice.projectId);
    const client = db.clients.find(c => c.id === invoice.clientId);
    const fin = allProjectFinancials.get(invoice.projectId);
    const calculated = fin?.invoices.find(i => i.id === invoice.id);

    return {
      invoice,
      project,
      client,
      paidAmount: calculated?.paidAmount || 0,
      remainingAmount: calculated?.remainingAmount ?? invoice.totalAmount,
      status: calculated?.status || 'unpaid',
    };
  });

  // Filter
  const filteredInvoices = allCalculatedInvoices.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.invoice.invoiceNumber.toLowerCase().includes(q) ||
      (item.project?.name && item.project.name.toLowerCase().includes(q)) ||
      (item.client?.name && item.client.name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesProject = projectFilter === 'all' || item.invoice.projectId === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // Totals for metrics
  const totalInvoiced = allCalculatedInvoices.reduce((s, i) => s + i.invoice.totalAmount, 0);
  const totalPaid = allCalculatedInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalRemaining = allCalculatedInvoices.reduce((s, i) => s + i.remainingAmount, 0);
  const overdueCount = allCalculatedInvoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            إدارة الفواتير والتحصيل
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إصدار ومتابعة فواتير المشاريع، الدفعات المسددة، وتتبع الحالات والمستحقات المعلقة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>تصدير الفواتير</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-right animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      exportInvoicesData(
                        filteredInvoices.map(fi => fi.invoice),
                        db.projects,
                        db.clients,
                        allProjectFinancials,
                        'excel'
                      );
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير ملف Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportInvoicesData(
                        filteredInvoices.map(fi => fi.invoice),
                        db.projects,
                        db.clients,
                        allProjectFinancials,
                        'pdf'
                      );
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-rose-600" />
                    <span>تصدير / طباعة PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      exportInvoicesData(
                        filteredInvoices.map(fi => fi.invoice),
                        db.projects,
                        db.clients,
                        allProjectFinancials,
                        'csv'
                      );
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

          <button
            onClick={onOpenCreateInvoice}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="إجمالي قيمة الفواتير"
          value={formatSAR(totalInvoiced)}
          subtitle={`${allCalculatedInvoices.length} فاتورة مسجلة`}
          icon={FileText}
        />
        <StatCard
          title="المبالغ المحصلة"
          value={formatSAR(totalPaid)}
          subtitle="سداد مباشر للفواتير"
          variant="highlight"
        />
        <StatCard
          title="المبالغ المعلقة"
          value={formatSAR(totalRemaining)}
          subtitle="في انتظار السداد"
          variant={totalRemaining > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="فواتير متأخرة عن الاستحقاق"
          value={overdueCount.toString()}
          subtitle="تجاوزت تاريخ الاستحقاق"
          variant={overdueCount > 0 ? 'danger' : 'default'}
          badge={overdueCount > 0 ? 'مستعجل' : 'منتظم'}
          badgeType={overdueCount > 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة، المشروع، العميل..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({allCalculatedInvoices.length})
            </button>
            {Object.entries(INVOICE_STATUS_MAP).map(([key, val]) => {
              const count = allCalculatedInvoices.filter(i => i.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key as InvoiceStatus)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === key
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {val.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Project Dropdown Filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-hidden"
          >
            <option value="all">كل المشاريع</option>
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">لا توجد فواتير تطابق التصفية المحددة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">رقم الفاتورة</th>
                  <th className="py-3 px-3.5">العملة</th>
                  <th className="py-3 px-3.5">المشروع</th>
                  <th className="py-3 px-3.5">العميل</th>
                  <th className="py-3 px-3.5">تاريخ الإصدار</th>
                  <th className="py-3 px-3.5">تاريخ الاستحقاق</th>
                  <th className="py-3 px-3.5">قيمة الفاتورة</th>
                  <th className="py-3 px-3.5">المدفوع</th>
                  <th className="py-3 px-3.5">المتبقي</th>
                  <th className="py-3 px-3.5">الحالة</th>
                  <th className="py-3 px-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(({ invoice, project, client, paidAmount, remainingAmount, status }) => {
                  const statusMeta = INVOICE_STATUS_MAP[status];

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const curr = invoice.currency || project?.currency || 'SAR';
                          const info = CURRENCY_INFO[curr];
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>{info?.flag || '🌐'}</span>
                              <span className="font-mono">{curr}</span>
                              <span className="text-slate-500 font-normal text-[10px]">({info?.symbol || curr})</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {project ? (
                          <button
                            onClick={() => onSelectProject(project.id)}
                            className="hover:text-emerald-700 hover:underline text-right"
                          >
                            {project.name}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{client?.name || '-'}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{formatDate(invoice.issueDate)}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{formatDate(invoice.dueDate)}</td>
                      {(() => {
                        const invCurr = invoice.currency || project?.currency || 'SAR';
                        const isDiff = project && invCurr !== project.currency;
                        const convertedTotal = isDiff
                          ? convertTransactionAmount(invoice.totalAmount, invCurr, project.currency, invoice.exchangeRate)
                          : invoice.totalAmount;

                        return (
                          <>
                            <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                              <div>{formatCurrency(invoice.totalAmount, invCurr)}</div>
                              {isDiff && (
                                <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                                  يعادل: {formatCurrency(convertedTotal, project.currency)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-semibold text-emerald-700">
                              {formatCurrency(paidAmount, invCurr)}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-semibold text-amber-700">
                              {formatCurrency(remainingAmount, invCurr)}
                            </td>
                          </>
                        );
                      })()}
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Record Payment Button if remaining > 0 */}
                          {remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenCreatePaymentForInvoice(invoice.projectId, invoice.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors whitespace-nowrap"
                              title="تسجيل دفعة مسددة لهذه الفاتورة"
                            >
                              تسجيل دفعة
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onPrintInvoice(invoice.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors"
                            title="معاينة وطباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditInvoice(invoice)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="تعديل الفاتورة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvoiceToDelete(invoice.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(invoiceToDelete)}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={() => {
          if (invoiceToDelete) deleteInvoice(invoiceToDelete);
        }}
        title="حذف الفاتورة"
        message="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم فك ارتباط أي دفعات مرتبطة بها وتحديث رصيد المشروع فورياً."
      />
    </div>
  );
};
