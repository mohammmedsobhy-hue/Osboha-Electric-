import React, { useState } from 'react';
import { ArrowDownLeft, Plus, Search, Trash2, Edit, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClientPayment } from '../../types';
import { formatSAR, formatDate, PAYMENT_METHOD_MAP } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface ClientPaymentsViewProps {
  onOpenCreatePayment: () => void;
  onOpenEditPayment: (payment: ClientPayment) => void;
  onSelectProject: (projectId: string) => void;
}

export const ClientPaymentsView: React.FC<ClientPaymentsViewProps> = ({
  onOpenCreatePayment,
  onOpenEditPayment,
  onSelectProject,
}) => {
  const { db, deleteClientPayment } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const filteredPayments = db.clientPayments.filter(payment => {
    const project = db.projects.find(p => p.id === payment.projectId);
    const client = db.clients.find(c => c.id === payment.clientId);
    const q = searchQuery.toLowerCase();

    return (
      payment.paymentNumber.toLowerCase().includes(q) ||
      payment.referenceNumber.toLowerCase().includes(q) ||
      (project?.name && project.name.toLowerCase().includes(q)) ||
      (client?.name && client.name.toLowerCase().includes(q))
    );
  });

  const totalCollected = db.clientPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            دفعات العملاء (المقبوضات)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل التدفقات النقدية الداخلة من العملاء وحوالات سداد الفواتير
          </p>
        </div>

        <button
          onClick={onOpenCreatePayment}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل دفعة جديدة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="إجمالي المقبوضات المحصلة"
          value={formatSAR(totalCollected)}
          subtitle="تدفقات نقدية فعلية بالبنك"
          icon={ArrowDownLeft}
          variant="highlight"
        />
        <StatCard
          title="عدد عمليات التحصيل"
          value={db.clientPayments.length.toString()}
          subtitle="حوالات مسجلة وموثقة"
        />
        <StatCard
          title="متوسط قيمة الدفعة"
          value={formatSAR(db.clientPayments.length > 0 ? totalCollected / db.clientPayments.length : 0)}
          subtitle="معدل التدفق لكل دفعة"
        />
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الدفعة، المرجع، العميل، المشروع..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {filteredPayments.length} عملية دفع
        </span>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <ArrowDownLeft className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">لم يتم العثور على أي دفعات مطابقة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">رقم الدفعة</th>
                  <th className="py-3 px-3.5">تاريخ الاستلام</th>
                  <th className="py-3 px-3.5">المشروع</th>
                  <th className="py-3 px-3.5">العميل</th>
                  <th className="py-3 px-3.5">الفاتورة المرتبطة</th>
                  <th className="py-3 px-3.5">طريقة الدفع</th>
                  <th className="py-3 px-3.5">رقم المرجع / الحوالة</th>
                  <th className="py-3 px-3.5">المبلغ المحصّل</th>
                  <th className="py-3 px-3.5">ملاحظات</th>
                  <th className="py-3 px-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(payment => {
                  const project = db.projects.find(p => p.id === payment.projectId);
                  const client = db.clients.find(c => c.id === payment.clientId);
                  const invoice = db.invoices.find(i => i.id === payment.invoiceId);

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {payment.paymentNumber}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">
                        {formatDate(payment.paymentDate)}
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
                      <td className="py-3 px-3.5 font-mono text-slate-600">
                        {invoice ? (
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                            {invoice.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">دفعة عامة للمشروع</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {PAYMENT_METHOD_MAP[payment.paymentMethod] || payment.paymentMethod}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-500">
                        {payment.referenceNumber || '-'}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 text-sm">
                        +{formatSAR(payment.amount)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 max-w-[150px] truncate" title={payment.notes}>
                        {payment.notes || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditPayment(payment)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="تعديل الدفعة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentToDelete(payment.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="حذف الدفعة"
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (paymentToDelete) deleteClientPayment(paymentToDelete);
        }}
        title="حذف دفعة العميل"
        message="هل أنت متأكد من حذف هذه الدفعة؟ سيتم تعديل رصيد الفاتورة والمشروع فورياً."
      />
    </div>
  );
};
