import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { usePlacement } from '../../context/PlacementContext';

export const ToastContainer: React.FC = () => {
  const { toastsList, dismissToast } = usePlacement();

  if (toastsList.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toastsList.map((toast) => (
        <div
          key={toast.id}
          className={`p-3.5 rounded-xl text-white shadow-xl flex items-center justify-between gap-3 pointer-events-auto border transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-900 border-rose-700'
              : toast.type === 'warning'
              ? 'bg-amber-900 border-amber-700'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
