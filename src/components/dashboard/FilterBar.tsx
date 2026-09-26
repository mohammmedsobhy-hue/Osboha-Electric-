import React from 'react';
import { Filter, RotateCcw, Calendar, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProjectStatus } from '../../types';
import { PROJECT_STATUS_MAP } from '../../utils/formatters';

export const FilterBar: React.FC = () => {
  const { db, filters, setFilters, resetFilters } = useApp();

  const isFiltered =
    (filters.projectId && filters.projectId !== 'all') ||
    (filters.clientId && filters.clientId !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs mb-6">
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800">تصفية وتحليل الحسابات</span>
          {isFiltered && (
            <span className="text-[11px] text-emerald-800 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full">
              تصفية نشطة
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors py-1 px-2 rounded-md hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط التصفية</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Filter by Project */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              المشروع
            </span>
          </label>
          <select
            value={filters.projectId || 'all'}
            onChange={e => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
            className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">جميع المشاريع ({db.projects.length})</option>
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Filter by Client */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              العميل
            </span>
          </label>
          <select
            value={filters.clientId || 'all'}
            onChange={e => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
            className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">جميع العملاء ({db.clients.length})</option>
            {db.clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filter by Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-slate-400" />
              حالة المشروع
            </span>
          </label>
          <select
            value={filters.status || 'all'}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as ProjectStatus | 'all' }))}
            className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">كافة الحالات</option>
            {Object.entries(PROJECT_STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Date Range Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              تاريخ بدء المشروع (من - إلى)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-1/2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="من"
              title="تاريخ البداية من"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-1/2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="إلى"
              title="تاريخ البداية إلى"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
