import React, { useState } from 'react';
import { ArrowUpRight, Plus, Search, Trash2, Edit, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeamPayment } from '../../types';
import { formatSAR, formatCurrency, convertTransactionAmount, CURRENCY_INFO, formatDate, PAYMENT_METHOD_MAP } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface TeamPaymentsViewProps {
  onOpenCreatePayment: () => void;
  onOpenEditPayment: (payment: TeamPayment) => void;
  onSelectProject: (projectId: string) => void;
}

export const TeamPaymentsView: React.FC<TeamPaymentsViewProps> = ({
  onOpenCreatePayment,
  onOpenEditPayment,
  onSelectProject,
}) => {
  const { db, deleteTeamPayment } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const filteredPayments = db.teamPayments.filter(payment => {
    const project = db.projects.find(p => p.id === payment.projectId);
    const member = db.teamMembers.find(m => m.id === payment.teamMemberId);
    const q = searchQuery.toLowerCase();

    return (
      payment.paymentNumber.toLowerCase().includes(q) ||
      payment.referenceNumber.toLowerCase().includes(q) ||
      (project?.name && project.name.toLowerCase().includes(q)) ||
      (member?.name && member.name.toLowerCase().includes(q))
    );
  });

  const totalPaid = db.teamPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            دفعات الفريق (المصروفات للكوادر)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل الحوالات والمدفوعات لأعضاء الفريق وتأثيرها المباشر على الأرباح المحققة
          </p>
        </div>

        <button
          onClick={onOpenCreatePayment}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>صرف دفعة للفريق</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="إجمالي المدفوع للفريق"
          value={formatSAR(totalPaid)}
          subtitle="حوالات مسددة للأعضاء"
          icon={ArrowUpRight}
        />
        <StatCard
          title="عدد الحوالات الصادرة"
          value={db.teamPayments.length.toString()}
          subtitle="سندات صرف موثقة"
        />
        <StatCard
          title="متوسط الدفعة المصروفة"
          value={formatSAR(db.teamPayments.length > 0 ? totalPaid / db.teamPayments.length : 0)}
          subtitle="معدل الصرف لكل حوالة"
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
            placeholder="بحث برقم الحوالة، العضو، المشروع..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {filteredPayments.length} حوالة صادرة
        </span>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <ArrowUpRight className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">لم يتم العثور على أي دفعات فريق مطابقة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">رقم السند</th>
                  <th className="py-3 px-3.5">العملة</th>
                  <th className="py-3 px-3.5">تاريخ الصرف</th>
                  <th className="py-3 px-3.5">المشروع</th>
                  <th className="py-3 px-3.5">عضو الفريق المستفيد</th>
                  <th className="py-3 px-3.5">طريقة الدفع</th>
                  <th className="py-3 px-3.5">رقم المرجع / الحوالة</th>
                  <th className="py-3 px-3.5">المبلغ المصروف</th>
                  <th className="py-3 px-3.5">ملاحظات</th>
                  <th className="py-3 px-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(payment => {
                  const project = db.projects.find(p => p.id === payment.projectId);
                  const member = db.teamMembers.find(m => m.id === payment.teamMemberId);

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {payment.paymentNumber}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const payCurr = payment.currency || project?.currency || 'SAR';
                          const info = CURRENCY_INFO[payCurr];
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>{info?.flag || '🌐'}</span>
                              <span className="font-mono">{payCurr}</span>
                              <span className="text-slate-500 font-normal text-[10px]">({info?.symbol || payCurr})</span>
                            </span>
                          );
                        })()}
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
                      <td className="py-3 px-3.5 text-slate-900 font-semibold">
                        {member?.name || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {PAYMENT_METHOD_MAP[payment.paymentMethod] || payment.paymentMethod}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-500">
                        {payment.referenceNumber || '-'}
                      </td>
                      {(() => {
                        const payCurr = payment.currency || project?.currency || 'SAR';
                        const isDiff = project && payCurr !== project.currency;
                        const converted = isDiff
                          ? convertTransactionAmount(payment.amount, payCurr, project.currency, payment.exchangeRate)
                          : payment.amount;
                        return (
                          <td className="py-3 px-3.5 font-mono font-bold text-amber-700 text-sm">
                            <div>-{formatCurrency(payment.amount, payCurr)}</div>
                            {isDiff && (
                              <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                                يعادل: {formatCurrency(converted, project.currency)}
                              </div>
                            )}
                          </td>
                        );
                      })()}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (paymentToDelete) deleteTeamPayment(paymentToDelete);
        }}
        title="حذف حوالة الفريق"
        message="هل أنت متأكد من حذف هذه الحوالة؟ سيتم إعادة المبلغ إلى مستحقات العضو غير المسددة وتحديث الربح الفعلي فورياً."
      />
    </div>
  );
};
