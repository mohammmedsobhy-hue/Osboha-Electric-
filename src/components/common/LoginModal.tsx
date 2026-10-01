import React, { useState } from 'react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';
import { User, ROLE_DEFINITIONS } from '../../types';
import { BrandLogo } from './BrandLogo';
import { LogIn, CheckCircle2, ShieldCheck, KeyRound, Zap, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { db, currentUser, setCurrentUser, showToast } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    showToast(`تم تسجيل الدخول بنجاح بحساب: ${user.name} (${ROLE_DEFINITIONS[user.role].label})`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="lg"
    >
      <div className="space-y-6 text-right pt-2 pb-1">
        {/* Brand Hero Header */}
        <div className="text-center pb-5 border-b border-slate-200">
          <div className="inline-flex justify-center mb-3">
            <BrandLogo variant="light" size="lg" showSubtitle={false} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            تسجيل الدخول وتبديل الحساب
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            منصة <strong className="text-slate-800 font-bold">Osboha Electric</strong> الموحدة لإدارة المشاريع والمالية والأرباح، والأعمال الكهربائية والرقابة الذكية
          </p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>نظام إدارة الطاقة والمشاريع الكهربائية</span>
          </div>
        </div>

        {/* User Account Selection Grid */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            اختر الحساب المطلوب تسجيل الدخول به:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.users.map(u => {
              const isCurrent = currentUser.id === u.id;
              const roleMeta = ROLE_DEFINITIONS[u.role];

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative text-right flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-cyan-50/70 border-cyan-600 shadow-sm ring-2 ring-cyan-500/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 border-2 border-cyan-500/30 shadow-xs">
                      {u.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">{u.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-600 text-white">
                            الحالي
                          </span>
                        )}
                      </div>
                      <span className={`inline-block px-1.5 py-0.5 mt-1 rounded text-[10px] font-semibold border ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">{u.email}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">صلاحيات: {roleMeta.label.split(' ')[0]}</span>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        isCurrent
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-cyan-600 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3 h-3" />
                      <span>{isCurrent ? 'نشط الآن' : 'دخول'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & System Info Footer */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>نظام أمان متقدم مع حماية الصلاحيات (RBAC Multi-Level Security)</span>
          </div>
          <span className="font-mono text-slate-400 text-[10px]">v2.6 · Osboha Electric</span>
        </div>
      </div>
    </Modal>
  );
};
