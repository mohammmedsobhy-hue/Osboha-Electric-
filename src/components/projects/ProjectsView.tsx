import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus } from '../../types';
import { formatCurrency, formatDate, formatPercent, PROJECT_STATUS_MAP, CURRENCY_INFO } from '../../utils/formatters';
import { exportProjectsData } from '../../utils/exportService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ProjectsViewProps {
  onOpenCreate: () => void;
  onOpenEdit: (project: Project) => void;
  onSelectProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onOpenCreate,
  onOpenEdit,
  onSelectProject,
}) => {
  const { db, allProjectFinancials, deleteProject } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Filter projects
  const filteredProjects = db.projects.filter(project => {
    const client = db.clients.find(c => c.id === project.clientId);
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client?.name && client.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            إدارة المشاريع والربحية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل العقود، الفواتير، التحصيلات، مستحقات الفريق، المصروفات وصافي الأرباح
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>تصدير الجدول</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setExportMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-right animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      exportProjectsData(filteredProjects, db.clients, allProjectFinancials, 'excel');
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>تصدير ملف Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportProjectsData(filteredProjects, db.clients, allProjectFinancials, 'pdf');
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-rose-600" />
                    <span>تصدير / طباعة PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      exportProjectsData(filteredProjects, db.clients, allProjectFinancials, 'csv');
                      setExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>تصدير CSV</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المشروع، الكود، أو العميل..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({db.projects.length})
          </button>
          {Object.entries(PROJECT_STATUS_MAP).map(([key, val]) => {
            const count = db.projects.filter(p => p.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key as ProjectStatus)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === key
                    ? 'bg-emerald-800 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {val.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List View */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">لم يتم العثور على أي مشاريع مطابقة</p>
          <button
            onClick={onOpenCreate}
            className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            إضافة مشروع جديد الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map(project => {
            const client = db.clients.find(c => c.id === project.clientId);
            const fin = allProjectFinancials.get(project.id);
            const statusMeta = PROJECT_STATUS_MAP[project.status];
            const isProfitable = (fin?.actualProfit || 0) >= 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-5"
              >
                {/* Top Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {project.code}
                      </span>
                      <h3
                        onClick={() => onSelectProject(project.id)}
                        className="text-base font-bold text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors"
                      >
                        {project.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusMeta.bgClass} ${statusMeta.textClass}`}>
                        {statusMeta.label}
                      </span>
                      {/* Currency Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 border ${
                          project.currency === 'EGP'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <span>{project.currency === 'EGP' ? '🇪🇬' : '🇸🇦'}</span>
                        <span>{CURRENCY_INFO[project.currency || 'SAR'].name} ({CURRENCY_INFO[project.currency || 'SAR'].symbol})</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>العميل: <strong className="text-slate-700">{client?.name || 'غير محدد'}</strong></span>
                      <span>·</span>
                      <span className="font-mono">
                        {formatDate(project.startDate)} ➔ {formatDate(project.endDate)}
                      </span>
                      <span>·</span>
                      <span>
                        الفريق: <strong className="text-slate-700">{fin?.teamMembers.length || 0} أعضاء</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>التفاصيل الشاملة</span>
                    </button>
                    <button
                      onClick={() => onOpenEdit(project)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="تعديل المشروع"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setProjectToDelete(project.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف المشروع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 12 Key Financial Parameters (Grid Display) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 text-xs">
                  {/* Contract Value */}
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">قيمة العقد ({CURRENCY_INFO[project.currency || 'SAR'].symbol})</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(project.contractValue, project.currency || 'SAR')}
                    </span>
                  </div>

                  {/* Total Invoiced & Collected */}
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">الفواتير / المحصّل</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {formatCurrency(fin?.totalCollected, project.currency || 'SAR')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      من {formatCurrency(fin?.totalInvoiced, project.currency || 'SAR')} مفوترة
                    </span>
                  </div>

                  {/* Client Remaining */}
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">المتبقي على العميل</span>
                    <span className="font-mono font-bold text-amber-700 text-sm">
                      {formatCurrency(fin?.clientRemaining, project.currency || 'SAR')}
                    </span>
                  </div>

                  {/* Team Entitlements & Paid */}
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">مستحقات الفريق / المدفوع</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      {formatCurrency(fin?.totalTeamPaid, project.currency || 'SAR')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      من {formatCurrency(fin?.totalTeamEntitlements, project.currency || 'SAR')} مستحق
                    </span>
                  </div>

                  {/* Expenses */}
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">مصروفات المشروع</span>
                    <span className="font-mono font-bold text-rose-700 text-sm">
                      {formatCurrency(fin?.totalExpenses, project.currency || 'SAR')}
                    </span>
                  </div>

                  {/* Realized Profit */}
                  <div className={`p-2.5 rounded-lg border ${isProfitable ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={isProfitable ? 'text-emerald-800 font-semibold' : 'text-rose-800 font-semibold'}>
                        الربح الفعلي
                      </span>
                      <span className="font-mono">{formatPercent(fin?.actualProfitMargin)}</span>
                    </div>
                    <span className={`font-mono font-bold text-sm block mt-0.5 ${isProfitable ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {formatCurrency(fin?.actualProfit, project.currency || 'SAR')}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">
                      المتوقع: {formatCurrency(fin?.expectedProfit, project.currency || 'SAR')}
                    </span>
                  </div>
                </div>

                {/* Project Card Budget Progress Strip */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500">الميزانية المعتمدة:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(project.approvedBudget || 0, project.currency || 'SAR')}
                    </span>
                    {project.approvedBudget && project.approvedBudget > 0 ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        fin?.isOverBudget
                          ? 'bg-rose-100 text-rose-800'
                          : (fin?.budgetUsagePercent || 0) >= 90
                          ? 'bg-orange-100 text-orange-800'
                          : (fin?.budgetUsagePercent || 0) >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {fin?.isOverBudget
                          ? `تجاوز الميزانية (${((fin?.budgetUsagePercent || 0)).toFixed(0)}%)`
                          : `${(fin?.budgetUsagePercent || 0).toFixed(0)}% استهلاك المصروفات`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">لم تحدد ميزانية</span>
                    )}
                  </div>
                  {project.approvedBudget && project.approvedBudget > 0 ? (
                    <div className="flex items-center gap-2.5 w-full sm:w-72">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fin?.isOverBudget
                              ? 'bg-rose-600'
                              : (fin?.budgetUsagePercent || 0) >= 90
                              ? 'bg-orange-500'
                              : (fin?.budgetUsagePercent || 0) >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, fin?.budgetUsagePercent || 0))}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono whitespace-nowrap font-medium ${
                        fin?.isOverBudget ? 'text-rose-700 font-bold' : 'text-slate-600'
                      }`}>
                        {fin?.isOverBudget
                          ? `عجز: ${formatCurrency(Math.abs(fin.budgetRemaining), project.currency || 'SAR')}`
                          : `متبقي: ${formatCurrency(fin?.budgetRemaining, project.currency || 'SAR')}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) deleteProject(projectToDelete);
        }}
        title="حذف المشروع نهائياً"
        message="هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع الفواتير والمصروفات والمدفوعات والمستحقات المرتبطة به فوراً."
      />
    </div>
  );
};
