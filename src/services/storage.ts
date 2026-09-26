/**
 * Database storage, relational calculation engine, and initial seed data
 */

import {
  Currency,
  Client,
  TeamMember,
  Project,
  ProjectTeamAssignment,
  Invoice,
  ClientPayment,
  TeamPayment,
  ProjectExpense,
  ProjectFinancials,
  CalculatedInvoice,
  CalculatedProjectTeamMember,
  OverallFinancials,
  DashboardFilters,
  ProjectTask,
  User,
} from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATE_SAR_TO_EGP } from '../utils/formatters';

export interface AppDatabase {
  clients: Client[];
  teamMembers: TeamMember[];
  projects: Project[];
  projectAssignments: ProjectTeamAssignment[];
  invoices: Invoice[];
  clientPayments: ClientPayment[];
  teamPayments: TeamPayment[];
  expenses: ProjectExpense[];
  tasks: ProjectTask[];
  users: User[];
}

const STORAGE_KEY = 'rakaiz_financial_db_v1';

// Seed Initial Data
export const INITIAL_DATA: AppDatabase = {
  clients: [
    {
      id: 'c-1',
      name: 'مجموعة الأفق العقارية',
      companyName: 'شركة الأفق للاستثمار العقاري والتطوير',
      email: 'finance@al-ofuq.sa',
      phone: '+966 11 450 8899',
      vatNumber: '310245678900003',
      address: 'طريق الملك فهد، حي الصحافة، الرياض',
      createdAt: '2026-01-10T09:00:00Z',
    },
    {
      id: 'c-2',
      name: 'متاجر نجد للتجزئة',
      companyName: 'مؤسسة نجد الحديثة للتجارة الإلكترونية',
      email: 'support@najdstores.com',
      phone: '+966 12 670 1234',
      vatNumber: '300987654300003',
      address: 'طريق الأمير محمد بن عبد العزيز، جدة',
      createdAt: '2026-01-15T10:30:00Z',
    },
    {
      id: 'c-3',
      name: 'مجموعة الروابي القابضة',
      companyName: 'الروابي للصناعة والخدمات اللوجستية',
      email: 'info@alrawabi-group.sa',
      phone: '+966 13 833 4455',
      vatNumber: '311876543200003',
      address: 'الخبر الشمالية، المنطقة الشرقية',
      createdAt: '2026-02-01T11:00:00Z',
    },
    {
      id: 'c-4',
      name: 'شركة تمكين للاستشارات المالية',
      companyName: 'تمكين كابيتال المالية',
      email: 'partners@tamkeen-fin.com',
      phone: '+966 11 200 9988',
      vatNumber: '302345678900003',
      address: 'حي العليا، برج الفيصلية، الرياض',
      createdAt: '2026-02-18T14:00:00Z',
    },
  ],

  teamMembers: [
    {
      id: 't-1',
      name: 'عبدالله السعيد',
      role: 'مهندس حلول برمجية أول (Lead Developer)',
      email: 'a.alsaeed@team.sa',
      phone: '+966 50 123 4567',
      iban: 'SA4480000123608010123456',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 't-2',
      name: 'سارة القحطاني',
      role: 'مصممة واجهات وتجربة المستخدم (UI/UX Designer)',
      email: 's.alqahtani@team.sa',
      phone: '+966 55 987 6543',
      iban: 'SA5510000456608010654321',
      createdAt: '2026-01-02T08:00:00Z',
    },
    {
      id: 't-3',
      name: 'عمر باوزير',
      role: 'مطور تطبيقات وواجهات أمامية (Frontend Developer)',
      email: 'o.bawazir@team.sa',
      phone: '+966 54 321 0987',
      iban: 'SA9020000789608010789123',
      createdAt: '2026-01-05T08:00:00Z',
    },
    {
      id: 't-4',
      name: 'نورة المطيري',
      role: 'أخصائية ضمان الجودة واختبار البرمجيات (QA Lead)',
      email: 'n.almutairi@team.sa',
      phone: '+966 56 654 3210',
      iban: 'SA1240000321608010321456',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 't-5',
      name: 'ماجد الشمري',
      role: 'مهندس سحابي وأمن سيبراني (DevOps & Security)',
      email: 'm.alshammari@team.sa',
      phone: '+966 53 777 8899',
      iban: 'SA7750000999608010999888',
      createdAt: '2026-01-15T08:00:00Z',
    },
  ],

  projects: [
    {
      id: 'p-1',
      code: 'PRJ-2026-001',
      name: 'بوابة الخدمات الرقمية وإدارة العقارات',
      clientId: 'c-1',
      contractValue: 130000,
      approvedBudget: 15000,
      currency: 'SAR',
      startDate: '2026-01-15',
      endDate: '2026-05-30',
      status: 'in_progress',
      description: 'بناء منصة متكاملة لإدارة عقود الإيجار، الصيانة الإلكترونية، وبوابة المستأجرين.',
      createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'p-2',
      code: 'PRJ-2026-002',
      name: 'تطبيق التجزئة السريع والتجارة الإلكترونية',
      clientId: 'c-2',
      contractValue: 95000,
      approvedBudget: 10000,
      currency: 'SAR',
      startDate: '2026-02-01',
      endDate: '2026-04-15',
      status: 'in_progress',
      description: 'تطبيق وموقع تجارة إلكترونية يدعم التوصيل الفوري والدفع عبر Apple Pay ومدى.',
      createdAt: '2026-02-01T11:00:00Z',
    },
    {
      id: 'p-3',
      code: 'PRJ-2026-003',
      name: 'نظام ERP السحابي لإدارة سلاسل الإمداد',
      clientId: 'c-3',
      contractValue: 260000,
      approvedBudget: 25000,
      currency: 'SAR',
      startDate: '2026-02-15',
      endDate: '2026-08-30',
      status: 'in_progress',
      description: 'نظام إدارة لوجستية وسلاسل إمداد وربط المستودعات والفواتير الضريبية.',
      createdAt: '2026-02-15T09:30:00Z',
    },
    {
      id: 'p-4',
      code: 'PRJ-2026-004',
      name: 'منصة التحليل المالي والتقارير الاستثمارية (القاهرة)',
      clientId: 'c-4',
      contractValue: 750000,
      approvedBudget: 12000,
      currency: 'EGP',
      startDate: '2026-01-05',
      endDate: '2026-03-10',
      status: 'completed',
      description: 'تطوير لوحة تحكم تفاعلية لعرض مؤشرات الأداء المالي والمحافظ الاستثمارية بالجنيه المصري.',
      createdAt: '2026-01-05T08:30:00Z',
    },
  ],

  projectAssignments: [
    // Project 1 assignments
    {
      id: 'pa-1',
      projectId: 'p-1',
      teamMemberId: 't-1',
      roleInProject: 'مدير تقني ومطور باك إند رئيسي',
      compensationType: 'percentage',
      compensationValue: 18, // 18% of 130,000 = 23,400 SAR
    },
    {
      id: 'pa-2',
      projectId: 'p-1',
      teamMemberId: 't-2',
      roleInProject: 'تصميم تجربة المستخدم والنماذج التفاعلية',
      compensationType: 'fixed',
      compensationValue: 12000, // 12,000 SAR
    },
    {
      id: 'pa-3',
      projectId: 'p-1',
      teamMemberId: 't-3',
      roleInProject: 'تطوير الواجهات الأمامية بالرياكت',
      compensationType: 'percentage',
      compensationValue: 12, // 12% of 130,000 = 15,600 SAR
    },

    // Project 2 assignments
    {
      id: 'pa-4',
      projectId: 'p-2',
      teamMemberId: 't-1',
      roleInProject: 'إعداد معماريات الدفع والسيرفرات',
      compensationType: 'fixed',
      compensationValue: 15000,
    },
    {
      id: 'pa-5',
      projectId: 'p-2',
      teamMemberId: 't-3',
      roleInProject: 'تطوير تطبيق المتجر الإلكتروني',
      compensationType: 'percentage',
      compensationValue: 20, // 20% of 95,000 = 19,000 SAR
    },
    {
      id: 'pa-6',
      projectId: 'p-2',
      teamMemberId: 't-4',
      roleInProject: 'فحص الأداء وضمان الجودة',
      compensationType: 'fixed',
      compensationValue: 6000,
    },

    // Project 3 assignments
    {
      id: 'pa-7',
      projectId: 'p-3',
      teamMemberId: 't-1',
      roleInProject: 'كبير مهندسي النظام والربط الخلفي',
      compensationType: 'percentage',
      compensationValue: 15, // 15% of 260,000 = 39,000 SAR
    },
    {
      id: 'pa-8',
      projectId: 'p-3',
      teamMemberId: 't-5',
      roleInProject: 'البنية التحتية السحابية وقواعد البيانات',
      compensationType: 'fixed',
      compensationValue: 28000,
    },

    // Project 4 assignments (Completed)
    {
      id: 'pa-9',
      projectId: 'p-4',
      teamMemberId: 't-2',
      roleInProject: 'تصميم الرسوم البيانية والداشبورد',
      compensationType: 'fixed',
      compensationValue: 14000,
    },
    {
      id: 'pa-10',
      projectId: 'p-4',
      teamMemberId: 't-3',
      roleInProject: 'تطوير الشاشات التفاعلية',
      compensationType: 'fixed',
      compensationValue: 16000,
    },
  ],

  invoices: [
    // Project 1 Invoices
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      projectId: 'p-1',
      clientId: 'c-1',
      issueDate: '2026-01-20',
      dueDate: '2026-02-05',
      subtotal: 50000,
      taxRate: 15,
      taxAmount: 7500,
      totalAmount: 57500,
      notes: 'الدفعة الأولى التعاقدية (40% من قيمة المشروع) شاملة ضريبة القيمة المضافة.',
      createdAt: '2026-01-20T10:00:00Z',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-002',
      projectId: 'p-1',
      clientId: 'c-1',
      issueDate: '2026-03-01',
      dueDate: '2026-03-20',
      subtotal: 40000,
      taxRate: 15,
      taxAmount: 6000,
      totalAmount: 46000,
      notes: 'الدفعة الثانية عند اعتماد التصاميم والنسخة التجريبية.',
      createdAt: '2026-03-01T11:00:00Z',
    },

    // Project 2 Invoices
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-003',
      projectId: 'p-2',
      clientId: 'c-2',
      issueDate: '2026-02-05',
      dueDate: '2026-02-20',
      subtotal: 45000,
      taxRate: 15,
      taxAmount: 6750,
      totalAmount: 51750,
      notes: 'فاتورة الدفعة المقدمة لتطبيق التجزئة.',
      createdAt: '2026-02-05T09:00:00Z',
    },
    {
      id: 'inv-4',
      invoiceNumber: 'INV-2026-004',
      projectId: 'p-2',
      clientId: 'c-2',
      issueDate: '2026-03-15',
      dueDate: '2026-03-30',
      subtotal: 35000,
      taxRate: 15,
      taxAmount: 5250,
      totalAmount: 40250,
      notes: 'فاتورة إطلاق النسخة التجريبية وبوابات الدفع.',
      createdAt: '2026-03-15T12:00:00Z',
    },

    // Project 3 Invoices
    {
      id: 'inv-5',
      invoiceNumber: 'INV-2026-005',
      projectId: 'p-3',
      clientId: 'c-3',
      issueDate: '2026-02-20',
      dueDate: '2026-03-10',
      subtotal: 100000,
      taxRate: 15,
      taxAmount: 15000,
      totalAmount: 115000,
      notes: 'دفعة تدشين نظام ERP وبدء هندسة المتطلبات.',
      createdAt: '2026-02-20T10:00:00Z',
    },

    // Project 4 Invoices (Completed)
    {
      id: 'inv-6',
      invoiceNumber: 'INV-2026-006',
      projectId: 'p-4',
      clientId: 'c-4',
      issueDate: '2026-01-10',
      dueDate: '2026-01-25',
      subtotal: 40000,
      taxRate: 15,
      taxAmount: 6000,
      totalAmount: 46000,
      notes: 'دفعة مقدمة لمنصة التحليل المالي.',
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'inv-7',
      invoiceNumber: 'INV-2026-007',
      projectId: 'p-4',
      clientId: 'c-4',
      issueDate: '2026-03-05',
      dueDate: '2026-03-20',
      subtotal: 35000,
      taxRate: 15,
      taxAmount: 5250,
      totalAmount: 40250,
      notes: 'فاتورة التسليم النهائي والإغلاق للمشروع.',
      createdAt: '2026-03-05T14:00:00Z',
    },
  ],

  clientPayments: [
    // Project 1 Client Payments
    {
      id: 'cp-1',
      paymentNumber: 'PAY-C-2026-01',
      projectId: 'p-1',
      clientId: 'c-1',
      invoiceId: 'inv-1',
      amount: 57500,
      paymentDate: '2026-01-25',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-SNB-998811',
      notes: 'سداد كامل الفاتورة رقم INV-2026-001 عبر البنك الأهلي السعودي.',
      createdAt: '2026-01-25T14:30:00Z',
    },
    {
      id: 'cp-2',
      paymentNumber: 'PAY-C-2026-02',
      projectId: 'p-1',
      clientId: 'c-1',
      invoiceId: 'inv-2',
      amount: 25000,
      paymentDate: '2026-03-10',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-SNB-999402',
      notes: 'سداد جزئي للفاتورة رقم INV-2026-002 ومتبقي 21,000 ر.س.',
      createdAt: '2026-03-10T12:00:00Z',
    },

    // Project 2 Client Payments
    {
      id: 'cp-3',
      paymentNumber: 'PAY-C-2026-03',
      projectId: 'p-2',
      clientId: 'c-2',
      invoiceId: 'inv-3',
      amount: 51750,
      paymentDate: '2026-02-18',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-RAJ-554411',
      notes: 'سداد كامل الفاتورة رقم INV-2026-003 عبر مصرف الراجحي.',
      createdAt: '2026-02-18T10:15:00Z',
    },

    // Project 3 Client Payments
    {
      id: 'cp-4',
      paymentNumber: 'PAY-C-2026-04',
      projectId: 'p-3',
      clientId: 'c-3',
      invoiceId: 'inv-5',
      amount: 115000,
      paymentDate: '2026-03-02',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-RIY-112233',
      notes: 'سداد كامل الدفعة الأولى لنظام ERP عبر بنك الرياض.',
      createdAt: '2026-03-02T16:00:00Z',
    },

    // Project 4 Client Payments (Both paid in full)
    {
      id: 'cp-5',
      paymentNumber: 'PAY-C-2026-05',
      projectId: 'p-4',
      clientId: 'c-4',
      invoiceId: 'inv-6',
      amount: 46000,
      paymentDate: '2026-01-20',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-ALB-883344',
      notes: 'سداد الفاتورة الأولى عبر بنك البلاد.',
      createdAt: '2026-01-20T11:00:00Z',
    },
    {
      id: 'cp-6',
      paymentNumber: 'PAY-C-2026-06',
      projectId: 'p-4',
      clientId: 'c-4',
      invoiceId: 'inv-7',
      amount: 40250,
      paymentDate: '2026-03-12',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-ALB-884599',
      notes: 'سداد فاتورة الإغلاق بالكامل.',
      createdAt: '2026-03-12T13:45:00Z',
    },
  ],

  teamPayments: [
    // Project 1 Team Payments
    {
      id: 'tp-1',
      paymentNumber: 'PAY-T-2026-01',
      projectId: 'p-1',
      teamMemberId: 't-1',
      amount: 12000,
      paymentDate: '2026-01-30',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-01-01',
      notes: 'دفعة أولى من المستحقات (مستحق إجمالي: 23,400 ر.س).',
      createdAt: '2026-01-30T10:00:00Z',
    },
    {
      id: 'tp-2',
      paymentNumber: 'PAY-T-2026-02',
      projectId: 'p-1',
      teamMemberId: 't-2',
      amount: 8000,
      paymentDate: '2026-02-15',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-02-01',
      notes: 'دفعة إنجاز تصاميم الواجهات (مستحق إجمالي: 12,000 ر.س).',
      createdAt: '2026-02-15T11:00:00Z',
    },
    {
      id: 'tp-3',
      paymentNumber: 'PAY-T-2026-03',
      projectId: 'p-1',
      teamMemberId: 't-3',
      amount: 7000,
      paymentDate: '2026-02-28',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-02-02',
      notes: 'دفعة برمجة الشاشات الأولى.',
      createdAt: '2026-02-28T09:30:00Z',
    },

    // Project 2 Team Payments
    {
      id: 'tp-4',
      paymentNumber: 'PAY-T-2026-04',
      projectId: 'p-2',
      teamMemberId: 't-1',
      amount: 10000,
      paymentDate: '2026-02-25',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-02-03',
      notes: 'دفعة هندسة بوابات الدفع الإلكتروني.',
      createdAt: '2026-02-25T14:00:00Z',
    },
    {
      id: 'tp-5',
      paymentNumber: 'PAY-T-2026-05',
      projectId: 'p-2',
      teamMemberId: 't-3',
      amount: 9000,
      paymentDate: '2026-03-05',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-03-01',
      notes: 'دفعة مرحلية لتطبيق المتجر.',
      createdAt: '2026-03-05T12:00:00Z',
    },

    // Project 3 Team Payments
    {
      id: 'tp-6',
      paymentNumber: 'PAY-T-2026-06',
      projectId: 'p-3',
      teamMemberId: 't-1',
      amount: 18000,
      paymentDate: '2026-03-05',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-03-02',
      notes: 'دفعة هندسة وتأسيس قاعدة البيانات والخدمات السحابية.',
      createdAt: '2026-03-05T15:00:00Z',
    },
    {
      id: 'tp-7',
      paymentNumber: 'PAY-T-2026-07',
      projectId: 'p-3',
      teamMemberId: 't-5',
      amount: 14000,
      paymentDate: '2026-03-08',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-03-03',
      notes: 'الدفعة الأولى للبنية السحابية.',
      createdAt: '2026-03-08T16:20:00Z',
    },

    // Project 4 Team Payments (Completed - Fully paid to members)
    {
      id: 'tp-8',
      paymentNumber: 'PAY-T-2026-08',
      projectId: 'p-4',
      teamMemberId: 't-2',
      amount: 14000,
      paymentDate: '2026-03-15',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-03-04',
      notes: 'تسوية كامل مستحقات المشروع.',
      createdAt: '2026-03-15T11:00:00Z',
    },
    {
      id: 'tp-9',
      paymentNumber: 'PAY-T-2026-09',
      projectId: 'p-4',
      teamMemberId: 't-3',
      amount: 16000,
      paymentDate: '2026-03-15',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'SAL-03-05',
      notes: 'تسوية كامل مستحقات الواجهات الأمامية.',
      createdAt: '2026-03-15T11:30:00Z',
    },
  ],

  expenses: [
    // Project 1 Expenses
    {
      id: 'exp-1',
      expenseNumber: 'EXP-2026-01',
      projectId: 'p-1',
      category: 'software_servers',
      description: 'سيرفرات سحابية مخصصة للبيئة التجريبية والإنتاجية (AWS / STC Cloud)',
      vendor: 'STC Cloud Solutions',
      amount: 4200,
      expenseDate: '2026-01-20',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-AWS-902',
      createdAt: '2026-01-20T12:00:00Z',
    },
    {
      id: 'exp-2',
      expenseNumber: 'EXP-2026-02',
      projectId: 'p-1',
      category: 'licenses',
      description: 'اشتراك بوابات الخرائط والرسائل النصية SMS OTP',
      vendor: 'Unifonic & Mapbox',
      amount: 1850,
      expenseDate: '2026-02-10',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-UNI-112',
      createdAt: '2026-02-10T14:00:00Z',
    },

    // Project 2 Expenses
    {
      id: 'exp-3',
      expenseNumber: 'EXP-2026-03',
      projectId: 'p-2',
      category: 'software_servers',
      description: 'استضافة سحابية وتوزيع المحتوى CDN وموازنة الأحمال',
      vendor: 'Cloudflare Inc',
      amount: 2400,
      expenseDate: '2026-02-08',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-CF-445',
      createdAt: '2026-02-08T09:00:00Z',
    },
    {
      id: 'exp-4',
      expenseNumber: 'EXP-2026-04',
      projectId: 'p-2',
      category: 'licenses',
      description: 'تراخيص واجهات برمجة تطبيقات الربط مع سلة وزد',
      vendor: 'Saudi Gateway API',
      amount: 1600,
      expenseDate: '2026-02-22',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-SGA-771',
      createdAt: '2026-02-22T10:30:00Z',
    },

    // Project 3 Expenses
    {
      id: 'exp-5',
      expenseNumber: 'EXP-2026-05',
      projectId: 'p-3',
      category: 'software_servers',
      description: 'اشتراك خوادم تخزين وقواعد بيانات PostgreSQL موزعة عالية التوافر',
      vendor: 'Google Cloud Platform',
      amount: 8500,
      expenseDate: '2026-02-28',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-GCP-883',
      createdAt: '2026-02-28T16:00:00Z',
    },
    {
      id: 'exp-6',
      expenseNumber: 'EXP-2026-06',
      projectId: 'p-3',
      category: 'subcontractors',
      description: 'استشارات أمن معلومات وفحص اختراق خارجي معتمد',
      vendor: 'شركة درع الأمن السيبراني',
      amount: 12000,
      expenseDate: '2026-03-04',
      paymentMethod: 'bank_transfer',
      receiptReference: 'INV-CYBER-32',
      createdAt: '2026-03-04T11:45:00Z',
    },

    // Project 4 Expenses (Completed)
    {
      id: 'exp-7',
      expenseNumber: 'EXP-2026-07',
      projectId: 'p-4',
      category: 'licenses',
      description: 'تراخيص مكتبات الرسوم المالية المتقدمة Highcharts Enterprise',
      vendor: 'Highsoft AS',
      amount: 3200,
      expenseDate: '2026-01-12',
      paymentMethod: 'credit_card',
      receiptReference: 'REC-HC-90',
      createdAt: '2026-01-12T13:00:00Z',
    },
    {
      id: 'exp-8',
      expenseNumber: 'EXP-2026-08',
      projectId: 'p-4',
      category: 'travel_hospitality',
      description: 'مصاريف اجتماعات تسليم المشروع وورشة التدريب في مقر العميل',
      vendor: 'ضيافة وتنقلات',
      amount: 1500,
      expenseDate: '2026-03-08',
      paymentMethod: 'cash',
      receiptReference: 'REC-CSH-44',
      createdAt: '2026-03-08T15:00:00Z',
    },
  ],

  tasks: [
    // Project 1 Tasks (بوابة الخدمات الرقمية)
    {
      id: 'tsk-1-1',
      projectId: 'p-1',
      title: 'دراسة المتطلبات وتوثيق نطاق العمل',
      startDate: '2026-01-15',
      endDate: '2026-01-25',
      durationDays: 10,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-1',
      dependencies: [],
      notes: 'تم اعتماد الوثيقة الفنية من ممثل شركة الأفق',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'tsk-1-2',
      projectId: 'p-1',
      title: 'تصميم تجربة وواجهات المستخدم (UI/UX)',
      startDate: '2026-01-26',
      endDate: '2026-02-15',
      durationDays: 20,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-2',
      dependencies: ['tsk-1-1'],
      notes: 'تم تسليم نماذج Figma واعتمادها',
      createdAt: '2026-01-26T08:00:00Z',
    },
    {
      id: 'tsk-1-3',
      projectId: 'p-1',
      title: 'بناء الواجهات الخلفية وقواعد البيانات (Backend API)',
      startDate: '2026-02-10',
      endDate: '2026-03-05',
      durationDays: 23,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-1',
      dependencies: ['tsk-1-1'],
      notes: 'بناء خدمات الـ REST APIs وتوثيق Swagger',
      createdAt: '2026-02-10T08:00:00Z',
    },
    {
      id: 'tsk-1-4',
      projectId: 'p-1',
      title: 'تطوير الواجهات الأمامية والربط التفاعلي',
      startDate: '2026-02-20',
      endDate: '2026-03-25',
      durationDays: 33,
      progress: 85,
      status: 'in_progress',
      assignedMemberId: 't-3',
      dependencies: ['tsk-1-2', 'tsk-1-3'],
      notes: 'مرحلة الربط النهائي مع بوابة المستأجرين',
      createdAt: '2026-02-20T08:00:00Z',
    },
    {
      id: 'tsk-1-5',
      projectId: 'p-1',
      title: 'فحص الجودة واختبارات الأداء والأمان (QA)',
      startDate: '2026-03-20',
      endDate: '2026-04-10',
      durationDays: 21,
      progress: 35,
      status: 'in_progress',
      assignedMemberId: 't-4',
      dependencies: ['tsk-1-4'],
      notes: 'فحص حالات الضغط واختبار الثغرات الأمنية',
      createdAt: '2026-03-20T08:00:00Z',
    },
    {
      id: 'tsk-1-6',
      projectId: 'p-1',
      title: 'التدشين النهائي والنشر السحابي (Go-Live)',
      startDate: '2026-04-10',
      endDate: '2026-04-20',
      durationDays: 10,
      progress: 0,
      status: 'not_started',
      assignedMemberId: 't-1',
      dependencies: ['tsk-1-5'],
      isMilestone: true,
      notes: 'إطلاق المنصة رسمياً للجمهور',
      createdAt: '2026-04-10T08:00:00Z',
    },

    // Project 2 Tasks (تطبيق التجزئة والتجارة الإلكترونية)
    {
      id: 'tsk-2-1',
      projectId: 'p-2',
      title: 'تحليل بوابات الدفع الإلكتروني وبطاقات مدى',
      startDate: '2026-02-01',
      endDate: '2026-02-12',
      durationDays: 11,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-1',
      dependencies: [],
      createdAt: '2026-02-01T08:00:00Z',
    },
    {
      id: 'tsk-2-2',
      projectId: 'p-2',
      title: 'تصميم تجربة تطبيق الجوال وسلة الشراء',
      startDate: '2026-02-12',
      endDate: '2026-02-28',
      durationDays: 16,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-2',
      dependencies: ['tsk-2-1'],
      createdAt: '2026-02-12T08:00:00Z',
    },
    {
      id: 'tsk-2-3',
      projectId: 'p-2',
      title: 'برمجة شاشات التطبيق في React Native',
      startDate: '2026-02-25',
      endDate: '2026-03-18',
      durationDays: 21,
      progress: 60,
      status: 'delayed',
      assignedMemberId: 't-3',
      dependencies: ['tsk-2-2'],
      notes: 'تأخر في تسليم شاشات التتبع اللحظي للشحنات',
      createdAt: '2026-02-25T08:00:00Z',
    },
    {
      id: 'tsk-2-4',
      projectId: 'p-2',
      title: 'الربط مع بوابات الدفع و Apple Pay',
      startDate: '2026-03-15',
      endDate: '2026-04-05',
      durationDays: 21,
      progress: 20,
      status: 'in_progress',
      assignedMemberId: 't-1',
      dependencies: ['tsk-2-3'],
      createdAt: '2026-03-15T08:00:00Z',
    },
    {
      id: 'tsk-2-5',
      projectId: 'p-2',
      title: 'إطلاق التطبيق على App Store و Google Play',
      startDate: '2026-04-05',
      endDate: '2026-04-15',
      durationDays: 10,
      progress: 0,
      status: 'not_started',
      assignedMemberId: 't-4',
      dependencies: ['tsk-2-4'],
      isMilestone: true,
      createdAt: '2026-04-05T08:00:00Z',
    },

    // Project 3 Tasks (نظام ERP السحابي)
    {
      id: 'tsk-3-1',
      projectId: 'p-3',
      title: 'تأسيس البنية التحتية السحابية وقاعدة البيانات',
      startDate: '2026-02-15',
      endDate: '2026-03-05',
      durationDays: 18,
      progress: 100,
      status: 'completed',
      assignedMemberId: 't-5',
      dependencies: [],
      createdAt: '2026-02-15T08:00:00Z',
    },
    {
      id: 'tsk-3-2',
      projectId: 'p-3',
      title: 'تطوير وحدة إدارة المستودعات وسلاسل الإمداد',
      startDate: '2026-03-05',
      endDate: '2026-04-20',
      durationDays: 46,
      progress: 45,
      status: 'in_progress',
      assignedMemberId: 't-1',
      dependencies: ['tsk-3-1'],
      createdAt: '2026-03-05T08:00:00Z',
    },
    {
      id: 'tsk-3-3',
      projectId: 'p-3',
      title: 'برمجة نظام الفوترة والربط مع هيئة الزكاة (Fatoora)',
      startDate: '2026-04-15',
      endDate: '2026-05-30',
      durationDays: 45,
      progress: 0,
      status: 'not_started',
      assignedMemberId: 't-1',
      dependencies: ['tsk-3-2'],
      createdAt: '2026-04-15T08:00:00Z',
    },
    {
      id: 'tsk-3-4',
      projectId: 'p-3',
      title: 'التدريب الشامل وتسليم النظام لإدارة الروابي',
      startDate: '2026-06-01',
      endDate: '2026-06-25',
      durationDays: 24,
      progress: 0,
      status: 'not_started',
      assignedMemberId: 't-5',
      dependencies: ['tsk-3-3'],
      isMilestone: true,
      createdAt: '2026-06-01T08:00:00Z',
    },
  ],

  users: [
    {
      id: 'u-1',
      name: 'عبدالرحمن الشريف',
      email: 'a.alshareef@osboha-electric.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'u-2',
      name: 'م. فهد السبيعي',
      email: 'f.subaie@osboha-electric.com',
      role: 'project_manager',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      assignedProjectIds: ['p-1', 'p-2', 'p-3'],
      createdAt: '2026-01-05T08:00:00Z',
    },
    {
      id: 'u-3',
      name: 'عمر باوزير',
      email: 'o.bawazir@osboha-electric.com',
      role: 'team_member',
      teamMemberId: 't-3',
      assignedProjectIds: ['p-1', 'p-2', 'p-4'],
      createdAt: '2026-01-05T08:00:00Z',
    },
    {
      id: 'u-4',
      name: 'منى القاسم',
      email: 'm.alqasim@osboha-electric.com',
      role: 'accountant',
      createdAt: '2026-01-10T08:00:00Z',
    },
  ],
};

/**
 * Load Database from localStorage or fallback to Seed Data
 */
export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const parsed = JSON.parse(raw);
    // Ensure backwards compatibility with newly introduced tables
    if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      parsed.tasks = INITIAL_DATA.tasks;
    }
    if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = INITIAL_DATA.users;
    }
    if (parsed.projects && Array.isArray(parsed.projects)) {
      parsed.projects.forEach((p: Project) => {
        if (p.approvedBudget === undefined) {
          const initial = INITIAL_DATA.projects.find(ip => ip.id === p.id);
          p.approvedBudget = initial?.approvedBudget ?? (p.contractValue ? Math.round(p.contractValue * 0.15) : 0);
        }
      });
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load database from localStorage, resetting to initial seed:', err);
    saveDatabase(INITIAL_DATA);
    return INITIAL_DATA;
  }
}

/**
 * Save Database to localStorage
 */
export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
}

/**
 * Reset Database to Initial Seed
 */
export function resetDatabase(): AppDatabase {
  saveDatabase(INITIAL_DATA);
  return INITIAL_DATA;
}

// -------------------------------------------------------------
// RELATIONAL CALCULATION ENGINE
// Automatic live math for projects, invoices, team members & dashboard
// -------------------------------------------------------------

/**
 * Calculate financials for an individual project
 */
export function calculateProjectFinancials(projectId: string, db: AppDatabase): ProjectFinancials | null {
  const project = db.projects.find(p => p.id === projectId);
  if (!project) return null;

  const projectInvoices = db.invoices.filter(i => i.projectId === projectId);
  const projectClientPayments = db.clientPayments.filter(cp => cp.projectId === projectId);
  const projectAssignments = db.projectAssignments.filter(pa => pa.projectId === projectId);
  const projectTeamPayments = db.teamPayments.filter(tp => tp.projectId === projectId);
  const projectExpenses = db.expenses.filter(e => e.projectId === projectId);

  // 1. Total Invoiced = Sum of project invoices
  const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // 2. Total Collected = Sum of client payments
  const totalCollected = projectClientPayments.reduce((sum, cp) => sum + (cp.amount || 0), 0);

  // 3. Client Remaining = Total Invoiced - Total Collected
  // (In business terms, client balance due on issued invoices)
  const clientRemaining = Math.max(0, totalInvoiced - totalCollected);

  // 4. Calculate detailed invoices with their paid amount & status
  const calculatedInvoices: CalculatedInvoice[] = projectInvoices.map(inv => {
    // Payments linked to this invoice, or if no specific link, allocate proportionally
    const directPayments = projectClientPayments
      .filter(cp => cp.invoiceId === inv.id)
      .reduce((s, cp) => s + cp.amount, 0);

    const paidAmount = directPayments;
    const remainingAmount = Math.max(0, inv.totalAmount - paidAmount);

    let status: CalculatedInvoice['status'] = 'unpaid';
    if (paidAmount >= inv.totalAmount) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partially_paid';
    } else {
      // Check if overdue
      const isPastDue = new Date(inv.dueDate).getTime() < new Date().getTime();
      status = isPastDue ? 'overdue' : 'unpaid';
    }

    return {
      ...inv,
      paidAmount,
      remainingAmount,
      status,
    };
  });

  // 5. Team Entitlements & Team Payments
  let totalTeamEntitlements = 0;
  const teamMembers: CalculatedProjectTeamMember[] = projectAssignments.map(assignment => {
    const member = db.teamMembers.find(t => t.id === assignment.teamMemberId);
    let entitledAmount = 0;

    if (assignment.compensationType === 'percentage') {
      entitledAmount = (assignment.compensationValue / 100) * project.contractValue;
    } else {
      entitledAmount = assignment.compensationValue;
    }

    // Team payments for this member on this project
    const paidAmount = projectTeamPayments
      .filter(tp => tp.teamMemberId === assignment.teamMemberId)
      .reduce((s, tp) => s + tp.amount, 0);

    const remainingAmount = Math.max(0, entitledAmount - paidAmount);
    totalTeamEntitlements += entitledAmount;

    return {
      assignmentId: assignment.id,
      teamMemberId: assignment.teamMemberId,
      name: member?.name || 'عضو غير محدد',
      role: assignment.roleInProject || member?.role || 'عضو فريق',
      compensationType: assignment.compensationType,
      compensationValue: assignment.compensationValue,
      entitledAmount,
      paidAmount,
      remainingAmount,
    };
  });

  // 6. Total Paid to Team
  const totalTeamPaid = projectTeamPayments.reduce((sum, tp) => sum + (tp.amount || 0), 0);

  // 7. Team Remaining = Total Team Entitlements - Total Paid
  const teamRemaining = Math.max(0, totalTeamEntitlements - totalTeamPaid);

  // 8. Total Expenses & Budget Monitoring
  const totalExpenses = projectExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const approvedBudget = project.approvedBudget || 0;
  const budgetUsagePercent = approvedBudget > 0 ? (totalExpenses / approvedBudget) * 100 : 0;
  const budgetRemaining = approvedBudget > 0 ? approvedBudget - totalExpenses : 0;
  const isOverBudget = approvedBudget > 0 && totalExpenses > approvedBudget;

  // 9. Actual Realized Profit = Total Collected - Team Paid - Expenses
  // (الربح الفعلي = إجمالي التحصيل - المدفوع للفريق - المصروفات)
  const actualProfit = totalCollected - totalTeamPaid - totalExpenses;

  // 10. Expected Projected Profit = Contract Value - Team Entitlements - Expenses
  // (الربح المتوقع = قيمة المشروع - مستحقات الفريق - المصروفات)
  const expectedProfit = project.contractValue - totalTeamEntitlements - totalExpenses;

  // Profit Margins
  const actualProfitMargin = totalCollected > 0 ? (actualProfit / totalCollected) * 100 : 0;
  const expectedProfitMargin = project.contractValue > 0 ? (expectedProfit / project.contractValue) * 100 : 0;

  return {
    projectId: project.id,
    currency: project.currency || 'SAR',
    contractValue: project.contractValue,
    totalInvoiced,
    totalCollected,
    clientRemaining,
    totalTeamEntitlements,
    totalTeamPaid,
    teamRemaining,
    totalExpenses,
    approvedBudget,
    budgetUsagePercent,
    budgetRemaining,
    isOverBudget,
    actualProfit,
    expectedProfit,
    actualProfitMargin,
    expectedProfitMargin,
    teamMembers,
    invoices: calculatedInvoices,
    clientPayments: projectClientPayments,
    teamPayments: projectTeamPayments,
    expenses: projectExpenses,
  };
}

/**
 * Calculate Global / Filtered Financials across all projects, unified in the selected report currency
 */
export function calculateOverallFinancials(
  db: AppDatabase,
  filters?: DashboardFilters,
  reportCurrency: Currency = 'SAR',
  exchangeRateSARtoEGP: number = DEFAULT_EXCHANGE_RATE_SAR_TO_EGP
): OverallFinancials {
  let filteredProjects = [...db.projects];

  if (filters?.projectId && filters.projectId !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.id === filters.projectId);
  }

  if (filters?.clientId && filters.clientId !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.clientId === filters.clientId);
  }

  if (filters?.status && filters.status !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.status === filters.status);
  }

  if (filters?.dateFrom) {
    const fromTime = new Date(filters.dateFrom).getTime();
    filteredProjects = filteredProjects.filter(p => new Date(p.startDate).getTime() >= fromTime);
  }

  if (filters?.dateTo) {
    const toTime = new Date(filters.dateTo).getTime();
    filteredProjects = filteredProjects.filter(p => new Date(p.startDate).getTime() <= toTime);
  }

  let totalContractValue = 0;
  let totalInvoiced = 0;
  let totalCollected = 0;
  let totalClientRemaining = 0;
  let totalTeamEntitlements = 0;
  let totalTeamPaid = 0;
  let totalTeamRemaining = 0;
  let totalExpenses = 0;
  let totalActualProfit = 0;
  let totalExpectedProfit = 0;

  filteredProjects.forEach(proj => {
    const fin = calculateProjectFinancials(proj.id, db);
    if (fin) {
      const fromCurr = fin.currency;
      totalContractValue += convertCurrency(fin.contractValue, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalInvoiced += convertCurrency(fin.totalInvoiced, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalCollected += convertCurrency(fin.totalCollected, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalClientRemaining += convertCurrency(fin.clientRemaining, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalTeamEntitlements += convertCurrency(fin.totalTeamEntitlements, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalTeamPaid += convertCurrency(fin.totalTeamPaid, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalTeamRemaining += convertCurrency(fin.teamRemaining, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalExpenses += convertCurrency(fin.totalExpenses, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalActualProfit += convertCurrency(fin.actualProfit, fromCurr, reportCurrency, exchangeRateSARtoEGP);
      totalExpectedProfit += convertCurrency(fin.expectedProfit, fromCurr, reportCurrency, exchangeRateSARtoEGP);
    }
  });

  const actualProfitMargin = totalCollected > 0 ? (totalActualProfit / totalCollected) * 100 : 0;
  const expectedProfitMargin = totalContractValue > 0 ? (totalExpectedProfit / totalContractValue) * 100 : 0;

  return {
    currency: reportCurrency,
    totalProjectsCount: filteredProjects.length,
    totalContractValue,
    totalInvoiced,
    totalCollected,
    totalClientRemaining,
    totalTeamEntitlements,
    totalTeamPaid,
    totalTeamRemaining,
    totalExpenses,
    totalActualProfit,
    totalExpectedProfit,
    actualProfitMargin,
    expectedProfitMargin,
  };
}
