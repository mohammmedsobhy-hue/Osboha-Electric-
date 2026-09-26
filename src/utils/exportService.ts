/**
 * Export Utility Service for Excel (XLSX), CSV, and PDF
 * Supports full Arabic UTF-8, RTL sheet layout, formatted summaries, and print-ready PDF documents
 */

import * as XLSX from 'xlsx';
import {
  Project,
  Client,
  TeamMember,
  Invoice,
  ProjectExpense,
  OverallFinancials,
  ProjectFinancials,
  ProjectStatus,
  InvoiceStatus,
} from '../types';
import {
  PROJECT_STATUS_MAP,
  INVOICE_STATUS_MAP,
  EXPENSE_CATEGORY_MAP,
  PAYMENT_METHOD_MAP,
  formatSAR,
  formatDate,
} from './formatters';

export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  summaryCards?: { label: string; value: string; color?: string }[];
  headers: string[];
  rows: (string | number)[][];
  footerNotes?: string;
}

/**
 * Export multiple or single sheets to a real .xlsx file
 */
export function exportToExcel(filename: string, sheets: SheetData[]) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set RTL direction for Excel sheet view
    if (!ws['!views']) {
      ws['!views'] = [];
    }
    ws['!views'].push({ rightToLeft: true });

    // Auto-fit column widths approximately
    const colWidths = sheet.headers.map((hdr, colIdx) => {
      let maxLen = hdr.length;
      sheet.rows.forEach(row => {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          const str = String(val);
          if (str.length > maxLen) maxLen = str.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  });

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Open a sleek, print-ready PDF window styled with Arabic typography and trigger print
 */
export function exportDocumentToPDF(options: PDFExportOptions) {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', 'width=980,height=750');
  } catch {
    printWindow = null;
  }

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const summaryHtml = options.summaryCards && options.summaryCards.length > 0
    ? `
      <div class="summary-grid">
        ${options.summaryCards
          .map(
            card => `
          <div class="summary-card">
            <span class="summary-label">${card.label}</span>
            <span class="summary-val">${card.value}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : '';

  const tableHeadersHtml = options.headers
    .map(h => `<th>${h}</th>`)
    .join('');

  const tableRowsHtml = options.rows
    .map(
      (row, idx) => `
      <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
        ${row.map(cell => `<td>${cell !== undefined && cell !== null ? cell : '-'}</td>`).join('')}
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${options.title} - Osboha Electric</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff;
          color: #0f172a;
          padding: 32px;
          line-height: 1.5;
          font-size: 13px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }

        .brand-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-badge {
          width: 44px;
          height: 44px;
          background-color: #0f172a;
          color: #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
        }

        .brand-text h1 {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .brand-text p {
          font-size: 12px;
          color: #64748b;
        }

        .doc-meta {
          text-align: left;
          font-size: 12px;
          color: #475569;
        }

        .doc-meta .title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .doc-meta .date {
          margin-top: 4px;
          font-size: 11px;
          color: #64748b;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          text-align: right;
        }

        .summary-label {
          display: block;
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .summary-val {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 12px;
        }

        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 600;
          text-align: right;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          white-space: nowrap;
        }

        td {
          padding: 9px 12px;
          border: 1px solid #e2e8f0;
          text-align: right;
        }

        tr.even {
          background-color: #ffffff;
        }

        tr.odd {
          background-color: #f8fafc;
        }

        .footer {
          margin-top: 36px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #94a3b8;
        }

        .actions-bar {
          background: #0f172a;
          color: white;
          padding: 12px 24px;
          position: sticky;
          top: 0;
          margin: -32px -32px 24px -32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .print-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          font-size: 13px;
        }
        
        .print-btn:hover {
          background: #059669;
        }

        .close-btn {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 7px 14px;
          border-radius: 6px;
          font-family: inherit;
          cursor: pointer;
          font-size: 12px;
        }

        @media print {
          .actions-bar {
            display: none !important;
          }
          body {
            padding: 0;
          }
          @page {
            margin: 1.5cm;
            size: landscape;
          }
        }
      </style>
    </head>
    <body>
      <div class="actions-bar">
        <span>جاهز للطباعة أو الحفظ كملف PDF</span>
        <div style="display: flex; gap: 8px;">
          <button class="print-btn" onclick="window.print()">طباعة / حفظ كملف PDF</button>
          <button class="close-btn" onclick="window.close()">إغلاق</button>
        </div>
      </div>

      <div class="header">
        <div class="brand-box">
          <div class="logo-badge" style="background: linear-gradient(135deg, #0f172a, #1e293b); border: 2px solid #38bdf8; color: #fbbf24; font-size: 18px;">⚡</div>
          <div class="brand-text">
            <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Osboha Electric</h1>
            <p>للمقاولات والأعمال الهندسية الكهربائية · إدارة المشاريع والمالية</p>
          </div>
        </div>
        <div class="doc-meta">
          <div class="title">${options.title}</div>
          ${options.subtitle ? `<div>${options.subtitle}</div>` : ''}
          <div class="date">تاريخ الإصدار: ${currentDate}</div>
        </div>
      </div>

      ${summaryHtml}

      <table>
        <thead>
          <tr>
            ${tableHeadersHtml}
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      ${options.footerNotes ? `<div style="font-size: 11px; color: #64748b; margin-top: 10px;">${options.footerNotes}</div>` : ''}

      <div class="footer">
        <div>تم التصدير آلياً عبر منصة Osboha Electric لإدارة المشاريع والحسابات والأرباح</div>
        <div>صفحة 1 من 1</div>
      </div>

      <script>
        // Auto trigger print prompt after styles load
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 400);
        });
      </script>
    </body>
    </html>
  `;

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback: Invisible iframe printing (compatible with iframes and popup blockers)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 500);
    }
  }
}

/**
 * High-level helper: Export Projects Table to Excel, PDF or CSV
 */
export function exportProjectsData(
  projects: Project[],
  clients: Client[],
  allProjectFinancials: Map<string, ProjectFinancials>,
  format: 'excel' | 'pdf' | 'csv'
) {
  const headers = [
    'كود المشروع',
    'اسم المشروع',
    'العميل',
    'الحالة',
    'قيمة العقد (SAR)',
    'الميزانية المعتمدة (SAR)',
    'إجمالي الفواتير (SAR)',
    'إجمالي التحصيل (SAR)',
    'المتبقي على العميل (SAR)',
    'مستحقات الفريق (SAR)',
    'المدفوع للفريق (SAR)',
    'المتبقي للفريق (SAR)',
    'المصروفات (SAR)',
    'نسبة استهلاك الميزانية',
    'الربح الفعلي (SAR)',
    'الربح المتوقع (SAR)',
    'هامش الربح',
  ];

  const rows = projects.map(p => {
    const client = clients.find(c => c.id === p.clientId);
    const fin = allProjectFinancials.get(p.id);
    return [
      p.code,
      p.name,
      client?.name || client?.companyName || '-',
      PROJECT_STATUS_MAP[p.status as ProjectStatus]?.label || p.status,
      p.contractValue,
      p.approvedBudget || 0,
      fin?.totalInvoiced || 0,
      fin?.totalCollected || 0,
      fin?.clientRemaining || 0,
      fin?.totalTeamEntitlements || 0,
      fin?.totalTeamPaid || 0,
      fin?.teamRemaining || 0,
      fin?.totalExpenses || 0,
      `${(fin?.budgetUsagePercent || 0).toFixed(1)}%`,
      fin?.actualProfit || 0,
      fin?.expectedProfit || 0,
      `${(fin?.actualProfitMargin || 0).toFixed(1)}%`,
    ];
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `osboha_projects_${timestamp}`;

  if (format === 'excel') {
    exportToExcel(filename, [
      {
        name: 'قائمة المشاريع',
        headers,
        rows,
      },
    ]);
  } else if (format === 'pdf') {
    const totalContract = projects.reduce((s: number, p: Project) => s + p.contractValue, 0);
    const totalCollected = projects.reduce((s: number, p: Project) => s + (allProjectFinancials.get(p.id)?.totalCollected || 0), 0);
    const totalActualProfit = projects.reduce((s: number, p: Project) => s + (allProjectFinancials.get(p.id)?.actualProfit || 0), 0);

    exportDocumentToPDF({
      title: 'سجل المشاريع والربحية والمطالبات',
      subtitle: `إجمالي ${projects.length} مشاريع مسجلة في النظام`,
      summaryCards: [
        { label: 'إجمالي قيمة العقود', value: formatSAR(totalContract) },
        { label: 'إجمالي المبالغ المحصلة', value: formatSAR(totalCollected) },
        { label: 'صافي الربح الفعلي', value: formatSAR(totalActualProfit) },
      ],
      headers,
      rows: rows.map(r => [
        r[0],
        r[1],
        r[2],
        r[3],
        formatSAR(Number(r[4])),
        formatSAR(Number(r[5])),
        formatSAR(Number(r[6])),
        formatSAR(Number(r[7])),
        formatSAR(Number(r[8])),
        formatSAR(Number(r[9])),
        formatSAR(Number(r[10])),
        formatSAR(Number(r[11])),
        formatSAR(Number(r[12])),
        r[13],
        formatSAR(Number(r[14])),
        formatSAR(Number(r[15])),
        r[16],
      ]),
    });
  } else {
    // CSV
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
        '\r\n'
      );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }
}

/**
 * High-level helper: Export Invoices Table to Excel, PDF or CSV
 */
export function exportInvoicesData(
  invoices: Invoice[],
  projects: Project[],
  clients: Client[],
  allProjectFinancials: Map<string, ProjectFinancials>,
  format: 'excel' | 'pdf' | 'csv'
) {
  const headers = [
    'رقم الفاتورة',
    'المشروع',
    'العميل',
    'تاريخ الإصدار',
    'تاريخ الاستحقاق',
    'المبلغ قبل الضريبة (SAR)',
    'ضريبة القيمة المضافة (SAR)',
    'إجمالي الفاتورة (SAR)',
    'المبلغ المحصل (SAR)',
    'المتبقي (SAR)',
    'الحالة',
  ];

  const rows = invoices.map(inv => {
    const p = projects.find(proj => proj.id === inv.projectId);
    const c = clients.find(cl => cl.id === inv.clientId);
    const fin = allProjectFinancials.get(inv.projectId);
    const calc = fin?.invoices.find(i => i.id === inv.id);

    const paid = calc?.paidAmount || 0;
    const remaining = calc?.remainingAmount ?? inv.totalAmount;
    const status = calc?.status || 'unpaid';

    return [
      inv.invoiceNumber,
      p?.name || '-',
      c?.name || c?.companyName || '-',
      formatDate(inv.issueDate),
      formatDate(inv.dueDate),
      inv.subtotal,
      inv.taxAmount,
      inv.totalAmount,
      paid,
      remaining,
      INVOICE_STATUS_MAP[status as InvoiceStatus]?.label || status,
    ];
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `osboha_invoices_${timestamp}`;

  if (format === 'excel') {
    exportToExcel(filename, [
      {
        name: 'سجل الفواتير الضريبية',
        headers,
        rows,
      },
    ]);
  } else if (format === 'pdf') {
    const totalInvoiced = invoices.reduce((s: number, i: Invoice) => s + i.totalAmount, 0);
    const totalTax = invoices.reduce((s: number, i: Invoice) => s + i.taxAmount, 0);
    const totalRemaining = invoices.reduce((s: number, inv: Invoice) => {
      const fin = allProjectFinancials.get(inv.projectId);
      const calc = fin?.invoices.find(i => i.id === inv.id);
      return s + (calc?.remainingAmount ?? inv.totalAmount);
    }, 0);

    exportDocumentToPDF({
      title: 'سجل الفواتير والمطالبات الضريبية',
      subtitle: `إجمالي ${invoices.length} فواتير مسجلة`,
      summaryCards: [
        { label: 'إجمالي الفواتير (شامل الضريبة)', value: formatSAR(totalInvoiced) },
        { label: 'إجمالي ضريبة القيمة المضافة', value: formatSAR(totalTax) },
        { label: 'إجمالي المتبقي غير المحصل', value: formatSAR(totalRemaining) },
      ],
      headers,
      rows: rows.map(r => [
        r[0],
        r[1],
        r[2],
        r[3],
        r[4],
        formatSAR(Number(r[5])),
        formatSAR(Number(r[6])),
        formatSAR(Number(r[7])),
        formatSAR(Number(r[8])),
        formatSAR(Number(r[9])),
        r[10],
      ]),
    });
  } else {
    // CSV
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
        '\r\n'
      );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }
}

/**
 * Export complete backup of all database tables into a multi-sheet Excel file (.xlsx)
 */
export function exportFullPlatformExcelBackup(db: any, allProjectFinancials: Map<string, ProjectFinancials>) {
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. Projects Sheet
  const projectHeaders = ['كود المشروع', 'اسم المشروع', 'معرف العميل', 'قيمة العقد (SAR)', 'تاريخ البداية', 'تاريخ النهاية', 'الحالة'];
  const projectRows = db.projects.map((p: any) => [
    p.code,
    p.name,
    p.clientId,
    p.contractValue,
    p.startDate,
    p.endDate,
    PROJECT_STATUS_MAP[p.status as keyof typeof PROJECT_STATUS_MAP]?.label || p.status,
  ]);

  // 2. Clients Sheet
  const clientHeaders = ['الاسم', 'اسم الشركة', 'البريد الإلكتروني', 'الجوال', 'الرقم الضريبي', 'العنوان'];
  const clientRows = db.clients.map((c: any) => [
    c.name,
    c.companyName || '',
    c.email,
    c.phone,
    c.vatNumber || '',
    c.address || '',
  ]);

  // 3. Team Sheet
  const teamHeaders = ['الاسم', 'المسمى الوظيفي', 'البريد الإلكتروني', 'الجوال', 'الآيبان IBAN'];
  const teamRows = db.teamMembers.map((m: any) => [
    m.name,
    m.role,
    m.email,
    m.phone,
    m.iban || '',
  ]);

  // 4. Invoices Sheet
  const invoiceHeaders = ['رقم الفاتورة', 'معرف المشروع', 'تاريخ الإصدار', 'تاريخ الاستحقاق', 'المبلغ قبل الضريبة', 'الضريبة', 'الإجمالي'];
  const invoiceRows = db.invoices.map((i: any) => [
    i.invoiceNumber,
    i.projectId,
    i.issueDate,
    i.dueDate,
    i.subtotal,
    i.taxAmount,
    i.totalAmount,
  ]);

  // 5. Client Payments Sheet
  const clientPayHeaders = ['رقم السند', 'معرف المشروع', 'المبلغ', 'التاريخ', 'طريقة الدفع', 'الرقم المرجعي', 'ملاحظات'];
  const clientPayRows = db.clientPayments.map((cp: any) => [
    cp.paymentNumber,
    cp.projectId,
    cp.amount,
    cp.paymentDate,
    cp.paymentMethod,
    cp.referenceNumber,
    cp.notes || '',
  ]);

  // 6. Team Payments Sheet
  const teamPayHeaders = ['رقم السند', 'معرف المشروع', 'معرف العضو', 'المبلغ', 'التاريخ', 'طريقة الدفع', 'الرقم المرجعي'];
  const teamPayRows = db.teamPayments.map((tp: any) => [
    tp.paymentNumber,
    tp.projectId,
    tp.teamMemberId,
    tp.amount,
    tp.paymentDate,
    tp.paymentMethod,
    tp.referenceNumber,
  ]);

  // 7. Expenses Sheet
  const expenseHeaders = ['رقم المصروف', 'معرف المشروع', 'التصنيف', 'الوصف', 'المورد', 'المبلغ', 'التاريخ', 'طريقة الدفع'];
  const expenseRows = db.expenses.map((e: any) => [
    e.expenseNumber,
    e.projectId,
    EXPENSE_CATEGORY_MAP[e.category as keyof typeof EXPENSE_CATEGORY_MAP] || e.category,
    e.description,
    e.vendor,
    e.amount,
    e.expenseDate,
    e.paymentMethod,
  ]);

  exportToExcel(`osboha_backup_${timestamp}.xlsx`, [
    { name: 'المشاريع', headers: projectHeaders, rows: projectRows },
    { name: 'العملاء', headers: clientHeaders, rows: clientRows },
    { name: 'فريق العمل', headers: teamHeaders, rows: teamRows },
    { name: 'الفواتير', headers: invoiceHeaders, rows: invoiceRows },
    { name: 'دفعات العملاء', headers: clientPayHeaders, rows: clientPayRows },
    { name: 'دفعات الفريق', headers: teamPayHeaders, rows: teamPayRows },
    { name: 'المصروفات', headers: expenseHeaders, rows: expenseRows },
  ]);
}

