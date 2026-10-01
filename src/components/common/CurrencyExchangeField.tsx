import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, HelpCircle, Sparkles, Plus } from 'lucide-react';
import { Currency } from '../../types';
import {
  CURRENCY_INFO,
  getDefaultExchangeRate,
  convertTransactionAmount,
  formatCurrency,
} from '../../utils/formatters';

interface CurrencyExchangeFieldProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  projectCurrency: Currency;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  amount: number;
  transactionTypeLabel?: string; // e.g. "الفاتورة" or "المصروف" or "الدفعة"
}

export const CurrencyExchangeField: React.FC<CurrencyExchangeFieldProps> = ({
  selectedCurrency,
  onCurrencyChange,
  projectCurrency,
  exchangeRate,
  onExchangeRateChange,
  amount,
  transactionTypeLabel = 'المعاملة',
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');

  // Auxiliary state for inverse rate (e.g., entering 13 EGP per 1 SAR)
  const isDifferent = selectedCurrency !== projectCurrency;
  const isEGPtoSAR = selectedCurrency === 'EGP' && projectCurrency === 'SAR';
  const isSARtoEGP = selectedCurrency === 'SAR' && projectCurrency === 'EGP';

  // Compute default rate when currency changes if not already set or changed
  const handleCurrencySelect = (newCurr: Currency) => {
    onCurrencyChange(newCurr);
    if (newCurr === projectCurrency) {
      onExchangeRateChange(1.0);
    } else {
      const defaultRate = getDefaultExchangeRate(newCurr, projectCurrency);
      onExchangeRateChange(defaultRate);
    }
  };

  const handleAddCustomCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = customCode.trim().toUpperCase();
    if (!cleanCode) return;
    if (customName || customSymbol) {
      CURRENCY_INFO[cleanCode] = {
        code: cleanCode,
        name: customName.trim() || cleanCode,
        symbol: customSymbol.trim() || cleanCode,
        flag: '🌐',
        label: `${customName.trim() || cleanCode} (${cleanCode})`,
      };
    }
    handleCurrencySelect(cleanCode);
    setShowCustomModal(false);
    setCustomCode('');
    setCustomName('');
    setCustomSymbol('');
  };

  // Live converted amount into project currency
  const convertedAmount = convertTransactionAmount(
    amount,
    selectedCurrency,
    projectCurrency,
    exchangeRate
  );

  const projSymbol = CURRENCY_INFO[projectCurrency]?.symbol || projectCurrency;
  const currSymbol = CURRENCY_INFO[selectedCurrency]?.symbol || selectedCurrency;

  return (
    <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-right">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Currency Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              عملة {transactionTypeLabel} <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة عملة أخرى</span>
            </button>
          </div>
          <select
            value={selectedCurrency}
            onChange={e => handleCurrencySelect(e.target.value)}
            className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <optgroup label="العملات الرئيسية">
              <option value="SAR">🇸🇦 ريال سعودي (SAR - ر.س)</option>
              <option value="EGP">🇪🇬 جنيه مصري (EGP - ج.م)</option>
              <option value="USD">🇺🇸 دولار أمريكي (USD - $)</option>
              <option value="EUR">🇪🇺 يورو أوروبي (EUR - €)</option>
              <option value="AED">🇦🇪 درهم إماراتي (AED - د.إ)</option>
              <option value="GBP">🇬🇧 جنيه إسترليني (GBP - £)</option>
              <option value="KWD">🇰🇼 دينار كويتي (KWD - د.ك)</option>
              <option value="QAR">🇶🇦 ريال قطري (QAR - ر.ق)</option>
              <option value="BHD">🇧🇭 دينار بحريني (BHD - د.ب)</option>
              <option value="OMR">🇴🇲 ريال عماني (OMR - ر.ع)</option>
            </optgroup>
            {Object.keys(CURRENCY_INFO).filter(
              c =>
                ![
                  'SAR',
                  'EGP',
                  'USD',
                  'EUR',
                  'AED',
                  'GBP',
                  'KWD',
                  'QAR',
                  'BHD',
                  'OMR',
                ].includes(c)
            ).length > 0 && (
              <optgroup label="عملات مضافة مخصصة">
                {Object.entries(CURRENCY_INFO)
                  .filter(
                    ([c]) =>
                      ![
                        'SAR',
                        'EGP',
                        'USD',
                        'EUR',
                        'AED',
                        'GBP',
                        'KWD',
                        'QAR',
                        'BHD',
                        'OMR',
                      ].includes(c)
                  )
                  .map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.flag} {info.name} ({code} - {info.symbol})
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Exchange Rate Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              سعر الصرف (Exchange Rate) <span className="text-rose-500">*</span>
            </label>
            {isDifferent && (
              <span className="text-[10px] text-slate-500">
                1 {currSymbol} = ؟ {projSymbol}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0.000001"
              required
              disabled={!isDifferent}
              value={isDifferent ? exchangeRate : 1.0}
              onChange={e => onExchangeRateChange(parseFloat(e.target.value) || 0)}
              className={`w-full text-xs font-mono font-bold border rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                isDifferent
                  ? 'bg-white border-amber-300 text-slate-900'
                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
            {!isDifferent && (
              <span className="absolute left-2.5 top-2.5 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                مطابق لعملة المشروع
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Helper & Quick Rate Adjustment when currencies differ */}
      {isDifferent && (
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          {/* Quick preset for EGP <-> SAR */}
          {isEGPtoSAR && (
            <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-lg p-2 text-xs">
              <span className="text-amber-900 text-[11px]">
                💡 تحديد مباشر بسعر الريال: <strong>1 ر.س =</strong>
              </span>
              <div className="flex items-center gap-1.5">
                {[12.5, 13.0, 13.2, 13.5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onExchangeRateChange(Number((1 / val).toFixed(5)))}
                    className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded transition-colors"
                  >
                    {val} ج.م
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSARtoEGP && (
            <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-lg p-2 text-xs">
              <span className="text-amber-900 text-[11px]">
                💡 تحديد سعر الجنيه مقابل الريال:
              </span>
              <div className="flex items-center gap-1.5">
                {[12.5, 13.0, 13.2, 13.5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onExchangeRateChange(val)}
                    className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded transition-colors"
                  >
                    1 ر.س = {val} ج.م
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Currency Conversion Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-semibold text-emerald-900">
                  سعر الصرف المعتمد:
                </span>{' '}
                <span className="font-mono font-bold">
                  1 {currSymbol} = {exchangeRate} {projSymbol}
                </span>
                {exchangeRate > 0 && (
                  <span className="text-[11px] text-emerald-800 mr-2 font-mono">
                    (أو 1 {projSymbol} ≈ {(1 / exchangeRate).toFixed(2)} {currSymbol})
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right font-mono font-bold bg-white/80 px-2.5 py-1 rounded border border-emerald-300">
              <span className="text-[11px] text-slate-500 font-sans block sm:inline ml-1">
                المعادل في ميزانية المشروع:
              </span>
              <span className="text-emerald-900 text-sm">
                {formatCurrency(convertedAmount, projectCurrency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding custom currency */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 space-y-3 text-right shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">إضافة عملة جديدة للنظام</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomCurrency} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رمز العملة (ISO Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="مثال: CAD أو TRY"
                  value={customCode}
                  onChange={e => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم العملة بالعربية
                </label>
                <input
                  type="text"
                  placeholder="مثال: دولار كندي أو ليرة تركية"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الرمز المختصر (Symbol)
                </label>
                <input
                  type="text"
                  placeholder="مثال: C$ أو ₺"
                  value={customSymbol}
                  onChange={e => setCustomSymbol(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  إضافة العملة وتفعيلها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
