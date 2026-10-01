import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ClientPayment, ClientPaymentMethod, Currency } from '../../types';
import { formatCurrency, CURRENCY_INFO, convertTransactionAmount, PAYMENT_METHOD_MAP } from '../../utils/formatters';
import { CurrencyExchangeField } from '../common/CurrencyExchangeField';

interface ClientPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultInvoiceId?: string;
  paymentToEdit?: ClientPayment | null;
}

export const ClientPaymentModal: React.FC<ClientPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  defaultInvoiceId,
  paymentToEdit,
}) => {
  const { db, addClientPayment, updateClientPayment, getProjectFinancials } = useApp();

  const [paymentNumber, setPaymentNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ClientPaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProject = db.projects.find(p => p.id === projectId);
  const projectCurrency = selectedProject?.currency || 'SAR';
  const selectedClient = db.clients.find(c => c.id === selectedProject?.clientId);
  const projectInvoices = db.invoices.filter(i => i.projectId === projectId);

  useEffect(() => {
    if (paymentToEdit) {
      setPaymentNumber(paymentToEdit.paymentNumber);
      setProjectId(paymentToEdit.projectId);
      const prj = db.projects.find(p => p.id === paymentToEdit.projectId);
      setCurrency(paymentToEdit.currency || prj?.currency || 'SAR');
      setExchangeRate(paymentToEdit.exchangeRate || 1.0);
      setInvoiceId(paymentToEdit.invoiceId || '');
      setAmount(paymentToEdit.amount);
      setPaymentDate(paymentToEdit.paymentDate);
      setPaymentMethod(paymentToEdit.paymentMethod);
      setReferenceNumber(paymentToEdit.referenceNumber);
      setNotes(paymentToEdit.notes || '');
    } else {
      const nextNum = db.clientPayments.length + 1;
      setPaymentNumber(`PAY-C-2026-${String(nextNum).padStart(2, '0')}`);
      const initialProject = defaultProjectId || db.projects[0]?.id || '';
      setProjectId(initialProject);
      const prj = db.projects.find(p => p.id === initialProject);
      setCurrency(prj?.currency || 'SAR');
      setExchangeRate(1.0);
      setInvoiceId(defaultInvoiceId || '');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('bank_transfer');
      setReferenceNumber('');
      setNotes('');

      // Auto-set amount if defaultInvoiceId is passed
      if (defaultInvoiceId) {
        const inv = db.invoices.find(i => i.id === defaultInvoiceId);
        if (inv) {
          const fin = getProjectFinancials(inv.projectId);
          const calculated = fin?.invoices.find(i => i.id === inv.id);
          setAmount(calculated?.remainingAmount ?? inv.totalAmount);
          if (inv.currency) {
            setCurrency(inv.currency);
            if (inv.exchangeRate) setExchangeRate(inv.exchangeRate);
          }
        }
      } else {
        setAmount(20000);
      }
    }
  }, [paymentToEdit, defaultProjectId, defaultInvoiceId, isOpen, db.clientPayments.length, db.projects]);

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    if (invId) {
      const inv = db.invoices.find(i => i.id === invId);
      const fin = getProjectFinancials(projectId);
      const calculated = fin?.invoices.find(i => i.id === invId);
      if (calculated) {
        setAmount(calculated.remainingAmount);
      }
      if (inv?.currency) {
        setCurrency(inv.currency);
        if (inv.exchangeRate) setExchangeRate(inv.exchangeRate);
      }
    }
  };

  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    setInvoiceId('');
    if (!paymentToEdit) {
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
    if (!selectedProject || amount <= 0) return;

    const payload = {
      paymentNumber,
      projectId,
      clientId: selectedProject.clientId,
      currency,
      exchangeRate: currency === projectCurrency ? 1.0 : (Number(exchangeRate) || 1.0),
      invoiceId: invoiceId || undefined,
      amount: Number(amount) || 0,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
    };

    if (paymentToEdit) {
      updateClientPayment(paymentToEdit.id, payload);
    } else {
      addClientPayment(payload);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentToEdit ? 'تعديل دفعة العميل' : 'تسجيل دفعة مستلمة من العميل'}
      subtitle="تحديث تحصيلات المشروع وأرصدة الفواتير تلقائياً ولحظياً"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الدفعة / الإيصال <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={paymentNumber}
              onChange={e => setPaymentNumber(e.target.value)}
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ استلام الدفعة <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
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

        {selectedClient && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between">
            <div>
              <span>العميل: </span>
              <strong className="text-slate-900">{selectedClient.name}</strong>
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
          amount={amount}
          transactionTypeLabel="الدفعة"
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ربط بفاتورة محددة (اختياري)
          </label>
          <select
            value={invoiceId}
            onChange={e => handleInvoiceChange(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="">دفعة عامة لحساب المشروع (غير مخصصة لفاتورة معينة)</option>
            {projectInvoices.map(inv => {
              const fin = getProjectFinancials(projectId);
              const calculated = fin?.invoices.find(i => i.id === inv.id);
              const invCurr = inv.currency || projectCurrency;
              return (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - إجمالي {formatCurrency(inv.totalAmount, invCurr)} (متبقي:{' '}
                  {formatCurrency(calculated?.remainingAmount ?? inv.totalAmount, invCurr)})
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المبلغ المستلم ({currSymbol}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold text-emerald-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {currency !== projectCurrency && (
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                يعادل: {formatCurrency(convertedAmountToProject, projectCurrency)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الدفع والتحصيل</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as ClientPaymentMethod)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {Object.entries(PAYMENT_METHOD_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الحوالة / المرجع البنكي</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            placeholder="TRF-xxxx-xxxx"
            className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات التحصيل</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="سداد الدفعة الأولى، حوالة بنك الأهلي، الخ..."
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
            {paymentToEdit ? 'حفظ التعديلات' : 'تسجيل الدفعة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
