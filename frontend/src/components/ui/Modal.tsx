import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
      <div className="bg-[#0B1628] rounded-2xl shadow-3d-lg w-full max-w-lg overflow-hidden border border-[#243650] transform translate-z-30 transition-all text-[#CBD5E1]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#243650] bg-[#101D31]">
          <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#192B45] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 text-[#CBD5E1]">{children}</div>
      </div>
    </div>
  );
};
