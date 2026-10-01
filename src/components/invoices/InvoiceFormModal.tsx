import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Invoice, Currency } from '../../types';
import { formatCurrency, CURRENCY_INFO, convertTransactionAmount } from '../../utils/formatters';
import { CurrencyExchangeField } from '../common/CurrencyExchangeField';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  invoiceToEdit?: Invoice | null;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  invoiceToEdit,
}) => {
  const { db, addInvoice, updateInvoice } = useApp();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState<number>(10000);
  const [taxRate, setTaxRate] = useState<number>(15);
  const [notes, setNotes] = useState('');

  // Selected project client
  const selectedProject = db.projects.find(p => p.id === projectId);
  const selectedClient = db.clients.find(c => c.id === selectedProject?.clientId);
  const projectCurrency = selectedProject?.currency || 'SAR';

  useEffect(() => {
    if (invoiceToEdit) {
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setProjectId(invoiceToEdit.projectId);
      const prj = db.projects.find(p => p.id === invoiceToEdit.projectId);
      setCurrency(invoiceToEdit.currency || prj?.currency || 'SAR');
      setExchangeRate(invoiceToEdit.exchangeRate || 1.0);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setSubtotal(invoiceToEdit.subtotal);
      setTaxRate(invoiceToEdit.taxRate);
      setNotes(invoiceToEdit.notes || '');
    } else {
      const nextNum = db.invoices.length + 1;
      setInvoiceNumber(`INV-2026-${String(nextNum).padStart(3, '0')}`);
      const initialProjId = defaultProjectId || db.projects[0]?.id || '';
      setProjectId(initialProjId);
      const prj = db.projects.find(p => p.id === initialProjId);
      setCurrency(prj?.currency || 'SAR');
      setExchangeRate(1.0);
      setIssueDate(new Date().toISOString().slice(0, 10));

      const due = new Date();
      due.setDate(due.getDate() + 15);
      setDueDate(due.toISOString().slice(0, 10));
      setSubtotal(25000);
      setTaxRate(15);
      setNotes('دفعة مستحقة تعاقدياً شاملة ضريبة القيمة المضافة.');
    }
  }, [invoiceToEdit, defaultProjectId, isOpen, db.invoices.length, db.projects]);

  // When project changes in creation mode, update currency default if project currency differs
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    if (!invoiceToEdit) {
      const prj = db.projects.find(p => p.id === newProjId);
      if (prj) {
        setCurrency(prj.currency || 'SAR');
        setExchangeRate(1.0);
      }
    }
  };

  // Calculations
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const currSymbol = CURRENCY_INFO[currency]?.symbol || currency;
  const convertedTotalToProject = convertTransactionAmount(
    totalAmount,
    currency,
    projectCurrency,
    exchangeRate
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !projectId) return;
    if (!selectedProject) return;

    const payload = {
      invoiceNumber,
      projectId,
      clientId: selectedProject.clientId,
      currency,
      exchangeRate: currency === projectCurrency ? 1.0 : (Number(exchangeRate) || 1.0),
      issueDate,
      dueDate,
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount,
      totalAmount,
      notes,
    };

    if (invoiceToEdit) {
      updateInvoice(invoiceToEdit.id, payload);
    } else {
      addInvoice(payload);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoiceToEdit ? 'تعديل الفاتورة' : 'إصدار فاتورة ضريبية جديدة'}
      subtitle="تحديد المشروع، العملة، سعر الصرف، والقيمة شاملة الضريبة"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الفاتورة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="INV-2026-001"
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
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
        </div>

        {selectedClient && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <div>
              <span>العميل المرتبط: </span>
              <strong className="text-slate-900">{selectedClient.name}</strong>
              {selectedClient.companyName && <span className="text-slate-500"> ({selectedClient.companyName})</span>}
            </div>
            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
              عملة المشروع: {projectCurrency}
            </span>
          </div>
        )}

        {/* Currency & Exchange Rate Selector */}
        <CurrencyExchangeField
          selectedCurrency={currency}
          onCurrencyChange={setCurrency}
          projectCurrency={projectCurrency}
          exchangeRate={exchangeRate}
          onExchangeRateChange={setExchangeRate}
          amount={totalAmount}
          transactionTypeLabel="الفاتورة"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ إصدار الفاتورة <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الاستحقاق <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المبلغ الخاضع للضريبة ({currSymbol}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={subtotal}
              onChange={e => setSubtotal(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">نسبة ضريبة القيمة المضافة %</label>
            <select
              value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value={15}>15% (النسبة الأساسية بالمملكة)</option>
              <option value={14}>14% (النسبة الأساسية في مصر)</option>
              <option value={5}>5% (ضريبة القيمة المضافة - الإمارات)</option>
              <option value={0}>0% (معفاة / بدون ضريبة)</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>المبلغ الخاضع للضريبة:</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>ضريبة القيمة المضافة ({taxRate}%):</span>
            <span className="font-mono font-bold text-emerald-800">+{formatCurrency(taxAmount, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-emerald-200">
            <span>إجمالي الفاتورة المستحق ({currSymbol}):</span>
            <span className="font-mono text-emerald-950 font-black">{formatCurrency(totalAmount, currency)}</span>
          </div>

          {currency !== projectCurrency && (
            <div className="flex justify-between text-emerald-800 font-bold text-xs pt-1 border-t border-dashed border-emerald-300">
              <span>المعادل بعملة المشروع ({projectCurrency}):</span>
              <span className="font-mono text-emerald-900">{formatCurrency(convertedTotalToProject, projectCurrency)}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف والملاحظات</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="شروط السداد، الدفعة المرحلية، الخ..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
          >
            {invoiceToEdit ? 'حفظ التعديلات' : 'إصدار الفاتورة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
