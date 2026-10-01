import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ProjectExpense, ExpenseCategory, ExpensePaymentMethod, Currency } from '../../types';
import { formatCurrency, CURRENCY_INFO, convertTransactionAmount, EXPENSE_CATEGORY_MAP } from '../../utils/formatters';
import { CurrencyExchangeField } from '../common/CurrencyExchangeField';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  expenseToEdit?: ProjectExpense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  expenseToEdit,
}) => {
  const { db, addExpense, updateExpense } = useApp();

  const [expenseNumber, setExpenseNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [category, setCategory] = useState<ExpenseCategory>('software_servers');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('credit_card');
  const [receiptReference, setReceiptReference] = useState('');

  const selectedProject = db.projects.find(p => p.id === projectId);
  const projectCurrency = selectedProject?.currency || 'SAR';

  useEffect(() => {
    if (expenseToEdit) {
      setExpenseNumber(expenseToEdit.expenseNumber);
      setProjectId(expenseToEdit.projectId);
      const prj = db.projects.find(p => p.id === expenseToEdit.projectId);
      setCurrency(expenseToEdit.currency || prj?.currency || 'SAR');
      setExchangeRate(expenseToEdit.exchangeRate || 1.0);
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description);
      setVendor(expenseToEdit.vendor);
      setAmount(expenseToEdit.amount);
      setExpenseDate(expenseToEdit.expenseDate);
      setPaymentMethod(expenseToEdit.paymentMethod);
      setReceiptReference(expenseToEdit.receiptReference || '');
    } else {
      const nextNum = db.expenses.length + 1;
      setExpenseNumber(`EXP-2026-${String(nextNum).padStart(2, '0')}`);
      const initialProjId = defaultProjectId || db.projects[0]?.id || '';
      setProjectId(initialProjId);
      const prj = db.projects.find(p => p.id === initialProjId);
      setCurrency(prj?.currency || 'SAR');
      setExchangeRate(1.0);
      setCategory('software_servers');
      setDescription('');
      setVendor('');
      setAmount(1500);
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('credit_card');
      setReceiptReference('');
    }
  }, [expenseToEdit, defaultProjectId, isOpen, db.expenses.length, db.projects]);

  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    if (!expenseToEdit) {
      const prj = db.projects.find(p => p.id === newProjId);
      if (prj) {
        setCurrency(prj.currency || 'SAR');
        setExchangeRate(1.0);
      }
    }
  };

  const currSymbol = CURRENCY_INFO[currency]?.symbol || currency;
  const convertedAmountToProject = convertTransactionAmount(
    amount,
    currency,
    projectCurrency,
    exchangeRate
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !description.trim() || amount <= 0) return;

    const payload = {
      expenseNumber,
      projectId,
      currency,
      exchangeRate: currency === projectCurrency ? 1.0 : (Number(exchangeRate) || 1.0),
      category,
      description,
      vendor,
      amount: Number(amount) || 0,
      expenseDate,
      paymentMethod,
      receiptReference,
    };

    if (expenseToEdit) {
      updateExpense(expenseToEdit.id, payload);
    } else {
      addExpense(payload);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? 'تعديل مصروف المشروع' : 'تسجيل مصروف مشروع جديد'}
      subtitle="سجل تكلفة تشغيلية أو تقنية تؤثر فوراً على ربحية المشروع"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم المصروف <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={expenseNumber}
              onChange={e => setExpenseNumber(e.target.value)}
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ المصروف <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            المشروع <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={projectId}
            onChange={e => handleProjectChange(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name} ({p.currency || 'SAR'})
              </option>
            ))}
          </select>
        </div>

        {/* Currency & Exchange Rate Selector */}
        <CurrencyExchangeField
          selectedCurrency={currency}
          onCurrencyChange={setCurrency}
          projectCurrency={projectCurrency}
          exchangeRate={exchangeRate}
          onExchangeRateChange={setExchangeRate}
          amount={amount}
          transactionTypeLabel="المصروف"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              نوع / تصنيف المصروف <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {Object.entries(EXPENSE_CATEGORY_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">المورد / الجهة المستلمة</label>
            <input
              type="text"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              placeholder="مثال: Amazon AWS / STC"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            وصف المصروف <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="مثال: تجديد اشتراك السيرفرات السحابية وقاعدة البيانات"
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المبلغ ({currSymbol}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold text-rose-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {currency !== projectCurrency && (
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                يعادل: {formatCurrency(convertedAmountToProject, projectCurrency)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="credit_card">بطاقة ائتمانية / مدى</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="cash">نقدي (كاش)</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الفاتورة أو الإيصال (المرجع)</label>
          <input
            type="text"
            value={receiptReference}
            onChange={e => setReceiptReference(e.target.value)}
            placeholder="REC-xxx-xxx"
            className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs"
          >
            {expenseToEdit ? 'حفظ التعديلات' : 'تسجيل المصروف'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
