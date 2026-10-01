import React, { useState } from 'react';
import { Receipt, Plus, Search, Trash2, Edit, Briefcase, Filter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProjectExpense, ExpenseCategory } from '../../types';
import { formatSAR, formatCurrency, convertTransactionAmount, CURRENCY_INFO, formatDate, EXPENSE_CATEGORY_MAP } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface ExpensesViewProps {
  onOpenCreateExpense: () => void;
  onOpenEditExpense: (expense: ProjectExpense) => void;
  onSelectProject: (projectId: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenCreateExpense,
  onOpenEditExpense,
  onSelectProject,
}) => {
  const { db, deleteExpense } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const filteredExpenses = db.expenses.filter(expense => {
    const project = db.projects.find(p => p.id === expense.projectId);
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      expense.expenseNumber.toLowerCase().includes(q) ||
      expense.description.toLowerCase().includes(q) ||
      expense.vendor.toLowerCase().includes(q) ||
      (project?.name && project.name.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || expense.projectId === projectFilter;

    return matchesSearch && matchesCategory && matchesProject;
  });

  const totalExpenses = db.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            مصروفات وتكاليف المشاريع
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تسجيل ومتابعة نفقات السيرفرات، التراخيص، الاستشارات، والتكاليف التشغيلية
          </p>
        </div>

        <button
          onClick={onOpenCreateExpense}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          title="إجمالي مصروفات المشاريع"
          value={formatSAR(totalExpenses)}
          subtitle="تكاليف تشغيلية مدفوعة"
          icon={Receipt}
          variant="danger"
        />
        <StatCard
          title="عدد بنود المصروفات"
          value={db.expenses.length.toString()}
          subtitle="فواتير وسندات موردين"
        />
        <StatCard
          title="متوسط قيمة المصروف"
          value={formatSAR(db.expenses.length > 0 ? totalExpenses / db.expenses.length : 0)}
          subtitle="معدل التكلفة لكل بند"
        />
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالوصف، المورد، المشروع..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-hidden"
          >
            <option value="all">كافة التصنيفات</option>
            {Object.entries(EXPENSE_CATEGORY_MAP).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

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

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">لم يتم العثور على أي مصروفات مطابقة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-3.5">رقم المصروف</th>
                  <th className="py-3 px-3.5">العملة</th>
                  <th className="py-3 px-3.5">التاريخ</th>
                  <th className="py-3 px-3.5">المشروع</th>
                  <th className="py-3 px-3.5">التصنيف</th>
                  <th className="py-3 px-3.5">الوصف</th>
                  <th className="py-3 px-3.5">المورد / الجهة</th>
                  <th className="py-3 px-3.5">المبلغ</th>
                  <th className="py-3 px-3.5">طريقة الدفع</th>
                  <th className="py-3 px-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(expense => {
                  const project = db.projects.find(p => p.id === expense.projectId);

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {expense.expenseNumber}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const expCurr = expense.currency || project?.currency || 'SAR';
                          const info = CURRENCY_INFO[expCurr];
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>{info?.flag || '🌐'}</span>
                              <span className="font-mono">{expCurr}</span>
                              <span className="text-slate-500 font-normal text-[10px]">({info?.symbol || expCurr})</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">
                        {formatDate(expense.expenseDate)}
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
                      <td className="py-3 px-3.5 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {EXPENSE_CATEGORY_MAP[expense.category] || expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 max-w-[200px] truncate" title={expense.description}>
                        {expense.description}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700">{expense.vendor || '-'}</td>
                      {(() => {
                        const expCurr = expense.currency || project?.currency || 'SAR';
                        const isDiff = project && expCurr !== project.currency;
                        const converted = isDiff
                          ? convertTransactionAmount(expense.amount, expCurr, project.currency, expense.exchangeRate)
                          : expense.amount;
                        return (
                          <td className="py-3 px-3.5 font-mono font-bold text-rose-700 text-sm">
                            <div>-{formatCurrency(expense.amount, expCurr)}</div>
                            {isDiff && (
                              <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                                يعادل: {formatCurrency(converted, project.currency)}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                      <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                        {expense.paymentMethod === 'credit_card'
                          ? 'بطاقة ائتمانية'
                          : expense.paymentMethod === 'bank_transfer'
                          ? 'تحويل بنكي'
                          : 'نقدي'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditExpense(expense)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="تعديل المصروف"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(expense.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="حذف المصروف"
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
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={() => {
          if (expenseToDelete) deleteExpense(expenseToDelete);
        }}
        title="حذف المصروف"
        message="هل أنت متأكد من حذف هذا المصروف؟ سيتم خصمه من إجمالي مصروفات المشروع وتحديث صافي الربح فورياً."
      />
    </div>
  );
};
