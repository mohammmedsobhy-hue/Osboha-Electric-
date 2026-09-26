import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  BarChart3,
  X,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveTab, ROLE_DEFINITIONS } from '../../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, db, currentUser, userPermissions } = useApp();

  const unpaidInvoicesCount = db.invoices.filter(i => {
    const paid = db.clientPayments
      .filter(cp => cp.invoiceId === i.id)
      .reduce((s, cp) => s + cp.amount, 0);
    return paid < i.totalAmount;
  }).length;

  const activeProjectsCount = db.projects.filter(p => p.status === 'in_progress').length;
  const delayedTasksCount = (db.tasks || []).filter(t => t.status === 'delayed').length;

  const allNavItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    allowedRoles?: string[];
  }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم (Dashboard)',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      label: 'إدارة المشاريع',
      icon: Briefcase,
      badge: activeProjectsCount > 0 ? activeProjectsCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'gantt',
      label: 'مخطط جانت والمسار الحرج',
      icon: Calendar,
      badge: delayedTasksCount > 0 ? `${delayedTasksCount} متأخرة` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
      allowedRoles: ['admin', 'project_manager', 'team_member'],
    },
    {
      id: 'clients',
      label: 'قائمة العملاء',
      icon: Users,
      badge: db.clients.length,
      allowedRoles: ['admin', 'project_manager', 'accountant'],
    },
    {
      id: 'team',
      label: 'أعضاء الفريق',
      icon: UserCheck,
      badge: db.teamMembers.length,
      allowedRoles: ['admin', 'project_manager'],
    },
    {
      id: 'invoices',
      label: 'الفواتير والتحصيل',
      icon: FileText,
      badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
      allowedRoles: ['admin', 'accountant'],
    },
    {
      id: 'client-payments',
      label: 'دفعات العملاء (المقبوضات)',
      icon: ArrowDownLeft,
      allowedRoles: ['admin', 'accountant'],
    },
    {
      id: 'team-payments',
      label: 'دفعات الفريق (المصروفات)',
      icon: ArrowUpRight,
      allowedRoles: ['admin', 'accountant', 'team_member'],
    },
    {
      id: 'expenses',
      label: 'مصروفات المشاريع',
      icon: Receipt,
      allowedRoles: ['admin', 'project_manager', 'accountant'],
    },
    {
      id: 'reports',
      label: 'التقارير وحساب الأرباح',
      icon: BarChart3,
      allowedRoles: ['admin', 'project_manager', 'accountant'],
    },
    {
      id: 'users',
      label: 'الأدوار والصلاحيات (RBAC)',
      icon: ShieldCheck,
      allowedRoles: ['admin', 'project_manager'],
    },
  ];

  // Filter navigation items by active user role
  const navItems = allNavItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(currentUser.role);
  });

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const roleMeta = ROLE_DEFINITIONS[currentUser.role];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header in sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
          <BrandLogo variant="dark" size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase flex justify-between items-center">
            <span>الأقسام المتاحة</span>
            <span className="text-[9px] text-slate-500 font-mono">{currentUser.role}</span>
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`flex items-center justify-between w-full px-3 py-2.5 text-xs font-medium rounded-lg transition-colors group text-right ${
                  isActive
                    ? 'bg-emerald-600/20 text-white font-semibold border-r-4 border-emerald-500 rounded-r-none'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-medium shrink-0 ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Role widget */}
        <div className="p-3 m-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px]">الدور الوظيفي الحالي</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">{roleMeta.label}</div>
        </div>
      </aside>
    </>
  );
};

