/**
 * Formatting and Utility Helpers for Currencies (SAR & EGP), Dates, and Statuses
 */

import {
  Currency,
  ProjectStatus,
  InvoiceStatus,
  ExpenseCategory,
  ClientPaymentMethod,
  TeamPaymentMethod,
} from '../types';

export const CURRENCY_INFO: Record<
  Currency,
  { code: Currency; name: string; symbol: string; flag: string; label: string }
> = {
  SAR: {
    code: 'SAR',
    name: 'ريال سعودي',
    symbol: 'ر.س',
    flag: '🇸🇦',
    label: 'ريال سعودي (SAR)',
  },
  EGP: {
    code: 'EGP',
    name: 'جنيه مصري',
    symbol: 'ج.م',
    flag: '🇪🇬',
    label: 'جنيه مصري (EGP)',
  },
};

/**
 * Default exchange rate: 1 SAR = 13.00 EGP (approx market rate)
 */
export const DEFAULT_EXCHANGE_RATE_SAR_TO_EGP = 13.0;

/**
 * Format any number with specified currency (SAR or EGP)
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency: Currency = 'SAR',
  includeDecimals = false
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${CURRENCY_INFO[currency]?.symbol || currency}`;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);

  return `${formatted} ${CURRENCY_INFO[currency]?.symbol || currency}`;
}

/**
 * Format number to Saudi Riyal (ر.س)
 */
export function formatSAR(amount: number | undefined | null, includeDecimals = false): string {
  return formatCurrency(amount, 'SAR', includeDecimals);
}

/**
 * Format number to Egyptian Pound (ج.م)
 */
export function formatEGP(amount: number | undefined | null, includeDecimals = false): string {
  return formatCurrency(amount, 'EGP', includeDecimals);
}

/**
 * Convert an amount between SAR and EGP based on the given exchange rate
 * exchangeRateSARtoEGP: Number of EGP per 1 SAR (e.g. 13.00)
 */
export function convertCurrency(
  amount: number | undefined | null,
  fromCurrency: Currency = 'SAR',
  toCurrency: Currency = 'SAR',
  exchangeRateSARtoEGP: number = DEFAULT_EXCHANGE_RATE_SAR_TO_EGP
): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  const rate = exchangeRateSARtoEGP > 0 ? exchangeRateSARtoEGP : DEFAULT_EXCHANGE_RATE_SAR_TO_EGP;

  if (fromCurrency === 'SAR' && toCurrency === 'EGP') {
    return amount * rate;
  }
  if (fromCurrency === 'EGP' && toCurrency === 'SAR') {
    return amount / rate;
  }

  return amount;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Format standard ISO date (YYYY-MM-DD) to friendly Arabic date
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Project Status Labels & Colors
 */
export const PROJECT_STATUS_MAP: Record<
  ProjectStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  planning: {
    label: 'تخطيط',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  in_progress: {
    label: 'قيد التنفيذ',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  on_hold: {
    label: 'معلق',
    textClass: 'text-orange-800',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
  },
  completed: {
    label: 'مكتمل',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  cancelled: {
    label: 'ملغي',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
};

/**
 * Invoice Status Labels & Colors
 */
export const INVOICE_STATUS_MAP: Record<
  InvoiceStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  unpaid: {
    label: 'غير مدفوعة',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
  partially_paid: {
    label: 'مدفوعة جزئياً',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  paid: {
    label: 'مدفوعة بالكامل',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  overdue: {
    label: 'متأخرة',
    textClass: 'text-purple-800',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
  },
};

/**
 * Expense Categories
 */
export const EXPENSE_CATEGORY_MAP: Record<ExpenseCategory, string> = {
  software_servers: 'برمجيات وسيرفرات واستضافة',
  licenses: 'تراخيص واشتراكات أدوات',
  subcontractors: 'استشارات ومستقلين خارجيين',
  marketing: 'تسويق وإعلانات',
  hardware: 'أجهزة ومعدات ومستلزمات',
  travel_hospitality: 'تنقلات وضيافة واجتماعات',
  other: 'مصروفات تشغيلية أخرى',
};

/**
 * Payment Methods
 */
export const PAYMENT_METHOD_MAP: Record<ClientPaymentMethod | TeamPaymentMethod, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي (كاش)',
  check: 'شيك مصرفي',
  mada: 'بطاقة مدى',
  sadad: 'سداد',
};

/**
 * Helper to export array of objects to CSV
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Arabic text in Excel
    [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
