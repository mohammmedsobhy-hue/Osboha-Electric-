import React from 'react';
import { formatSAR, formatPercent } from '../../utils/formatters';

interface FinancialChartsProps {
  totalCollected: number;
  totalTeamPaid: number;
  totalExpenses: number;
  actualProfit: number;
  totalContractValue: number;
  totalTeamEntitlements: number;
  expectedProfit: number;
  projectBreakdowns: {
    name: string;
    code: string;
    contractValue: number;
    collected: number;
    actualProfit: number;
    expectedProfit: number;
    status: string;
  }[];
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  totalCollected,
  totalTeamPaid,
  totalExpenses,
  actualProfit,
  totalContractValue,
  totalTeamEntitlements,
  expectedProfit,
  projectBreakdowns,
}) => {
  // Cashflow Outflow vs Inflow calculations
  const totalOutflows = totalTeamPaid + totalExpenses;
  const cashflowRatio = totalCollected > 0 ? (totalOutflows / totalCollected) * 100 : 0;

  // Maximum value for bar normalization in project comparison
  const maxProjectVal = Math.max(...projectBreakdowns.map(p => Math.max(p.contractValue, p.collected, 1)), 1000);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Cashflow Breakdown (Inflow vs Outflow vs Realized Net Profit) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">تحليل التدفقات النقدية الفعلية (Cashflow)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مقارنة التحصيلات الفعلية مقابل المدفوع للفريق والمصروفات وصافي الربح
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            الربح: {formatSAR(actualProfit)}
          </span>
        </div>

        {/* Visual Bar representation */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">إجمالي التحصيل الفعلي (المقبوضات)</span>
              <span className="font-mono font-bold text-slate-900">{formatSAR(totalCollected)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: '100%' }}
                title={`التحصيل: ${formatSAR(totalCollected)}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">المدفوع لأعضاء الفريق</span>
              <span className="font-mono font-bold text-amber-700">{formatSAR(totalTeamPaid)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${totalCollected > 0 ? Math.min(100, (totalTeamPaid / totalCollected) * 100) : 0}%`,
                }}
                title={`المدفوع للفريق: ${formatSAR(totalTeamPaid)}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">مصروفات المشاريع</span>
              <span className="font-mono font-bold text-rose-700">{formatSAR(totalExpenses)}</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{
                  width: `${totalCollected > 0 ? Math.min(100, (totalExpenses / totalCollected) * 100) : 0}%`,
                }}
                title={`المصروفات: ${formatSAR(totalExpenses)}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-900 font-bold">الربح الفعلي المحقق (السيولة الصافية)</span>
              <span className={`font-mono font-bold ${actualProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatSAR(actualProfit)}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 ${actualProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{
                  width: `${totalCollected > 0 ? Math.max(0, Math.min(100, (actualProfit / totalCollected) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Financial KPI Summary footer */}
        <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-center">
          <div className="p-2 rounded bg-slate-50">
            <div className="text-[10px] text-slate-500">نسبة الصرف من التحصيل</div>
            <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatPercent(cashflowRatio)}</div>
          </div>
          <div className="p-2 rounded bg-slate-50">
            <div className="text-[10px] text-slate-500">هامش الربح الفعلي</div>
            <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
              {formatPercent(totalCollected > 0 ? (actualProfit / totalCollected) * 100 : 0)}
            </div>
          </div>
          <div className="p-2 rounded bg-slate-50">
            <div className="text-[10px] text-slate-500">الربح المتوقع للمحفظة</div>
            <div className="text-xs font-mono font-bold text-blue-700 mt-0.5">{formatSAR(expectedProfit)}</div>
          </div>
        </div>
      </div>

      {/* 2. Project Profitability & Performance Bar List */}
      <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">مقارنة ربحية المشاريع النشطة</h3>
            <p className="text-xs text-slate-500 mt-0.5">قيمة العقود مقابل المحصّل والأرباح الصافية</p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {projectBreakdowns.length} مشاريع معروضة
          </span>
        </div>

        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
          {projectBreakdowns.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">لا توجد مشاريع تطابق خيارات الفلترة الحالية</div>
          ) : (
            projectBreakdowns.map((proj, idx) => {
              const contractWidth = (proj.contractValue / maxProjectVal) * 100;
              const collectedWidth = (proj.collected / maxProjectVal) * 100;

              return (
                <div key={idx} className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] font-semibold text-slate-400">{proj.code}</span>
                      <span className="font-semibold text-slate-800 truncate" title={proj.name}>
                        {proj.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-slate-600">{formatSAR(proj.collected)} محصل</span>
                      <span className="text-slate-300">/</span>
                      <span className="font-bold text-emerald-700">ربح {formatSAR(proj.actualProfit)}</span>
                    </div>
                  </div>

                  {/* Multi-layered visual bar */}
                  <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 right-0 h-full bg-slate-300 rounded-full opacity-60"
                      style={{ width: `${contractWidth}%` }}
                      title={`قيمة العقد: ${formatSAR(proj.contractValue)}`}
                    />
                    <div
                      className="absolute top-0 right-0 h-full bg-emerald-600 rounded-full"
                      style={{ width: `${collectedWidth}%` }}
                      title={`المحصل: ${formatSAR(proj.collected)}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>قيمة المشروع الإجمالية</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>المحصّل الفعلي</span>
          </div>
        </div>
      </div>
    </div>
  );
};
