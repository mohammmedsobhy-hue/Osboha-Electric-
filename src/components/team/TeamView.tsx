import React, { useState } from 'react';
import { UserCheck, Plus, Search, Edit, Trash2, ArrowUpRight, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeamMember } from '../../types';
import { formatSAR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatCard } from '../common/StatCard';

interface TeamViewProps {
  onOpenCreateMember: () => void;
  onOpenEditMember: (member: TeamMember) => void;
  onOpenCreatePayment: (projectId?: string, teamMemberId?: string) => void;
  onSelectProject: (projectId: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  onOpenCreateMember,
  onOpenEditMember,
  onOpenCreatePayment,
  onSelectProject,
}) => {
  const { db, allProjectFinancials, deleteTeamMember } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Calculate team aggregated metrics
  const teamMemberStats = db.teamMembers.map(member => {
    // Find all assignments for this member
    const assignments = db.projectAssignments.filter(pa => pa.teamMemberId === member.id);
    let totalEntitled = 0;

    assignments.forEach(pa => {
      const project = db.projects.find(p => p.id === pa.projectId);
      if (project) {
        if (pa.compensationType === 'percentage') {
          totalEntitled += (pa.compensationValue / 100) * project.contractValue;
        } else {
          totalEntitled += pa.compensationValue;
        }
      }
    });

    // Sum of all payments to this member
    const totalPaid = db.teamPayments
      .filter(tp => tp.teamMemberId === member.id)
      .reduce((s, tp) => s + tp.amount, 0);

    const totalRemaining = Math.max(0, totalEntitled - totalPaid);

    return {
      member,
      assignedProjectsCount: assignments.length,
      assignments,
      totalEntitled,
      totalPaid,
      totalRemaining,
    };
  });

  const filteredMembers = teamMemberStats.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.member.name.toLowerCase().includes(q) ||
      item.member.role.toLowerCase().includes(q) ||
      item.member.email.toLowerCase().includes(q) ||
      item.member.phone.includes(q)
    );
  });

  const globalTotalEntitled = teamMemberStats.reduce((s, m) => s + m.totalEntitled, 0);
  const globalTotalPaid = teamMemberStats.reduce((s, m) => s + m.totalPaid, 0);
  const globalTotalRemaining = teamMemberStats.reduce((s, m) => s + m.totalRemaining, 0);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            إدارة أعضاء الفريق والمستحقات
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة اتفاقيات التعويض (نسبة مئوية أو مبلغ ثابت)، المدفوعات المسددة، والمبالغ المتبقية
          </p>
        </div>

        <button
          onClick={onOpenCreateMember}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عضو جديد</span>
        </button>
      </div>

      {/* Team Aggregated KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="إجمالي أعضاء الفريق"
          value={db.teamMembers.length.toString()}
          subtitle="كفاءات مسجلة بالمنصة"
          icon={UserCheck}
        />
        <StatCard
          title="إجمالي المستحقات المكتسبة"
          value={formatSAR(globalTotalEntitled)}
          subtitle="مجموع التزامات المشاريع"
        />
        <StatCard
          title="إجمالي المسدد للفريق"
          value={formatSAR(globalTotalPaid)}
          subtitle="حوالات بنكية مصروفة"
          variant="highlight"
        />
        <StatCard
          title="المتبقي المستحق للفريق"
          value={formatSAR(globalTotalRemaining)}
          subtitle="مستحقات معلقة للصرف"
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
            placeholder="بحث بالاسم، التخصص، أو الهاتف..."
            className="w-full pl-3 pr-9 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {filteredMembers.length} عضو فريق
        </span>
      </div>

      {/* Team Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map(({ member, assignedProjectsCount, assignments, totalEntitled, totalPaid, totalRemaining }) => (
          <div
            key={member.id}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Member Card Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">{member.role}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                    <span>{member.phone || 'بدون هاتف'}</span>
                    <span>·</span>
                    <span>{member.email || 'بدون بريد'}</span>
                  </div>
                  {member.iban && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1">IBAN: {member.iban}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEditMember(member)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="تعديل العضو"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMemberToDelete(member.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="حذف العضو"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Financial Stats Grid */}
              <div className="grid grid-cols-3 gap-2 py-3 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">إجمالي المستحق</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">{formatSAR(totalEntitled)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">المسدد له</div>
                  <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">{formatSAR(totalPaid)}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <div className="text-[10px] text-slate-500">المتبقي له</div>
                  <div className="text-xs font-mono font-bold text-amber-700 mt-0.5">{formatSAR(totalRemaining)}</div>
                </div>
              </div>

              {/* Assigned Projects Badges */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  المشاريع المسندة ({assignedProjectsCount}):
                </span>
                {assignedProjectsCount === 0 ? (
                  <span className="text-[11px] text-slate-400">لم يسند إلى أي مشاريع حتى الآن</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {assignments.map(pa => {
                      const proj = db.projects.find(p => p.id === pa.projectId);
                      if (!proj) return null;
                      return (
                        <button
                          key={pa.id}
                          onClick={() => onSelectProject(proj.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                          title="عرض المشروع"
                        >
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span className="font-medium truncate max-w-[140px]">{proj.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ({pa.compensationType === 'percentage' ? `${pa.compensationValue}%` : formatSAR(pa.compensationValue)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {totalRemaining === 0 ? 'مستحقاته مسددة بالكامل' : `متبقي له ${formatSAR(totalRemaining)}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  const firstProj = assignments[0]?.projectId;
                  onOpenCreatePayment(firstProj, member.id);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>صرف دفعة</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) deleteTeamMember(memberToDelete);
        }}
        title="حذف عضو الفريق"
        message="هل أنت متأكد من حذف عضو الفريق هذا؟ (لا يمكن حذف عضو مرتبط بمشاريع حالية)"
      />
    </div>
  );
};
