import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  trend?: string;
  variant?: 'default' | 'highlight' | 'warning' | 'danger' | 'success';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'neutral',
  trend,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200/80 hover:border-slate-300',
    highlight: 'bg-emerald-950/5 border-emerald-500/20 hover:border-emerald-500/30 text-emerald-950',
    warning: 'bg-amber-950/5 border-amber-500/20 hover:border-amber-500/30 text-amber-950',
    danger: 'bg-rose-950/5 border-rose-500/20 hover:border-rose-500/30 text-rose-950',
    success: 'bg-emerald-950/5 border-emerald-500/30 hover:border-emerald-500/40 text-emerald-950',
  }[variant];

  const badgeStyles = {
    positive: 'text-emerald-700 bg-emerald-50 border border-emerald-200/60',
    negative: 'text-rose-700 bg-rose-50 border border-rose-200/60',
    warning: 'text-amber-700 bg-amber-50 border border-amber-200/60',
    neutral: 'text-slate-600 bg-slate-100 border border-slate-200/60',
  }[badgeType];

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${variantStyles} ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 truncate" title={title}>
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100/80 text-slate-600 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-1">
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>

        {(subtitle || badge || trend) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 flex-wrap">
            {badge && (
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${badgeStyles}`}>
                {badge}
              </span>
            )}
            {trend && <span className="font-medium text-slate-600">{trend}</span>}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
