'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Archive, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  isPermanent?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  isPermanent = false,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
            isPermanent ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {isPermanent ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-snug">
              {title || (isPermanent ? 'Delete Permanently?' : 'Move to Recycle Bin?')}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {isPermanent ? 'This action cannot be undone.' : 'You can restore it anytime from the Bin.'}
            </p>
          </div>
        </div>

        {itemName && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 truncate">
            &quot;{itemName}&quot;
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-white text-xs font-extrabold shadow-md transition-all cursor-pointer ${
              isPermanent
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
            }`}
          >
            {isPermanent ? 'Permanently Delete' : 'Move to Recycle Bin'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
