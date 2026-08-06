'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArticleSubmission } from '@/types/database';
import { X, AlertTriangle } from 'lucide-react';

interface RejectSubmissionModalProps {
  submission: ArticleSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onReject: (submissionId: string, reason: string) => void;
}

const REJECTION_REASONS = [
  'Duplicate Article',
  'Broken Link / Inaccessible Page',
  'Spam / Unrelated Content',
  'Wrong Profile Target',
  'No Embedded YouTube Player',
  'Other / Quality Concerns',
];

export function RejectSubmissionModal({
  submission,
  isOpen,
  onClose,
  onReject,
}: RejectSubmissionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !submission || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReject(submission.id, selectedReason);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[calc(100vh-130px)] flex flex-col rounded-3xl bg-white p-6 border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Reject Submission</h2>
              <p className="text-xs text-slate-500 font-semibold">Archive and decline user submitted article</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-700 font-bold">
            Select a rejection reason for <span className="font-black text-slate-900">{submission.title || submission.article_url}</span>:
          </p>

          <div className="space-y-2">
            {REJECTION_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  selectedReason === reason
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{reason}</span>
                <input
                  type="radio"
                  name="rejection_reason"
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="accent-rose-600"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              Confirm Rejection & Archive
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
