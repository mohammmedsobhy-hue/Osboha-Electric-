import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { TeamMember } from '../../types';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
}

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
}) => {
  const { addTeamMember, updateTeamMember } = useApp();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setRole(memberToEdit.role);
      setEmail(memberToEdit.email);
      setPhone(memberToEdit.phone);
      setIban(memberToEdit.iban || '');
    } else {
      setName('');
      setRole('');
      setEmail('');
      setPhone('');
      setIban('');
    }
  }, [memberToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (memberToEdit) {
      updateTeamMember(memberToEdit.id, {
        name,
        role,
        email,
        phone,
        iban,
      });
    } else {
      addTeamMember({
        name,
        role,
        email,
        phone,
        iban,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={memberToEdit ? 'تعديل بيانات عضو الفريق' : 'إضافة عضو جديد للفريق'}
      subtitle="سجل بيانات المتخصص المصرفية والوظيفية لحساب المستحقات"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            الاسم الكامل <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="مثال: م. فهد العتيبي"
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            المسمى الوظيفي / التخصص <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="مثال: مطور فول ستاك أول / مصمم تجربة مستخدم"
            className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@team.sa"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+966 5x xxx xxxx"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الآيبان البنكي (IBAN)</label>
          <input
            type="text"
            value={iban}
            onChange={e => setIban(e.target.value)}
            placeholder="SA0000000000000000000000"
            className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
          >
            {memberToEdit ? 'حفظ التعديلات' : 'إضافة العضو'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
