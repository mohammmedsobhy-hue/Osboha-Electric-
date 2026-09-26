import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Briefcase, FileText, ArrowDownLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';
import { formatSAR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface ClientsViewProps {
  onOpenCreateClient: () => void;
  onOpenEditClient: (client: Client) => void;
  onSelectProject: (projectId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onOpenCreateClient,
  onOpenEditClient,
  onSelectProject,
}) => {
  const { db, allProjectFinancials, deleteClient } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Calculate client aggregate numbers
  const clientStats = db.clients.map(client => {
    const projects = db.projects.filter(p => p.clientId === client.id);
    let totalContractValue = 0;
    let totalInvoiced = 0;
    let totalCollected = 0;

    projects.forEach(p => {
      const fin = allProjectFinancials.get(p.id);
      totalContractValue += p.contractValue;
      if (fin) {
        totalInvoiced += fin.totalInvoiced;
        totalCollected += fin.totalCollected;
      }
    });

    const totalRemaining = Math.max(0, totalInvoiced - totalCollected);

    return {
      client,
      projectsCount: projects.length,
      projects,
      totalContractValue,
      totalInvoiced,
      totalCollected,
      totalRemaining,
    };
  });

  const filteredClients = clientStats.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.client.name.toLowerCase().includes(q) ||
      (c.client.companyName && c.client.companyName.toLowerCase().includes(q)) ||
      c.client.email.toLowerCase().includes(q) ||
      c.client.phone.includes(q)
    );
  });

  const globalTotalContract = clientStats.reduce((s, c) => s + c.totalContractValue, 0);
  const globalTotalInvoiced = clientStats.reduce((s, c) => s + c.totalInvoiced, 0);
  const globalTotalCollected = clientStats.reduce((s, c) => s + c.totalCollected, 0);
  const globalTotalRemaining = clientStats.reduce((s, c) => s + c.totalRemaining, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            إدارة العملاء والشركات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل العملاء، العقود المشتركة، الفواتير، التحصيلات، والأرصدة المستحقة
          </p>
        </div>

        <button
          onClick={onOpenCreateClient}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Aggregate Financial Metrics for Clients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="عدد العملاء النشطين"
          value={db.clients.length.toString()}
          subtitle="جهات وشركات متعاقدة"
          icon={Users}
        />
        <StatCard
          title="إجمالي الفواتير الصادرة"
          value={formatSAR(globalTotalInvoiced)}
          subtitle="مطالبات مالية"
        />
        <StatCard
          title="إجمالي المحصّل من العملاء"
          value={formatSAR(globalTotalCollected)}
          subtitle="مقبوضات مسددة"
          variant="highlight"
        />
        <StatCard
          title="المتبقي المستحق على العملاء"
          value={formatSAR(globalTotalRemaining)}
          subtitle="أرصدة معلقة للتحصيل"
          variant={globalTotalRemaining > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم العميل، الشركة، أو الهاتف..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {filteredClients.length} عميل
        </span>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map(({ client, projectsCount, projects, totalContractValue, totalInvoiced, totalCollected, totalRemaining }) => (
          <div
            key={client.id}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{client.name}</h3>
                  {client.companyName && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{client.companyName}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                    <span>{client.phone}</span>
                    <span>·</span>
                    <span>{client.email}</span>
                  </div>
                  {client.vatNumber && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1">الرقم الضريبي: {client.vatNumber}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEditClient(client)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="تعديل بيانات العميل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setClientToDelete(client.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف العميل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="grid grid-cols-3 gap-2 py-3 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">إجمالي الفواتير</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{formatSAR(totalInvoiced)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">المحصل فعلياً</div>
                  <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">{formatSAR(totalCollected)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">المتبقي بذمته</div>
                  <div className="text-xs font-mono font-bold text-amber-700 mt-0.5">{formatSAR(totalRemaining)}</div>
                </div>
              </div>

              {/* Related Projects */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  المشاريع المرتبطة ({projectsCount}):
                </span>
                {projectsCount === 0 ? (
                  <span className="text-[11px] text-slate-400">لا توجد مشاريع مسجلة لهذا العميل</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => onSelectProject(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                      >
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">{p.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({formatSAR(p.contractValue)})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>العنوان: {client.address || 'غير محدد'}</span>
              <span className="font-semibold text-slate-700">قيمة التعاقدات: {formatSAR(totalContractValue)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        onConfirm={() => {
          if (clientToDelete) deleteClient(clientToDelete);
        }}
        title="حذف العميل"
        message="هل أنت متأكد من حذف هذا العميل؟ (لا يمكن حذف عميل مرتبط بمشاريع حالية)"
      />
    </div>
  );
};
