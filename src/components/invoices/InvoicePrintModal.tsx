import React from 'react';
import { Printer, X, Download, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, INVOICE_STATUS_MAP, CURRENCY_INFO } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportService';
import { BrandLogo } from '../common/BrandLogo';

interface InvoicePrintModalProps {
  invoiceId: string | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoiceId, onClose }) => {
  const { db, getProjectFinancials } = useApp();

  if (!invoiceId) return null;

  const invoice = db.invoices.find(i => i.id === invoiceId);
  if (!invoice) return null;

  const project = db.projects.find(p => p.id === invoice.projectId);
  const client = db.clients.find(c => c.id === invoice.clientId);
  const fin = getProjectFinancials(invoice.projectId);
  const invCalculated = fin?.invoices.find(i => i.id === invoice.id);

  const invCurrency = invoice.currency || project?.currency || 'SAR';
  const currSymbol = CURRENCY_INFO[invCurrency].symbol;

  const status = invCalculated?.status || 'unpaid';
  const statusMeta = INVOICE_STATUS_MAP[status];

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const itemHeaders = [`البند والوصف`, 'الكمية', `سعر الوحدة (${currSymbol})`, `الإجمالي (${currSymbol})`];
    const itemRows = (invoice.items || []).map(item => [
      item.description,
      item.quantity,
      item.unitPrice,
      item.total,
    ]);

    // Append subtotal, vat, and total
    itemRows.push([`المجموع قبل الضريبة (${currSymbol})`, '', '', invoice.subtotal]);
    itemRows.push([`ضريبة القيمة المضافة (${invoice.taxRate}%)`, '', '', invoice.taxAmount]);
    itemRows.push([`المبلغ الإجمالي شامل الضريبة (${currSymbol})`, '', '', invoice.totalAmount]);
    itemRows.push([`المسدد من العميل (${currSymbol})`, '', '', invCalculated?.paidAmount || 0]);
    itemRows.push([`المتبقي بذمة العميل (${currSymbol})`, '', '', invCalculated?.remainingAmount ?? invoice.totalAmount]);

    exportToExcel(`فاتورة_${invoice.invoiceNumber}`, [
      {
        name: `فاتورة ${invoice.invoiceNumber}`,
        headers: itemHeaders,
        rows: itemRows,
      },
    ]);
  };

  return (
    <Modal isOpen={Boolean(invoiceId)} onClose={onClose} title="معاينة وطباعة الفاتورة الضريبية" maxWidth="3xl">
      <div className="space-y-4 text-right">
        {/* Print Action Bar */}
        <div className="flex items-center justify-between no-print pb-3 border-b border-slate-200">
          <span className="text-xs text-slate-500">
            يمكنك طباعة الفاتورة أو حفظها كملف PDF عبر أمر الطباعة أو تصديرها كـ Excel
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Official Invoice Container */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6 text-slate-900 printable-invoice">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
            <div>
              <BrandLogo variant="light" size="md" />
              <p className="text-xs text-slate-500 font-mono mt-2">الرقم الضريبي (VAT): 310998877600003 · س.ت: 1010889922</p>
              <p className="text-[11px] text-slate-500 mt-1">
                طريق الملك فهد، الرياض · المقاولات والتجهيزات الهندسية الكهربائية · info@osboha-electric.com
              </p>
            </div>

            <div className="text-left font-mono">
              <span className="text-xl font-black text-slate-950 tracking-wide block uppercase">
                فاتورة ضريبية
              </span>
              <span className="text-xs text-slate-600 block mt-1">TAX INVOICE</span>
              <span className="text-xs font-bold text-slate-900 block mt-2">#{invoice.invoiceNumber}</span>
              <span className={`inline-block px-2 py-0.5 mt-1.5 rounded text-[10px] font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">فاتورة إلى (العميل):</span>
              <h4 className="font-bold text-slate-900 text-sm">{client?.name}</h4>
              {client?.companyName && <p className="text-slate-600 mt-0.5">{client.companyName}</p>}
              {client?.vatNumber && (
                <p className="text-slate-600 font-mono mt-1">الرقم الضريبي: {client.vatNumber}</p>
              )}
              {client?.address && <p className="text-slate-500 mt-0.5">{client.address}</p>}
              {client?.phone && <p className="text-slate-500 mt-0.5">{client.phone}</p>}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">المشروع:</span>
                <span className="font-bold text-slate-900 font-sans">{project?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">كود المشروع:</span>
                <span className="font-bold text-slate-700">{project?.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">تاريخ الإصدار:</span>
                <span className="text-slate-800">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">تاريخ الاستحقاق:</span>
                <span className="text-slate-800 font-bold">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Table Breakdown */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-bold">البند والوصف</th>
                  <th className="py-2.5 px-4 text-center font-bold">الكمية</th>
                  <th className="py-2.5 px-4 text-left font-bold font-mono">السعر ({currSymbol})</th>
                  <th className="py-2.5 px-4 text-left font-bold font-mono">الإجمالي ({currSymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{project?.name}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {invoice.notes || 'خدمات تطوير برمجية واستشارية وفق العقد المبرم'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">1</td>
                  <td className="py-3 px-4 text-left font-mono">{formatCurrency(invoice.subtotal, invCurrency)}</td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                    {formatCurrency(invoice.subtotal, invCurrency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-between items-start gap-4 pt-2">
            <div className="w-1/2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
              <span className="font-bold text-slate-800 block">معلومات السداد والتحويل:</span>
              <p className="text-slate-600">مصرف الراجحي · الحساب: 1234567890123</p>
              <p className="text-slate-600 font-mono">IBAN: SA4480000123608010123456</p>
              <p className="text-slate-500 text-[10px] mt-1">يرجى إرفاق رقم الفاتورة في وصف التحويل البنكي.</p>
            </div>

            <div className="w-1/2 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">المبلغ قبل الضريبة (Subtotal):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice.subtotal, invCurrency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ضريبة القيمة المضافة ({invoice.taxRate}%):</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice.taxAmount, invCurrency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-slate-900 font-bold text-sm bg-slate-50 px-2 rounded">
                <span className="text-slate-900">إجمالي الفاتورة المستحق:</span>
                <span className="font-mono text-slate-950 font-black">{formatCurrency(invoice.totalAmount, invCurrency)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-700">
                <span>المبلغ المسدد:</span>
                <span className="font-mono font-bold">-{formatCurrency(invCalculated?.paidAmount || 0, invCurrency)}</span>
              </div>
              <div className="flex justify-between py-1 text-amber-800 font-bold">
                <span>المتبقي المطلوب سداده:</span>
                <span className="font-mono font-bold">{formatCurrency(invCalculated?.remainingAmount || 0, invCurrency)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Stamp */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>فاتورة إلكترونية معتمدة صادرة من نظام Osboha Electric المالي</span>
            <span className="font-mono">صفحة 1 من 1</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
