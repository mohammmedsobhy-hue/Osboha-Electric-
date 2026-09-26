import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { TeamPayment, TeamPaymentMethod } from '../../types';
import { formatSAR } from '../../utils/formatters';

interface TeamPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultTeamMemberId?: string;
  paymentToEdit?: TeamPayment | null;
}

export const TeamPaymentModal: React.FC<TeamPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  defaultTeamMemberId,
  paymentToEdit,
}) => {
  const { db, addTeamPayment, updateTeamPayment, getProjectFinancials } = useApp();

  const [paymentNumber, setPaymentNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [teamMemberId, setTeamMemberId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<TeamPaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (paymentToEdit) {
      setPaymentNumber(paymentToEdit.paymentNumber);
      setProjectId(paymentToEdit.projectId);
      setTeamMemberId(paymentToEdit.teamMemberId);
      setAmount(paymentToEdit.amount);
      setPaymentDate(paymentToEdit.paymentDate);
      setPaymentMethod(paymentToEdit.paymentMethod);
      setReferenceNumber(paymentToEdit.referenceNumber);
      setNotes(paymentToEdit.notes || '');
    } else {
      const nextNum = db.teamPayments.length + 1;
      setPaymentNumber(`PAY-T-2026-${String(nextNum).padStart(2, '0')}`);
      const initialProject = defaultProjectId || db.projects[0]?.id || '';
      setProjectId(initialProject);

      // Assigned team members on this project
      const assigned = db.projectAssignments.filter(pa => pa.projectId === initialProject);
      const initialMember = defaultTeamMemberId || assigned[0]?.teamMemberId || db.teamMembers[0]?.id || '';
      setTeamMemberId(initialMember);

      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('bank_transfer');
      setReferenceNumber('');
      setNotes('');

      // Auto compute member remaining
      if (initialProject && initialMember) {
        const fin = getProjectFinancials(initialProject);
        const tm = fin?.teamMembers.find(m => m.teamMemberId === initialMember);
        if (tm && tm.remainingAmount > 0) {
          setAmount(tm.remainingAmount);
        } else {
          setAmount(5000);
        }
      }
    }
  }, [paymentToEdit, defaultProjectId, defaultTeamMemberId, isOpen, db.teamPayments.length, db.projects]);

  const assignedMembers = db.projectAssignments
    .filter(pa => pa.projectId === projectId)
    .map(pa => db.teamMembers.find(m => m.id === pa.teamMemberId))
    .filter(Boolean);

  // Selected member calculation
  const fin = getProjectFinancials(projectId);
  const selectedMemberFin = fin?.teamMembers.find(m => m.teamMemberId === teamMemberId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !teamMemberId || amount <= 0) return;

    if (paymentToEdit) {
      updateTeamPayment(paymentToEdit.id, {
        paymentNumber,
        projectId,
        teamMemberId,
        amount: Number(amount) || 0,
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
      });
    } else {
      addTeamPayment({
        paymentNumber,
        projectId,
        teamMemberId,
        amount: Number(amount) || 0,
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentToEdit ? 'تعديل دفعة الفريق' : 'صرف دفعة مالية لعضو فريق'}
      subtitle="تسجيل صرف مستحقات تعاقدية من المشروع وتحديث المتبقي تلقائياً"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الحوالة / السند <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={paymentNumber}
              onChange={e => setPaymentNumber(e.target.value)}
              className="w-full text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ الصرف <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            المشروع <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={projectId}
            onChange={e => {
              setProjectId(e.target.value);
              const members = db.projectAssignments
                .filter(pa => pa.projectId === e.target.value)
                .map(pa => pa.teamMemberId);
              if (members.length > 0) setTeamMemberId(members[0]);
            }}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {db.projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            عضو الفريق المستفيد <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={teamMemberId}
            onChange={e => {
              setTeamMemberId(e.target.value);
              const tm = fin?.teamMembers.find(m => m.teamMemberId === e.target.value);
              if (tm && tm.remainingAmount > 0) {
                setAmount(tm.remainingAmount);
              }
            }}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {assignedMembers.length > 0 ? (
              assignedMembers.map(m => m && (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))
            ) : (
              db.teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Live Entitlement Box for this member */}
        {selectedMemberFin && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-700">
              <span>إجمالي مستحق العضو من هذا المشروع:</span>
              <span className="font-mono font-bold text-slate-900">{formatSAR(selectedMemberFin.entitledAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>المدفوع له حتى الآن:</span>
              <span className="font-mono font-bold text-emerald-800">{formatSAR(selectedMemberFin.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-amber-950 font-bold pt-1 border-t border-amber-200">
              <span>المتبقي المستحق له حالياً:</span>
              <span className="font-mono">{formatSAR(selectedMemberFin.remainingAmount)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المبلغ المصروف (SAR) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="100"
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold text-amber-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">طريقة الصرف</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as TeamPaymentMethod)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="bank_transfer">تحويل بنكي مباشر</option>
              <option value="cash">نقدي (كاش)</option>
              <option value="check">شيك مصرفي</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الحوالة البنكية / المرجع</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            placeholder="SAL-xxx-xxx"
            className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات الصرف</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="دفعة إنجاز مرحلة التصميم، تسوية مستحقات، الخ..."
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
          >
            {paymentToEdit ? 'حفظ التعديلات' : 'تسجيل الصرف'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
