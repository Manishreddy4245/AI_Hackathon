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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all animate-fadeIn cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div className={`bg-[#0B1628] rounded-2xl shadow-3d-lg w-full ${maxWidth} overflow-hidden border border-[#243650] transform translate-z-30 transition-all text-[#CBD5E1]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#243650] bg-[#101D31]">
          <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E3048] border border-transparent hover:border-[#3B82F6]/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 text-[#CBD5E1]">{children}</div>
      </div>
    </div>
  );
};
