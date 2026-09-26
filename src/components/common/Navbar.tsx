import React, { useState } from 'react';
import {
  Plus,
  RotateCcw,
  Download,
  Menu,
  FileText,
  Briefcase,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ChevronDown,
  Calendar,
  ShieldCheck,
  Check,
  User as UserIcon,
  FileSpreadsheet,
  LogIn,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_DEFINITIONS, UserRole } from '../../types';
import { exportFullPlatformExcelBackup } from '../../utils/exportService';
import { BrandLogo } from './BrandLogo';
import { LoginModal } from './LoginModal';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenQuickAction: (actionType: 'project' | 'invoice' | 'client-payment' | 'team-payment' | 'expense' | 'client' | 'team') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenQuickAction }) => {
  const {
    db,
    allProjectFinancials,
    resetToSampleData,
    exportDatabaseJSON,
    activeTab,
    setActiveTab,
    currentUser,
    switchRole,
    userPermissions,
  } = useApp();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const currentRoleMeta = ROLE_DEFINITIONS[currentUser?.role || 'admin'];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      {/* Zone 1: Mobile toggle & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -mr-2 text-slate-500 rounded-lg lg:hidden hover:text-slate-800 hover:bg-slate-100"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center cursor-pointer select-none group"
        >
          <BrandLogo variant="light" size="sm" />
        </div>
      </div>

      {/* Zone 2: Navigation shortcuts */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-xs font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
          }`}
        >
          لوحة التحكم
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'projects' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
          }`}
        >
          المشاريع
        </button>
        {userPermissions.canManageGantt && (
          <button
            onClick={() => setActiveTab('gantt')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'gantt' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            مخطط جانت
          </button>
        )}
        {userPermissions.canManageInvoices && (
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            الفواتير
          </button>
        )}
        {userPermissions.canViewReports && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            التقارير
          </button>
        )}
      </nav>

      {/* Zone 3: Actions & User RBAC Switcher */}
      <div className="flex items-center gap-2">
        {/* Quick Action Button Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل جديد</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right animate-in fade-in duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                  إضافة أو تسجيل فوري
                </div>

                {userPermissions.canManageProjects && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenQuickAction('project');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-right"
                  >
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>مشروع جديد</span>
                  </button>
                )}

                {userPermissions.canManageInvoices && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenQuickAction('invoice');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-right"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>فاتورة جديدة</span>
                  </button>
                )}

                {userPermissions.canManagePayments && (
                  <>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenQuickAction('client-payment');
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-right"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <span>دفعة مستلمة من عميل</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenQuickAction('team-payment');
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-right"
                    >
                      <ArrowUpRight className="w-4 h-4 text-amber-600" />
                      <span>دفعة مصروفة لعضو فريق</span>
                    </button>
                  </>
                )}

                {userPermissions.canManageExpenses && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenQuickAction('expense');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-right"
                  >
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span>مصروف مشروع</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                {userPermissions.canManageClients && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenQuickAction('client');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-right"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>إضافة عميل جديد</span>
                  </button>
                )}

                {userPermissions.canManageTeam && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenQuickAction('team');
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-right"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>إضافة عضو فريق</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Role Switcher Dropdown (RBAC) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-right"
            title="تبديل الدور وصلاحيات المستخدم"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              {currentUser.name.slice(0, 1)}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold leading-tight">
                {currentRoleMeta.label.split(' ')[0]}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-right animate-in fade-in duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 text-xs">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500">{currentUser.email}</div>
                  <div className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {currentRoleMeta.label}
                  </div>
                </div>

                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  تبديل الدور الوظيفي (RBAC Test)
                </div>

                {(['admin', 'project_manager', 'accountant', 'team_member'] as UserRole[]).map(roleKey => {
                  const meta = ROLE_DEFINITIONS[roleKey];
                  const isCurrent = currentUser.role === roleKey;

                  return (
                    <button
                      key={roleKey}
                      onClick={() => {
                        switchRole(roleKey);
                        setUserMenuOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3.5 py-2 text-xs transition-colors text-right ${
                        isCurrent ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{meta.label}</span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setLoginModalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-cyan-800 hover:bg-cyan-50 transition-colors text-right font-medium"
                >
                  <LogIn className="w-4 h-4 text-cyan-600" />
                  <span>تسجيل الدخول / تبديل الحساب</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setActiveTab('users');
                  }}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-right"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>إدارة المستخدمين والصلاحيات</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Data Tools Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDataMenuOpen(prev => !prev)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="إدارة البيانات والنسخ الاحتياطي"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {dataMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDataMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right">
                <button
                  onClick={() => {
                    setDataMenuOpen(false);
                    resetToSampleData();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors text-right"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>استعادة بيانات العرض</span>
                </button>
                <button
                  onClick={() => {
                    setDataMenuOpen(false);
                    exportFullPlatformExcelBackup(db, allProjectFinancials);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors text-right"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>تصدير نسخة Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    setDataMenuOpen(false);
                    exportDatabaseJSON();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors text-right"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>تصدير نسخة JSON</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </header>
  );
};

