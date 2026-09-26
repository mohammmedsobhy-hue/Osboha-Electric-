import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatSAR } from '../../utils/formatters';

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
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState<number>(10000);
  const [taxRate, setTaxRate] = useState<number>(15);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (invoiceToEdit) {
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setProjectId(invoiceToEdit.projectId);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setSubtotal(invoiceToEdit.subtotal);
      setTaxRate(invoiceToEdit.taxRate);
      setNotes(invoiceToEdit.notes || '');
    } else {
      const nextNum = db.invoices.length + 1;
      setInvoiceNumber(`INV-2026-${String(nextNum).padStart(3, '0')}`);
      setProjectId(defaultProjectId || db.projects[0]?.id || '');
      setIssueDate(new Date().toISOString().slice(0, 10));

      const due = new Date();
      due.setDate(due.getDate() + 15);
      setDueDate(due.toISOString().slice(0, 10));
      setSubtotal(25000);
      setTaxRate(15);
      setNotes('دفعة مستحقة تعاقدياً شاملة ضريبة القيمة المضافة.');
    }
  }, [invoiceToEdit, defaultProjectId, isOpen, db.invoices.length, db.projects]);

  // Calculations
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Selected project client
  const selectedProject = db.projects.find(p => p.id === projectId);
  const selectedClient = db.clients.find(c => c.id === selectedProject?.clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !projectId) return;

    if (!selectedProject) return;

    if (invoiceToEdit) {
      updateInvoice(invoiceToEdit.id, {
        invoiceNumber,
        projectId,
        clientId: selectedProject.clientId,
        issueDate,
        dueDate,
        subtotal: Number(subtotal) || 0,
        taxRate: Number(taxRate) || 0,
        taxAmount,
        totalAmount,
        notes,
      });
    } else {
      addInvoice({
        invoiceNumber,
        projectId,
        clientId: selectedProject.clientId,
        issueDate,
        dueDate,
        subtotal: Number(subtotal) || 0,
        taxRate: Number(taxRate) || 0,
        taxAmount,
        totalAmount,
        notes,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoiceToEdit ? 'تعديل الفاتورة' : 'إصدار فاتورة ضريبية جديدة'}
      subtitle="تحديد المشروع، القيمة، وضريبة القيمة المضافة 15%"
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
              onChange={e => setProjectId(e.target.value)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {db.projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClient && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <span>العميل المرتبط: </span>
            <strong className="text-slate-900">{selectedClient.name}</strong>
            {selectedClient.companyName && <span className="text-slate-500"> ({selectedClient.companyName})</span>}
          </div>
        )}

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
              المبلغ الخاضع للضريبة (SAR) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="100"
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
              <option value={0}>0% (معفاة / بدون ضريبة)</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>المبلغ الخاضع للضريبة:</span>
            <span className="font-mono font-bold text-slate-900">{formatSAR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>ضريبة القيمة المضافة ({taxRate}%):</span>
            <span className="font-mono font-bold text-emerald-800">+{formatSAR(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-emerald-200">
            <span>إجمالي الفاتورة المستحق (SAR):</span>
            <span className="font-mono text-emerald-950 font-black">{formatSAR(totalAmount)}</span>
          </div>
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
