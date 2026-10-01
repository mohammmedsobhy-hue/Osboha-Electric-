/**
 * Global Application Context & Reactive State Provider
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  ActiveTab,
  Client,
  TeamMember,
  Project,
  ProjectStatus,
  ProjectTeamAssignment,
  Invoice,
  ClientPayment,
  TeamPayment,
  ProjectExpense,
  ProjectFinancials,
  OverallFinancials,
  DashboardFilters,
  ProjectTask,
  TaskStatus,
  ProjectAttachment,
  User,
  UserRole,
  RolePermissions,
  ROLE_DEFINITIONS,
  Currency,
} from '../types';
import {
  DEFAULT_EXCHANGE_RATE_SAR_TO_EGP,
  CURRENCY_INFO,
  PROJECT_STATUS_MAP,
} from '../utils/formatters';
import {
  AppDatabase,
  loadDatabase,
  saveDatabase,
  resetDatabase,
  calculateProjectFinancials,
  calculateOverallFinancials,
} from '../services/storage';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  db: AppDatabase;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  overallFinancials: OverallFinancials;
  getProjectFinancials: (projectId: string) => ProjectFinancials | null;
  allProjectFinancials: Map<string, ProjectFinancials>;
  toast: ToastNotification | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Multi-currency & Exchange Rate
  reportCurrency: Currency;
  setReportCurrency: (currency: Currency) => void;
  exchangeRateSARtoEGP: number;
  setExchangeRateSARtoEGP: (rate: number) => void;

  // RBAC User & Roles
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  userPermissions: RolePermissions;

  // Tasks / Gantt Actions
  addTask: (task: Omit<ProjectTask, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<ProjectTask>) => void;
  deleteTask: (id: string) => void;
  updateTaskProgress: (id: string, progress: number, status?: TaskStatus) => void;

  // User Actions
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => string;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Project Attachments & Documents
  addProjectAttachment: (attachment: Omit<ProjectAttachment, 'id' | 'uploadedAt'>) => string;
  updateProjectAttachment: (id: string, updates: Partial<ProjectAttachment>) => void;
  deleteProjectAttachment: (id: string) => void;

  // Project Actions
  addProject: (
    project: Omit<Project, 'id' | 'createdAt'>,
    assignments?: Omit<ProjectTeamAssignment, 'id' | 'projectId'>[]
  ) => string;
  updateProject: (
    id: string,
    updates: Partial<Project>,
    assignments?: Omit<ProjectTeamAssignment, 'id' | 'projectId'>[]
  ) => void;
  updateProjectStatus: (id: string, newStatus: ProjectStatus, note?: string) => void;
  deleteProject: (id: string) => void;

  // Client Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => string;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Team Member Actions
  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => string;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;

  // Invoice Actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => string;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Client Payment Actions
  addClientPayment: (payment: Omit<ClientPayment, 'id' | 'createdAt'>) => string;
  updateClientPayment: (id: string, updates: Partial<ClientPayment>) => void;
  deleteClientPayment: (id: string) => void;

  // Team Payment Actions
  addTeamPayment: (payment: Omit<TeamPayment, 'id' | 'createdAt'>) => string;
  updateTeamPayment: (id: string, updates: Partial<TeamPayment>) => void;
  deleteTeamPayment: (id: string) => void;

  // Expense Actions
  addExpense: (expense: Omit<ProjectExpense, 'id' | 'createdAt'>) => string;
  updateExpense: (id: string, updates: Partial<ProjectExpense>) => void;
  deleteExpense: (id: string) => void;

  // Data management
  resetToSampleData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonString: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_FILTERS: DashboardFilters = {
  projectId: 'all',
  clientId: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  searchQuery: '',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Active current user state (defaults to Admin user u-1)
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return db.users?.[0]?.id || 'u-1';
  });

  const currentUser = useMemo(() => {
    return db.users.find(u => u.id === currentUserId) || db.users[0];
  }, [db.users, currentUserId]);

  const userPermissions = useMemo(() => {
    return ROLE_DEFINITIONS[currentUser?.role || 'admin'].permissions;
  }, [currentUser]);

  const switchRole = (role: UserRole) => {
    const match = db.users.find(u => u.role === role);
    if (match) {
      setCurrentUserId(match.id);
      showToast(`تم التبديل إلى دور: ${ROLE_DEFINITIONS[role].label}`, 'info');
    }
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
    showToast(`تم تسجيل الدخول بحساب: ${user.name}`, 'info');
  };

  // Sync to localStorage on every db update
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 4000);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const [reportCurrency, setReportCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('rakaiz_report_currency');
    return (saved === 'SAR' || saved === 'EGP') ? saved : 'SAR';
  });

  const [exchangeRateSARtoEGP, setExchangeRateSARtoEGPState] = useState<number>(() => {
    const saved = localStorage.getItem('rakaiz_exchange_rate');
    const num = saved ? Number(saved) : DEFAULT_EXCHANGE_RATE_SAR_TO_EGP;
    return num > 0 ? num : DEFAULT_EXCHANGE_RATE_SAR_TO_EGP;
  });

  const setReportCurrency = (curr: Currency) => {
    setReportCurrencyState(curr);
    localStorage.setItem('rakaiz_report_currency', curr);
    showToast(`تم تعيين عملة التقارير إلى: ${curr === 'SAR' ? 'الريال السعودي (SAR)' : 'الجنيه المصري (EGP)'}`, 'info');
  };

  const setExchangeRateSARtoEGP = (rate: number) => {
    const safeRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE_SAR_TO_EGP;
    setExchangeRateSARtoEGPState(safeRate);
    localStorage.setItem('rakaiz_exchange_rate', safeRate.toString());
    showToast(`تم تحديث سعر الصرف: 1 ر.س = ${safeRate.toFixed(2)} ج.م`, 'info');
  };

  // Helper map for all project financials
  const allProjectFinancials = useMemo(() => {
    const map = new Map<string, ProjectFinancials>();
    db.projects.forEach(p => {
      const fin = calculateProjectFinancials(p.id, db);
      if (fin) map.set(p.id, fin);
    });
    return map;
  }, [db]);

  const getProjectFinancials = (projectId: string) => {
    return allProjectFinancials.get(projectId) || calculateProjectFinancials(projectId, db);
  };

  // Overall financials calculated live with filters and unified report currency
  const overallFinancials = useMemo(() => {
    return calculateOverallFinancials(db, filters, reportCurrency, exchangeRateSARtoEGP);
  }, [db, filters, reportCurrency, exchangeRateSARtoEGP]);

  // ---------------- PROJECT ACTIONS ----------------
  const addProject = (
    projectData: Omit<Project, 'id' | 'createdAt'>,
    assignments?: Omit<ProjectTeamAssignment, 'id' | 'projectId'>[]
  ) => {
    const id = `p-${Date.now().toString(36)}`;
    const newProject: Project = {
      ...projectData,
      currency: projectData.currency || 'SAR',
      id,
      createdAt: new Date().toISOString(),
    };

    const newAssignments: ProjectTeamAssignment[] = (assignments || []).map((a, idx) => ({
      ...a,
      id: `pa-${id}-${idx}-${Date.now().toString(36)}`,
      projectId: id,
    }));

    setDb(prev => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      projectAssignments: [...prev.projectAssignments, ...newAssignments],
    }));

    showToast(`تم إنشاء المشروع "${newProject.name}" بنجاح.`);
    return id;
  };

  const updateProject = (
    id: string,
    updates: Partial<Project>,
    assignments?: Omit<ProjectTeamAssignment, 'id' | 'projectId'>[]
  ) => {
    setDb(prev => {
      const updatedProjects = prev.projects.map(p => (p.id === id ? { ...p, ...updates } : p));
      let updatedAssignments = prev.projectAssignments;

      if (assignments !== undefined) {
        // Remove existing assignments for this project and insert new ones
        const kept = prev.projectAssignments.filter(pa => pa.projectId !== id);
        const fresh: ProjectTeamAssignment[] = assignments.map((a, idx) => ({
          ...a,
          id: `pa-${id}-${idx}-${Date.now().toString(36)}`,
          projectId: id,
        }));
        updatedAssignments = [...kept, ...fresh];
      }

      return {
        ...prev,
        projects: updatedProjects,
        projectAssignments: updatedAssignments,
      };
    });

    showToast('تم تحديث بيانات المشروع والمستحقات.');
  };

  const updateProjectStatus = (id: string, newStatus: ProjectStatus, note?: string) => {
    let projName = '';
    setDb(prev => {
      const target = prev.projects.find(p => p.id === id);
      if (target) projName = target.name;
      return {
        ...prev,
        projects: prev.projects.map(p => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: newStatus,
            statusUpdatedAt: new Date().toISOString(),
            statusNote: note !== undefined ? note : p.statusNote,
          };
        }),
      };
    });
    const statusLabel = PROJECT_STATUS_MAP[newStatus]?.label || newStatus;
    showToast(`تم تحديث حالة المشروع "${projName || id}" إلى: ${statusLabel}`);
  };

  const deleteProject = (id: string) => {
    setDb(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      projectAssignments: prev.projectAssignments.filter(pa => pa.projectId !== id),
      invoices: prev.invoices.filter(i => i.projectId !== id),
      clientPayments: prev.clientPayments.filter(cp => cp.projectId !== id),
      teamPayments: prev.teamPayments.filter(tp => tp.projectId !== id),
      expenses: prev.expenses.filter(e => e.projectId !== id),
    }));
    if (selectedProjectId === id) setSelectedProjectId(null);
    showToast('تم حذف المشروع وجميع عملياته المرتبطة.');
  };

  // ---------------- CLIENT ACTIONS ----------------
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const id = `c-${Date.now().toString(36)}`;
    const newClient: Client = {
      ...clientData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));
    showToast(`تمت إضافة العميل "${newClient.name}".`);
    return id;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setDb(prev => ({
      ...prev,
      clients: prev.clients.map(c => (c.id === id ? { ...c, ...updates } : c)),
    }));
    showToast('تم تحديث بيانات العميل.');
  };

  const deleteClient = (id: string) => {
    const hasProjects = db.projects.some(p => p.clientId === id);
    if (hasProjects) {
      showToast('لا يمكن حذف العميل لأنه مرتبط بمشاريع قائمة.', 'error');
      return;
    }
    setDb(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
    }));
    showToast('تم حذف العميل.');
  };

  // ---------------- TEAM MEMBER ACTIONS ----------------
  const addTeamMember = (memberData: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const id = `t-${Date.now().toString(36)}`;
    const newMember: TeamMember = {
      ...memberData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, teamMembers: [newMember, ...prev.teamMembers] }));
    showToast(`تمت إضافة العضو "${newMember.name}" إلى الفريق.`);
    return id;
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setDb(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(m => (m.id === id ? { ...m, ...updates } : m)),
    }));
    showToast('تم تحديث بيانات عضو الفريق.');
  };

  const deleteTeamMember = (id: string) => {
    const isAssigned = db.projectAssignments.some(pa => pa.teamMemberId === id);
    if (isAssigned) {
      showToast('لا يمكن حذف العضو لوجود مستحقات أو مشاريع مسندة له.', 'error');
      return;
    }
    setDb(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id),
    }));
    showToast('تم حذف عضو الفريق.');
  };

  // ---------------- INVOICE ACTIONS ----------------
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const id = `inv-${Date.now().toString(36)}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, invoices: [newInvoice, ...prev.invoices] }));
    showToast(`تم إصدار الفاتورة رقم ${newInvoice.invoiceNumber}.`);
    return id;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setDb(prev => ({
      ...prev,
      invoices: prev.invoices.map(i => (i.id === id ? { ...i, ...updates } : i)),
    }));
    showToast('تم تحديث بيانات الفاتورة.');
  };

  const deleteInvoice = (id: string) => {
    setDb(prev => ({
      ...prev,
      invoices: prev.invoices.filter(i => i.id !== id),
      // Also unbind any client payments bound directly to this invoice
      clientPayments: prev.clientPayments.map(cp => (cp.invoiceId === id ? { ...cp, invoiceId: undefined } : cp)),
    }));
    showToast('تم حذف الفاتورة.');
  };

  // ---------------- CLIENT PAYMENT ACTIONS ----------------
  const addClientPayment = (paymentData: Omit<ClientPayment, 'id' | 'createdAt'>) => {
    const id = `cp-${Date.now().toString(36)}`;
    const newPayment: ClientPayment = {
      ...paymentData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, clientPayments: [newPayment, ...prev.clientPayments] }));
    const currSymbol = CURRENCY_INFO[paymentData.currency || 'SAR']?.symbol || paymentData.currency || 'ر.س';
    showToast(`تم تسجيل دفعة العميل بمبلغ ${paymentData.amount.toLocaleString()} ${currSymbol}.`);
    return id;
  };

  const updateClientPayment = (id: string, updates: Partial<ClientPayment>) => {
    setDb(prev => ({
      ...prev,
      clientPayments: prev.clientPayments.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
    showToast('تم تحديث بيانات دفعة العميل.');
  };

  const deleteClientPayment = (id: string) => {
    setDb(prev => ({
      ...prev,
      clientPayments: prev.clientPayments.filter(p => p.id !== id),
    }));
    showToast('تم حذف دفعة العميل.');
  };

  // ---------------- TEAM PAYMENT ACTIONS ----------------
  const addTeamPayment = (paymentData: Omit<TeamPayment, 'id' | 'createdAt'>) => {
    const id = `tp-${Date.now().toString(36)}`;
    const newPayment: TeamPayment = {
      ...paymentData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, teamPayments: [newPayment, ...prev.teamPayments] }));
    const currSymbol = CURRENCY_INFO[paymentData.currency || 'SAR']?.symbol || paymentData.currency || 'ر.س';
    showToast(`تم صرف دفعة للفريق بمبلغ ${paymentData.amount.toLocaleString()} ${currSymbol}.`);
    return id;
  };

  const updateTeamPayment = (id: string, updates: Partial<TeamPayment>) => {
    setDb(prev => ({
      ...prev,
      teamPayments: prev.teamPayments.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
    showToast('تم تحديث بيانات صرف دفعة الفريق.');
  };

  const deleteTeamPayment = (id: string) => {
    setDb(prev => ({
      ...prev,
      teamPayments: prev.teamPayments.filter(p => p.id !== id),
    }));
    showToast('تم حذف دفعة الفريق.');
  };

  // ---------------- EXPENSE ACTIONS ----------------
  const addExpense = (expenseData: Omit<ProjectExpense, 'id' | 'createdAt'>) => {
    const id = `exp-${Date.now().toString(36)}`;
    const newExpense: ProjectExpense = {
      ...expenseData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
    const expSymbol = CURRENCY_INFO[expenseData.currency || 'SAR']?.symbol || expenseData.currency || 'ر.س';
    showToast(`تم تسجيل المصروف بقيمة ${expenseData.amount.toLocaleString()} ${expSymbol}.`);
    return id;
  };

  const updateExpense = (id: string, updates: Partial<ProjectExpense>) => {
    setDb(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => (e.id === id ? { ...e, ...updates } : e)),
    }));
    showToast('تم تحديث بيانات المصروف.');
  };

  const deleteExpense = (id: string) => {
    setDb(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
    }));
    showToast('تم حذف المصروف.');
  };

  // ---------------- TASK & GANTT ACTIONS ----------------
  const addTask = (taskData: Omit<ProjectTask, 'id' | 'createdAt'>) => {
    const id = `tsk-${Date.now().toString(36)}`;
    const newTask: ProjectTask = {
      ...taskData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask],
    }));
    showToast(`تمت إضافة المهمة "${newTask.title}" إلى المخطط.`);
    return id;
  };

  const updateTask = (id: string, updates: Partial<ProjectTask>) => {
    setDb(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
    showToast('تم تحديث بيانات المهمة في مخطط جانت.');
  };

  const deleteTask = (id: string) => {
    setDb(prev => ({
      ...prev,
      tasks: (prev.tasks || [])
        .filter(t => t.id !== id)
        .map(t => ({
          ...t,
          dependencies: (t.dependencies || []).filter(depId => depId !== id),
        })),
    }));
    showToast('تم حذف المهمة وإعادة احتساب المسار الحرج.');
  };

  const updateTaskProgress = (id: string, progress: number, status?: TaskStatus) => {
    setDb(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => {
        if (t.id !== id) return t;
        const newProgress = Math.max(0, Math.min(100, progress));
        let computedStatus = status || t.status;
        if (!status) {
          if (newProgress === 100) computedStatus = 'completed';
          else if (newProgress > 0) computedStatus = 'in_progress';
          else computedStatus = 'pending';
        }
        return {
          ...t,
          progress: newProgress,
          status: computedStatus,
        };
      }),
    }));
  };

  // ---------------- USER & ROLES ACTIONS ----------------
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const id = `u-${Date.now().toString(36)}`;
    const newUser: User = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    setDb(prev => ({
      ...prev,
      users: [...(prev.users || []), newUser],
    }));
    showToast(`تم إنشاء حساب المستخدم "${newUser.name}".`);
    return id;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setDb(prev => ({
      ...prev,
      users: (prev.users || []).map(u => (u.id === id ? { ...u, ...updates } : u)),
    }));
    showToast('تم تحديث بيانات المستخدم وصلاحياته.');
  };

  const deleteUser = (id: string) => {
    if (id === currentUserId) {
      showToast('لا يمكن حذف المستخدم النشط حالياً.', 'error');
      return;
    }
    setDb(prev => ({
      ...prev,
      users: (prev.users || []).filter(u => u.id !== id),
    }));
    showToast('تم حذف حساب المستخدم.');
  };

  // ---------------- PROJECT ATTACHMENTS & DOCUMENTS ACTIONS ----------------
  const addProjectAttachment = (attData: Omit<ProjectAttachment, 'id' | 'uploadedAt'>) => {
    const id = `att-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newAtt: ProjectAttachment = {
      ...attData,
      id,
      uploadedAt: new Date().toISOString(),
    };
    setDb(prev => ({
      ...prev,
      attachments: [newAtt, ...(prev.attachments || [])],
    }));
    showToast(`تم رفع وإضافة المرفق "${newAtt.name}" بنجاح.`);
    return id;
  };

  const updateProjectAttachment = (id: string, updates: Partial<ProjectAttachment>) => {
    setDb(prev => ({
      ...prev,
      attachments: (prev.attachments || []).map(a => (a.id === id ? { ...a, ...updates } : a)),
    }));
    showToast('تم تحديث بيانات المرفق بنجاح.');
  };

  const deleteProjectAttachment = (id: string) => {
    setDb(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id),
    }));
    showToast('تم حذف المرفق من المشروع.');
  };

  // ---------------- BACKUP & SAMPLE DATA ----------------
  const resetToSampleData = () => {
    const initial = resetDatabase();
    setDb(initial);
    setSelectedProjectId(null);
    resetFilters();
    showToast('تمت استعادة البيانات التجريبية الافتراضية بنجاح.');
  };

  const exportDatabaseJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `osboha_financial_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('تم تصدير نسخة احتياطية من قاعدة البيانات.');
  };

  const importDatabaseJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as AppDatabase;
      if (
        !parsed.projects ||
        !parsed.clients ||
        !parsed.invoices ||
        !parsed.clientPayments ||
        !parsed.teamPayments ||
        !parsed.expenses
      ) {
        showToast('ملف غير صالح، تنقصه الحقول الأساسية.', 'error');
        return false;
      }
      setDb(parsed);
      saveDatabase(parsed);
      showToast('تم استيراد قاعدة البيانات بنجاح.');
      return true;
    } catch {
      showToast('فشل قراءة ملف النسخة الاحتياطية.', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        db,
        activeTab,
        setActiveTab,
        selectedProjectId,
        setSelectedProjectId,
        filters,
        setFilters,
        resetFilters,
        overallFinancials,
        getProjectFinancials,
        allProjectFinancials,
        toast,
        showToast,
        reportCurrency,
        setReportCurrency,
        exchangeRateSARtoEGP,
        setExchangeRateSARtoEGP,
        currentUser,
        setCurrentUser,
        switchRole,
        userPermissions,
        addTask,
        updateTask,
        deleteTask,
        updateTaskProgress,
        addUser,
        updateUser,
        deleteUser,
        addProjectAttachment,
        updateProjectAttachment,
        deleteProjectAttachment,
        addProject,
        updateProject,
        updateProjectStatus,
        deleteProject,
        addClient,
        updateClient,
        deleteClient,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addClientPayment,
        updateClientPayment,
        deleteClientPayment,
        addTeamPayment,
        updateTeamPayment,
        deleteTeamPayment,
        addExpense,
        updateExpense,
        deleteExpense,
        resetToSampleData,
        exportDatabaseJSON,
        importDatabaseJSON,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
