import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Briefcase } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { Project, CompensationType, ProjectStatus, Currency } from '../../types';
import { formatCurrency, PROJECT_STATUS_MAP } from '../../utils/formatters';

interface AssignmentRow {
  teamMemberId: string;
  roleInProject: string;
  compensationType: CompensationType;
  compensationValue: number;
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
}) => {
  const { db, addProject, updateProject } = useApp();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [contractValue, setContractValue] = useState<number>(0);
  const [approvedBudget, setApprovedBudget] = useState<number>(0);
  const [currency, setCurrency] = useState<Currency>('SAR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [statusNote, setStatusNote] = useState('');
  const [description, setDescription] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    if (projectToEdit) {
      setCode(projectToEdit.code);
      setName(projectToEdit.name);
      setClientId(projectToEdit.clientId);
      setContractValue(projectToEdit.contractValue);
      setApprovedBudget(projectToEdit.approvedBudget ?? 0);
      setCurrency(projectToEdit.currency || 'SAR');
      setStartDate(projectToEdit.startDate);
      setEndDate(projectToEdit.endDate);
      setStatus(projectToEdit.status);
      setStatusNote(projectToEdit.statusNote || '');
      setDescription(projectToEdit.description || '');

      // Load existing assignments
      const existing = db.projectAssignments
        .filter(pa => pa.projectId === projectToEdit.id)
        .map(pa => ({
          teamMemberId: pa.teamMemberId,
          roleInProject: pa.roleInProject,
          compensationType: pa.compensationType,
          compensationValue: pa.compensationValue,
        }));
      setAssignments(existing);
    } else {
      // Auto-generate code
      const nextNum = db.projects.length + 1;
      setCode(`PRJ-2026-${String(nextNum).padStart(3, '0')}`);
      setName('');
      setClientId(db.clients[0]?.id || '');
      setContractValue(50000);
      setApprovedBudget(10000);
      setCurrency('SAR');
      setStartDate(new Date().toISOString().slice(0, 10));
      // End date 3 months out
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setEndDate(d.toISOString().slice(0, 10));
      setStatus('in_progress');
      setDescription('');
      setAssignments([]);
    }
  }, [projectToEdit, isOpen, db.clients, db.projects.length, db.projectAssignments]);

  const handleAddAssignment = () => {
    if (db.teamMembers.length === 0) return;
    setAssignments(prev => [
      ...prev,
      {
        teamMemberId: db.teamMembers[0].id,
        roleInProject: db.teamMembers[0].role || 'عضو فريق',
        compensationType: 'percentage',
        compensationValue: 10,
      },
    ]);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssignmentChange = (
    index: number,
    field: keyof AssignmentRow,
    value: string | number
  ) => {
    setAssignments(prev =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: value };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (projectToEdit) {
      updateProject(
        projectToEdit.id,
        {
          code,
          name,
          clientId,
          contractValue: Number(contractValue) || 0,
          approvedBudget: Number(approvedBudget) || 0,
          currency,
          startDate,
          endDate,
          status,
          statusNote: statusNote.trim() || undefined,
          statusUpdatedAt: new Date().toISOString(),
          description,
        },
        assignments
      );
    } else {
      addProject(
        {
          code,
          name,
          clientId,
          contractValue: Number(contractValue) || 0,
          approvedBudget: Number(approvedBudget) || 0,
          currency,
          startDate,
          endDate,
          status,
          statusNote: statusNote.trim() || undefined,
          statusUpdatedAt: new Date().toISOString(),
          description,
        },
        assignments
      );
    }
    onClose();
  };

  // Calculate total team entitlements from assignments preview
  const estimatedTeamEntitlements = assignments.reduce((sum, a) => {
    if (a.compensationType === 'percentage') {
      return sum + ((a.compensationValue || 0) / 100) * (Number(contractValue) || 0);
    }
    return sum + (Number(a.compensationValue) || 0);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? 'تعديل بيانات المشروع' : 'إنشاء مشروع استثماري جديد'}
      subtitle="سجل تفاصيل التعاقد، وحدد عملة المشروع (ريال سعودي أو جنيه مصري)، والمواعيد والمستحقات"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        {/* Currency Selector Highlight Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            عملة المشروع والتعاقد <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCurrency('SAR')}
              className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold transition-all text-right ${
                currency === 'SAR'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🇸🇦</span>
                <div>
                  <div className="font-bold">ريال سعودي (SAR)</div>
                  <div className="text-[10px] text-slate-500 font-normal">المملكة العربية السعودية · رمز: ر.س</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${currency === 'SAR' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {currency === 'SAR' ? 'محدد' : 'اختيار'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrency('EGP')}
              className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold transition-all text-right ${
                currency === 'EGP'
                  ? 'bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🇪🇬</span>
                <div>
                  <div className="font-bold">جنيه مصري (EGP)</div>
                  <div className="text-[10px] text-slate-500 font-normal">جمهورية مصر العربية · رمز: ج.م</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${currency === 'EGP' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {currency === 'EGP' ? 'محدد' : 'اختيار'}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            * يتم تسجيل قيمة العقد وجميع فواتير ومصروفات ومستحقات هذا المشروع بعملة ({currency === 'SAR' ? 'الريال السعودي SAR' : 'الجنيه المصري EGP'}).
          </p>
        </div>

        {/* Project Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              اسم المشروع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: منصة التجارة الإلكترونية لشركة الرواد"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم / كود المشروع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="PRJ-2026-001"
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              العميل <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {db.clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              قيمة المشروع الإجمالية ({currency === 'SAR' ? 'بالريال السعودي SAR' : 'بالجنيه المصري EGP'}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                required
                value={contractValue}
                onChange={e => setContractValue(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold text-emerald-800 bg-white border border-slate-300 rounded-lg p-2.5 pl-14 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                {currency === 'SAR' ? 'ر.س' : 'ج.م'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                الميزانية المعتمدة للمشروع ({currency === 'SAR' ? 'بالريال SAR' : 'بالجنيه EGP'})
              </label>
              {Number(contractValue) > 0 && Number(approvedBudget) > 0 && (
                <span className="text-[10px] text-emerald-700 font-mono font-medium">
                  (~{((Number(approvedBudget) / Number(contractValue)) * 100).toFixed(0)}% من قيمة العقد)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                value={approvedBudget}
                onChange={e => setApprovedBudget(Number(e.target.value))}
                placeholder="0"
                className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 pl-14 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                {currency === 'SAR' ? 'ر.س' : 'ج.م'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              سقف الميزانية التقديرية لمصروفات المشروع لمتابعة نسبة الإنفاق والتحكم بالتكاليف.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ البداية <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ النهاية المتوقع <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              حالة سير عمل المشروع <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ProjectStatus)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="in_progress">⚡ قيد التنفيذ (In Progress)</option>
              <option value="completed">✅ مكتمل (Completed)</option>
              <option value="on_hold">⏸️ متوقف (On Hold)</option>
              <option value="planning">📋 تخطيط (Planning)</option>
              <option value="cancelled">🚫 ملغي (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملاحظة أو سبب الحالة (اختياري)
            </label>
            <input
              type="text"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="مثال: متوقف مؤقتاً في انتظار موافقة العميل على الـ API"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">وصف أو ملاحظات العقد</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="نطاق العمل، شروط الدفع، الخ..."
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Team Assignments & Entitlements Section (Required by User Prompt) */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>أعضاء الفريق ومستحقاتهم من المشروع</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                حدد طريقة استحقاق كل عضو: إما نسبة مئوية (%) من قيمة المشروع أو مبلغ ثابت (SAR)
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddAssignment}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إسناد عضو جديد</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
              لم يتم تعيين أعضاء فريق لهذا المشروع حتى الآن. انقر على &quot;إسناد عضو جديد&quot; لحساب المستحقات آلياً.
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignments.map((row, idx) => {
                const entitledAmount =
                  row.compensationType === 'percentage'
                    ? ((row.compensationValue || 0) / 100) * contractValue
                    : Number(row.compensationValue) || 0;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                  >
                    {/* Team Member Select */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] text-slate-500 mb-0.5">العضو</label>
                      <select
                        value={row.teamMemberId}
                        onChange={e => handleAssignmentChange(idx, 'teamMemberId', e.target.value)}
                        className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded p-1.5"
                      >
                        {db.teamMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role In Project */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] text-slate-500 mb-0.5">الدور بالمشروع</label>
                      <input
                        type="text"
                        value={row.roleInProject}
                        onChange={e => handleAssignmentChange(idx, 'roleInProject', e.target.value)}
                        placeholder="مثال: مطور رئيسي"
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Type: Percentage vs Fixed */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">طريقة الحساب</label>
                      <select
                        value={row.compensationType}
                        onChange={e =>
                          handleAssignmentChange(idx, 'compensationType', e.target.value as CompensationType)
                        }
                        className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded p-1.5"
                      >
                        <option value="percentage">نسبة مئوية %</option>
                        <option value="fixed">مبلغ ثابت ({currency === 'SAR' ? 'ر.س' : 'ج.م'})</option>
                      </select>
                    </div>

                    {/* Value */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        {row.compensationType === 'percentage'
                          ? 'النسبة (%)'
                          : `المبلغ (${currency === 'SAR' ? 'ر.س' : 'ج.م'})`}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={row.compensationType === 'percentage' ? '0.5' : '100'}
                        value={row.compensationValue}
                        onChange={e => handleAssignmentChange(idx, 'compensationValue', Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>

                    {/* Delete button & Entitled calculation */}
                    <div className="sm:col-span-1 flex items-center justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        title="حذف العضو من المشروع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="col-span-full text-[11px] text-slate-600 bg-white/70 px-2 py-1 rounded border border-slate-200/50 flex justify-between font-mono">
                      <span>المستحق التقديري لهذا العضو:</span>
                      <span className="font-bold text-emerald-800">{formatCurrency(entitledAmount, currency)}</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-xs p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="font-bold text-emerald-950">إجمالي مستحقات الفريق المقدرة:</span>
                <span className="font-mono font-bold text-emerald-900">{formatCurrency(estimatedTeamEntitlements, currency)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
          >
            {projectToEdit ? 'حفظ التعديلات' : 'إنشاء المشروع'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
