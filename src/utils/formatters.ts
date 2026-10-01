/**
 * Formatting and Utility Helpers for Currencies (SAR & EGP), Dates, and Statuses
 */

import {
  Currency,
  ProjectStatus,
  TaskStatus,
  ProjectAttachmentCategory,
  InvoiceStatus,
  ExpenseCategory,
  ClientPaymentMethod,
  TeamPaymentMethod,
} from '../types';

export const CURRENCY_INFO: Record<
  string,
  { code: string; name: string; symbol: string; flag: string; label: string }
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
  USD: {
    code: 'USD',
    name: 'دولار أمريكي',
    symbol: '$',
    flag: '🇺🇸',
    label: 'دولار أمريكي (USD)',
  },
  EUR: {
    code: 'EUR',
    name: 'يورو أوروبي',
    symbol: '€',
    flag: '🇪🇺',
    label: 'يورو أوروبي (EUR)',
  },
  AED: {
    code: 'AED',
    name: 'درهم إماراتي',
    symbol: 'د.إ',
    flag: '🇦🇪',
    label: 'درهم إماراتي (AED)',
  },
  GBP: {
    code: 'GBP',
    name: 'جنيه إسترليني',
    symbol: '£',
    flag: '🇬🇧',
    label: 'جنيه إسترليني (GBP)',
  },
  KWD: {
    code: 'KWD',
    name: 'دينار كويتي',
    symbol: 'د.ك',
    flag: '🇰🇼',
    label: 'دينار كويتي (KWD)',
  },
  QAR: {
    code: 'QAR',
    name: 'ريال قطري',
    symbol: 'ر.ق',
    flag: '🇶🇦',
    label: 'ريال قطري (QAR)',
  },
  BHD: {
    code: 'BHD',
    name: 'دينار بحريني',
    symbol: 'د.ب',
    flag: '🇧🇭',
    label: 'دينار بحريني (BHD)',
  },
  OMR: {
    code: 'OMR',
    name: 'ريال عماني',
    symbol: 'ر.ع',
    flag: '🇴🇲',
    label: 'ريال عماني (OMR)',
  },
};

/**
 * Standard exchange rates against 1 SAR (approximate reference rates)
 * Example: 1 SAR = 13.00 EGP, 1 USD = 3.75 SAR, etc.
 */
export const DEFAULT_EXCHANGE_RATE_SAR_TO_EGP = 13.0;

// Base values: how many SAR is 1 unit of this currency
export const DEFAULT_RATES_TO_SAR: Record<string, number> = {
  SAR: 1.0,
  EGP: 1 / 13.0, // ~0.07692 SAR per 1 EGP
  USD: 3.75, // 1 USD = 3.75 SAR
  EUR: 4.10, // 1 EUR = 4.10 SAR
  AED: 1.02, // 1 AED = 1.02 SAR
  GBP: 4.85, // 1 GBP = 4.85 SAR
  KWD: 12.20, // 1 KWD = 12.20 SAR
  QAR: 1.03, // 1 QAR = 1.03 SAR
  BHD: 9.95, // 1 BHD = 9.95 SAR
  OMR: 9.75, // 1 OMR = 9.75 SAR
};

/**
 * Get default recommended exchange rate between any two currencies.
 * Returns how many units of `toCurrency` does 1 unit of `fromCurrency` equal.
 */
export function getDefaultExchangeRate(fromCurrency: Currency = 'SAR', toCurrency: Currency = 'SAR'): number {
  if (fromCurrency === toCurrency) return 1.0;

  const fromInSAR = DEFAULT_RATES_TO_SAR[fromCurrency] ?? 1.0;
  const toInSAR = DEFAULT_RATES_TO_SAR[toCurrency] ?? 1.0;

  if (toInSAR <= 0) return 1.0;
  // 1 unit of fromCurrency = fromInSAR SAR
  // 1 SAR = 1 / toInSAR of toCurrency
  // Therefore 1 unit of fromCurrency = (fromInSAR / toInSAR) of toCurrency
  const rate = fromInSAR / toInSAR;
  return Number(rate.toFixed(4));
}

/**
 * Convert transaction amount from transaction currency to project/base currency
 */
export function convertTransactionAmount(
  amount: number | undefined | null,
  fromCurrency: Currency = 'SAR',
  toProjectCurrency: Currency = 'SAR',
  exchangeRate?: number
): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (fromCurrency === toProjectCurrency) return amount;

  if (exchangeRate && exchangeRate > 0) {
    return amount * exchangeRate;
  }

  const defaultRate = getDefaultExchangeRate(fromCurrency, toProjectCurrency);
  return amount * defaultRate;
}

/**
 * Format any number with specified currency (SAR, EGP, USD, EUR, etc.)
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
 * Format dual currency representation (e.g. "1,000 $ (3,750 ر.س)")
 */
export function formatDualCurrency(
  amount: number | undefined | null,
  transactionCurrency: Currency = 'SAR',
  projectCurrency: Currency = 'SAR',
  exchangeRate?: number
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return formatCurrency(0, projectCurrency);
  }
  if (transactionCurrency === projectCurrency) {
    return formatCurrency(amount, projectCurrency);
  }
  const converted = convertTransactionAmount(amount, transactionCurrency, projectCurrency, exchangeRate);
  return `${formatCurrency(amount, transactionCurrency)} (${formatCurrency(converted, projectCurrency)})`;
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
  { label: string; textClass: string; bgClass: string; borderClass: string; dotClass: string; badgeClass: string; description: string }
> = {
  in_progress: {
    label: 'قيد التنفيذ',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'المشروع قيد العمل والتنفيذ النشط من الفريق',
  },
  completed: {
    label: 'مكتمل',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'تم تسليم المشروع وإغلاق كافة المهام والمخرجات',
  },
  on_hold: {
    label: 'متوقف',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'المشروع متوقف مؤقتاً في انتظار موافقة أو متطلبات',
  },
  planning: {
    label: 'تخطيط',
    textClass: 'text-purple-800',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'المشروع في مرحلة الإعداد وتحديد النطاق وجدولة المهام',
  },
  cancelled: {
    label: 'ملغي',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'تم إلغاء المشروع باتفاق الطرفين',
  },
};

/**
 * Task Status Classification Labels, Colors, and Metadata
 */
export const TASK_STATUS_MAP: Record<
  TaskStatus,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    dotClass: string;
    badgeClass: string;
    description: string;
    emoji: string;
  }
> = {
  pending: {
    label: 'قيد الانتظار',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'المهمة بانتظار بدء العمل أو استكمال التبعيات والموافقات',
    emoji: '⏳',
  },
  not_started: {
    label: 'قيد الانتظار',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'المهمة مجدولة ولم يبدأ تنفيذها بعد',
    emoji: '⏳',
  },
  in_progress: {
    label: 'قيد التنفيذ',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'المهمة قيد العمل والتنفيذ النشط من قبل الفريق',
    emoji: '⚡',
  },
  completed: {
    label: 'مكتملة',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'تم إنجاز وتسليم كافة مخرجات المهمة بنجاح 100%',
    emoji: '✅',
  },
  on_hold: {
    label: 'معلقة / متوقفة',
    textClass: 'text-slate-800',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'المهمة متوقفة مؤقتاً لوجود عائق أو انتظار مورد خارجي',
    emoji: '⏸️',
  },
  delayed: {
    label: 'متأخرة عن الجدول',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'تجاوزت المهمة الموعد النهائي المحدد لها دون اكتمال',
    emoji: '⚠️',
  },
};

/**
 * Safely retrieve task status information with fallback
 */
export function getTaskStatusInfo(status?: TaskStatus | string) {
  if (!status) return TASK_STATUS_MAP.pending;
  const mapped = TASK_STATUS_MAP[status as TaskStatus];
  if (mapped) return mapped;
  if (status === 'not_started') return TASK_STATUS_MAP.pending;
  return TASK_STATUS_MAP.pending;
}

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
 * Project Attachment Categories, Metadata, and Styling
 */
export const ATTACHMENT_CATEGORY_MAP: Record<
  ProjectAttachmentCategory,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    emoji: string;
    description: string;
  }
> = {
  contract: {
    label: 'عقد رسمي',
    textClass: 'text-purple-800',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    emoji: '📄',
    description: 'عقود المقاولات والاتفاقيات الرسمية الموقعة',
  },
  blueprint: {
    label: 'مخطط هندسي',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    emoji: '📐',
    description: 'المخططات الهندسية والرسومات واللوحات التنفيذية CAD/DWG',
  },
  specifications: {
    label: 'مواصفات فنية',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    emoji: '📋',
    description: 'كراسة الشروط والمواصفات الفنية المعتمدة للمواد والأجهزة',
  },
  acceptance_act: {
    label: 'محضر استلام',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    emoji: '📝',
    description: 'محاضر الاستلام الابتدائي، الفحص الميداني، والتسليم النهائي',
  },
  financial_invoice: {
    label: 'مستند مالي',
    textClass: 'text-cyan-800',
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    emoji: '💼',
    description: 'فواتير المشتريات، إشعارات التحويل، وكشوفات الحساب البنكية',
  },
  permit: {
    label: 'تصريح وموافقة',
    textClass: 'text-indigo-800',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    emoji: '🏛️',
    description: 'رخص البناء، تصاريح السلامة (الدفاع المدني)، وشركة الكهرباء',
  },
  other: {
    label: 'مستند عام',
    textClass: 'text-slate-800',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    emoji: '📁',
    description: 'مستندات وتقارير ومرفقات عامة أخرى للمشروع',
  },
};

export function getAttachmentCategoryInfo(cat?: ProjectAttachmentCategory | string) {
  if (!cat) return ATTACHMENT_CATEGORY_MAP.other;
  return ATTACHMENT_CATEGORY_MAP[cat as ProjectAttachmentCategory] || ATTACHMENT_CATEGORY_MAP.other;
}

/**
 * Format raw byte size into friendly Arabic units (كيلوبايت / ميجابايت)
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 كيلوبايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} ${sizes[0]}`;
  const val = (bytes / Math.pow(k, i)).toFixed(1);
  return `${val} ${sizes[i]}`;
}

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
