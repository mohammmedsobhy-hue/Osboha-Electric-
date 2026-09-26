/**
 * Data Models and Types for Rakaiz Project & Financial Management Platform
 */

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export type Currency = 'SAR' | 'EGP';

export type CompensationType = 'percentage' | 'fixed';

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export type ClientPaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'mada' | 'sadad';

export type TeamPaymentMethod = 'bank_transfer' | 'cash' | 'check';

export type ExpensePaymentMethod = 'bank_transfer' | 'credit_card' | 'cash' | 'check';

export type ExpenseCategory =
  | 'software_servers'
  | 'licenses'
  | 'subcontractors'
  | 'marketing'
  | 'hardware'
  | 'travel_hospitality'
  | 'other';

export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  vatNumber?: string;
  address?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string; // e.g. "مهندس برمجيات أول", "مصمم واجهات UX/UI"
  email: string;
  phone: string;
  iban?: string;
  createdAt: string;
}

export interface ProjectTeamAssignment {
  id: string;
  projectId: string;
  teamMemberId: string;
  roleInProject: string;
  compensationType: CompensationType;
  compensationValue: number; // e.g. 15 for 15%, or 15000 for 15,000 SAR
}

export interface Project {
  id: string;
  code: string; // e.g. "PRJ-2026-001"
  name: string;
  clientId: string;
  contractValue: number; // قيمة المشروع الإجمالية
  approvedBudget?: number; // الميزانية المعتمدة للمشروع (سقف المصروفات)
  currency: Currency; // 'SAR' | 'EGP'
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  description?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-014"
  projectId: string;
  clientId: string;
  currency?: Currency;
  issueDate: string;
  dueDate: string;
  items?: InvoiceItem[];
  subtotal: number; // المبلغ قبل الضريبة
  taxRate: number; // e.g. 15 for 15% VAT
  taxAmount: number; // قيمة ضريبة القيمة المضافة
  totalAmount: number; // المبلغ الإجمالي شامل الضريبة
  notes?: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  paymentNumber: string; // e.g. "PAY-C-2026-08"
  projectId: string;
  clientId: string;
  currency?: Currency;
  invoiceId?: string; // Optional link to specific invoice
  amount: number;
  paymentDate: string;
  paymentMethod: ClientPaymentMethod;
  referenceNumber: string; // رقم التحويل أو الشيك
  notes?: string;
  createdAt: string;
}

export interface TeamPayment {
  id: string;
  paymentNumber: string; // e.g. "PAY-T-2026-12"
  projectId: string;
  teamMemberId: string;
  currency?: Currency;
  amount: number;
  paymentDate: string;
  paymentMethod: TeamPaymentMethod;
  referenceNumber: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectExpense {
  id: string;
  expenseNumber: string; // e.g. "EXP-2026-035"
  projectId: string;
  currency?: Currency;
  category: ExpenseCategory;
  description: string;
  vendor: string; // المورد أو الجهة
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  receiptReference?: string;
  createdAt: string;
}

// Calculated details for a team member within a project
export interface CalculatedProjectTeamMember {
  assignmentId: string;
  teamMemberId: string;
  name: string;
  role: string;
  compensationType: CompensationType;
  compensationValue: number;
  entitledAmount: number; // Calculated: % * contractValue or fixed
  paidAmount: number; // Sum of TeamPayment for this member in this project
  remainingAmount: number; // entitledAmount - paidAmount
}

// Calculated details for an invoice
export interface CalculatedInvoice extends Invoice {
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
}

// Fully calculated project metrics
export interface ProjectFinancials {
  projectId: string;
  currency: Currency;
  contractValue: number;
  totalInvoiced: number; // إجمالي الفواتير
  totalCollected: number; // إجمالي التحصيل من العميل
  clientRemaining: number; // المتبقي على العميل (إجمالي الفواتير - إجمالي التحصيل)
  totalTeamEntitlements: number; // إجمالي مستحقات الفريق
  totalTeamPaid: number; // إجمالي المدفوع للفريق
  teamRemaining: number; // المتبقي للفريق
  totalExpenses: number; // إجمالي المصروفات
  approvedBudget: number; // الميزانية المعتمدة للمشروع
  budgetUsagePercent: number; // نسبة استهلاك الميزانية بالمصروفات الحالية %
  budgetRemaining: number; // المتبقي من الميزانية المعتمدة
  isOverBudget: boolean; // هل تم تجاوز الميزانية المعتمدة
  actualProfit: number; // الربح الفعلي = إجمالي التحصيل - المدفوع للفريق - المصروفات
  expectedProfit: number; // الربح المتوقع = قيمة المشروع - مستحقات الفريق - المصروفات
  actualProfitMargin: number; // هامش الربح الفعلي %
  expectedProfitMargin: number; // هامش الربح المتوقع %
  teamMembers: CalculatedProjectTeamMember[];
  invoices: CalculatedInvoice[];
  clientPayments: ClientPayment[];
  teamPayments: TeamPayment[];
  expenses: ProjectExpense[];
}

// Overall system-wide or filtered financials
export interface OverallFinancials {
  currency: Currency;
  totalProjectsCount: number;
  totalContractValue: number;
  totalInvoiced: number;
  totalCollected: number;
  totalClientRemaining: number;
  totalTeamEntitlements: number;
  totalTeamPaid: number;
  totalTeamRemaining: number;
  totalExpenses: number;
  totalActualProfit: number;
  totalExpectedProfit: number;
  actualProfitMargin: number;
  expectedProfitMargin: number;
}

// Dashboard Filters
export interface DashboardFilters {
  projectId?: string;
  clientId?: string;
  status?: ProjectStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// Task Status
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  progress: number; // 0 - 100
  status: TaskStatus;
  assignedMemberId?: string;
  dependencies: string[]; // task IDs that must finish before this task starts
  isMilestone?: boolean;
  notes?: string;
  createdAt: string;
}

export interface CalculatedTask extends ProjectTask {
  earlyStart: number; // in relative days or timestamp
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number; // lateStart - earlyStart (0 = on Critical Path)
  isCritical: boolean;
  isDelayed: boolean;
  daysDelayed: number;
}

// User Roles & Permissions (RBAC)
export type UserRole = 'admin' | 'project_manager' | 'accountant' | 'team_member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  teamMemberId?: string; // links to teamMember entity if role === 'team_member'
  assignedProjectIds?: string[];
  createdAt: string;
}

export interface RolePermissions {
  canManageProjects: boolean;
  canViewFinancials: boolean; // P&L and net profit
  canManageInvoices: boolean;
  canManagePayments: boolean; // client & team payments
  canManageExpenses: boolean;
  canManageTeam: boolean;
  canManageClients: boolean;
  canViewReports: boolean;
  canManageGantt: boolean;
  canManageUsers: boolean;
}

export const ROLE_DEFINITIONS: Record<
  UserRole,
  {
    label: string;
    description: string;
    badgeClass: string;
    permissions: RolePermissions;
  }
> = {
  admin: {
    label: 'مدير النظام (Administrator)',
    description: 'صلاحيات كاملة وغير مقيدة لإدارة المشاريع، المالية، العقود، التقارير، والمستخدمين',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: {
      canManageProjects: true,
      canViewFinancials: true,
      canManageInvoices: true,
      canManagePayments: true,
      canManageExpenses: true,
      canManageTeam: true,
      canManageClients: true,
      canViewReports: true,
      canManageGantt: true,
      canManageUsers: true,
    },
  },
  project_manager: {
    label: 'مدير مشاريع (Project Manager)',
    description: 'إدارة وتخطيط المشاريع، مخطط جانت والمسار الحرج، متابعة المهام وتكليف الفريق',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: {
      canManageProjects: true,
      canViewFinancials: true,
      canManageInvoices: false,
      canManagePayments: false,
      canManageExpenses: true,
      canManageTeam: true,
      canManageClients: true,
      canViewReports: true,
      canManageGantt: true,
      canManageUsers: false,
    },
  },
  accountant: {
    label: 'محاسب مالي (Accountant)',
    description: 'صلاحيات كاملة للمالية: الفواتير، التحصيلات، دفعات الفريق، المصروفات، والتقارير المحاسبية',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    permissions: {
      canManageProjects: false,
      canViewFinancials: true,
      canManageInvoices: true,
      canManagePayments: true,
      canManageExpenses: true,
      canManageTeam: false,
      canManageClients: true,
      canViewReports: true,
      canManageGantt: false,
      canManageUsers: false,
    },
  },
  team_member: {
    label: 'عضو فريق (Team Member)',
    description: 'الاطلاع على مشاريعه المسندة، مهامه في مخطط جانت، ومستحقاته المالية الشخصية فقط',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    permissions: {
      canManageProjects: false,
      canViewFinancials: false,
      canManageInvoices: false,
      canManagePayments: false,
      canManageExpenses: false,
      canManageTeam: false,
      canManageClients: false,
      canViewReports: false,
      canManageGantt: true,
      canManageUsers: false,
    },
  },
};

export type ActiveTab =
  | 'dashboard'
  | 'projects'
  | 'gantt'
  | 'clients'
  | 'team'
  | 'invoices'
  | 'client-payments'
  | 'team-payments'
  | 'expenses'
  | 'reports'
  | 'users';

