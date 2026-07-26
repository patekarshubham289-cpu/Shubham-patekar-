import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />
  };

  const borders = {
    success: 'border-emerald-500/40 bg-[#122019]',
    error: 'border-red-500/40 bg-[#281313]',
    info: 'border-cyan-500/40 bg-[#101f28]'
  };

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-3">
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl text-white ${borders[toast.type]}`}>
        {icons[toast.type]}
        <p className="text-xs font-semibold text-neutral-100">{toast.message}</p>
      </div>
    </div>
  );
};
