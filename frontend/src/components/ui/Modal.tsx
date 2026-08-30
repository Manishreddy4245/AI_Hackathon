import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md transition-all animate-fadeIn cursor-default overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className={`bg-[#0B1628] rounded-2xl shadow-3d-lg w-full ${maxWidth} max-h-[92vh] flex flex-col my-auto overflow-hidden border border-[#243650] transform translate-z-30 transition-all text-[#CBD5E1]`}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#243650] bg-[#101D31] shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight truncate pr-2">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E3048] border border-transparent hover:border-[#3B82F6]/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3B82F6] shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 text-[#CBD5E1] overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
};
