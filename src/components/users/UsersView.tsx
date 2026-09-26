import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit,
  Trash2,
  Check,
  X,
  User as UserIcon,
  LogIn,
  KeyRound,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, ROLE_DEFINITIONS } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const UsersView: React.FC = () => {
  const { db, currentUser, setCurrentUser, switchRole, userPermissions, addUser, updateUser, deleteUser } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('team_member');
  const [teamMemberId, setTeamMemberId] = useState('');

  const openAdd = () => {
    setUserToEdit(null);
    setName('');
    setEmail('');
    setRole('team_member');
    setTeamMemberId(db.teamMembers[0]?.id || '');
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setUserToEdit(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setTeamMemberId(u.teamMemberId || '');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (userToEdit) {
      updateUser(userToEdit.id, {
        name,
        email,
        role,
        teamMemberId: role === 'team_member' ? teamMemberId : undefined,
      });
    } else {
      addUser({
        name,
        email,
        role,
        teamMemberId: role === 'team_member' ? teamMemberId : undefined,
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>إدارة الأدوار والصلاحيات (RBAC)</span>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Access Control
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            تحديد مستويات الوصول للأقسام (المشاريع، العملاء، المالية، التقارير، جانت) لكل دور وظيفي
          </p>
        </div>

        {userPermissions.canManageUsers && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مستخدم جديد</span>
          </button>
        )}
      </div>

      {/* Current Active User Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-l from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center font-bold text-sm">
            {currentUser.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">أنت مسجل الدخول حالياً بحساب:</span>
              <strong className="text-sm text-white">{currentUser.name}</strong>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {ROLE_DEFINITIONS[currentUser.role].label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{ROLE_DEFINITIONS[currentUser.role].description}</p>
          </div>
        </div>

        {/* Quick Role Switcher Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <span className="text-[11px] text-slate-300 ml-1">تبديل الدور للتجربة:</span>
          {(['admin', 'project_manager', 'accountant', 'team_member'] as UserRole[]).map(r => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                currentUser.role === r
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {r === 'admin'
                ? 'مدير نظام'
                : r === 'project_manager'
                ? 'مدير مشاريع'
                : r === 'accountant'
                ? 'محاسب'
                : 'عضو فريق'}
            </button>
          ))}
        </div>
      </div>

      {/* Role Definitions & Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <span>مصفوفة الصلاحيات حسب الدور الوظيفي (Permissions Matrix)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            توضح الأقسام المتاحة للقراءة والتعديل لكل دور لضمان سرية البيانات المالية والتنفيذية
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">الوحدة / القسم</th>
                <th className="py-3 px-4 text-center">مدير النظام (Admin)</th>
                <th className="py-3 px-4 text-center">مدير المشاريع (PM)</th>
                <th className="py-3 px-4 text-center">المحاسب المالي (Accountant)</th>
                <th className="py-3 px-4 text-center">عضو الفريق (Team Member)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">إدارة العقود والمشاريع</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center text-slate-400">قراءة فقط</td>
                <td className="py-2.5 px-4 text-center text-slate-400">مشاريعه المسندة فقط</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">مخطط جانت والمسار الحرج (Gantt)</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center text-slate-600">مهامه المسندة فقط</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">الفواتير والتحصيل الضريبي</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">دفعات الفريق والمستحقات</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center text-slate-400">اطلاع على المستحق</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center text-slate-600">مستحقاته الشخصية فقط</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">مصروفات وتكاليف المشاريع</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">تقارير الأرباح والخسائر المجمعة (P&L)</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center text-slate-400">أرباح مشاريعه فقط</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">إدارة المستخدمين والأدوار</td>
                <td className="py-2.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                <td className="py-2.5 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">حسابات المستخدمين المسجلين في النظام</h3>
          <span className="text-xs text-slate-500 font-mono">{db.users.length} مستخدم</span>
        </div>

        <div className="divide-y divide-slate-100">
          {db.users.map(u => {
            const roleMeta = ROLE_DEFINITIONS[u.role];
            const isSelf = u.id === currentUser.id;

            return (
              <div
                key={u.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {u.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{u.name}</span>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          أنت الآن
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{u.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!isSelf && (
                    <button
                      onClick={() => setCurrentUser(u)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="تسجيل الدخول بهذا الحساب وتطبيق صلاحياته"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>التبديل لهذا الحساب</span>
                    </button>
                  )}

                  {userPermissions.canManageUsers && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="تعديل المستخدم"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUserToDelete(u.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف المستخدم"
                        disabled={isSelf}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={userToEdit ? 'تعديل المستخدم والصلاحيات' : 'إضافة مستخدم جديد للنظام'}
        subtitle="تعيين الدور الوظيفي لتحديد الصلاحيات الممنوحة"
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
              placeholder="مثال: م. ياسر الأحمدي"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@osboha-electric.com"
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              الدور والصلاحيات <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="admin">مدير النظام (Administrator) - صلاحيات كاملة</option>
              <option value="project_manager">مدير مشاريع (Project Manager) - مهام وجانت والعملاء</option>
              <option value="accountant">محاسب مالي (Accountant) - الفواتير، التحصيلات والمصروفات</option>
              <option value="team_member">عضو فريق (Team Member) - مهامه ومستحقاته الشخصية فقط</option>
            </select>
          </div>

          {role === 'team_member' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ربط بسجل عضو الفريق
              </label>
              <select
                value={teamMemberId}
                onChange={e => setTeamMemberId(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {db.teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                سيتيح للمستخدم مشاهدة مستحقاته الشخصية والمهام المسندة له في مخطط جانت فقط
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
            >
              {userToEdit ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) deleteUser(userToDelete);
        }}
        title="حذف المستخدم"
        message="هل أنت متأكد من حذف هذا المستخدم؟"
      />
    </div>
  );
};
