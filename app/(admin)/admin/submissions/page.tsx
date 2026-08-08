'use client';

import React, { useState } from 'react';
import { useAdminWorkspace } from '../layout';
import { ArticleSubmission, Article } from '@/types/database';
import { getStoredSubmissions, saveSubmissions, getStoredArticles, saveArticles, generateUUID, approveSubmissionInSupabase, updateSubmissionStatusInSupabase, deleteSubmissionFromSupabase } from '@/lib/data-store';
import { RejectSubmissionModal } from '@/components/admin/reject-submission-modal';
import { EditSubmissionModal } from '@/components/admin/edit-submission-modal';
import { DeleteConfirmModal } from '@/components/admin/delete-confirm-modal';
import { Check, X, ExternalLink, Clock, MessageSquare, Copy, Edit2, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

export default function SubmissionsAdminPage() {
  const { activeProfile, submissions, refreshData } = useAdminWorkspace();

  const [rejectModalSub, setRejectModalSub] = useState<ArticleSubmission | null>(null);
  const [editModalSub, setEditModalSub] = useState<ArticleSubmission | null>(null);
  const [permDeleteSubTarget, setPermDeleteSubTarget] = useState<ArticleSubmission | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'rose' } | null>(null);

  if (!activeProfile) return null;

  const showToast = (message: string, type: 'success' | 'info' | 'rose' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const profileSubmissions = submissions.filter(s => s.profile_id === activeProfile.id && s.status === 'pending');

  const handleApprove = async (sub: ArticleSubmission) => {
    setProcessingId(sub.id);
    const allArticles = getStoredArticles();
    const newArt: Article = {
      id: generateUUID(),
      profile_id: activeProfile.id,
      title: sub.title || 'Submitted Streaming Article',
      article_url: sub.article_url,
      canonical_url: sub.canonical_url,
      website_name: sub.website_name || new URL(sub.article_url).hostname.replace('www.', ''),
      thumbnail: sub.thumbnail || null,
      description: sub.description || null,
      display_order: allArticles.filter(a => a.profile_id === activeProfile.id).length + 1,
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Update local storage
    saveArticles([newArt, ...allArticles]);
    const allSubs = getStoredSubmissions();
    const updatedSubs = allSubs.map(s => s.id === sub.id ? { ...s, status: 'approved' as const, reviewed_at: new Date().toISOString() } : s);
    saveSubmissions(updatedSubs);

    // 2. Persist to Supabase database
    await approveSubmissionInSupabase(sub, newArt);

    setProcessingId(null);
    showToast('Article submission approved and published to public page!', 'success');
    refreshData();
  };

  const handleRejectConfirm = async (subId: string, reason: string) => {
    setProcessingId(subId);
    const allSubs = getStoredSubmissions();
    const updatedSubs = allSubs.map(s => s.id === subId ? { ...s, status: 'rejected' as const, notes: `Rejected reason: ${reason}`, reviewed_at: new Date().toISOString() } : s);
    saveSubmissions(updatedSubs);

    await updateSubmissionStatusInSupabase(subId, 'rejected', `Rejected reason: ${reason}`);

    setProcessingId(null);
    showToast('Submission rejected and archived.', 'rose');
    refreshData();
  };

  const handleMarkDuplicate = async (subId: string) => {
    setProcessingId(subId);
    const allSubs = getStoredSubmissions();
    const updatedSubs = allSubs.map(s => s.id === subId ? { ...s, status: 'duplicate' as const, reviewed_at: new Date().toISOString() } : s);
    saveSubmissions(updatedSubs);

    await updateSubmissionStatusInSupabase(subId, 'duplicate');

    setProcessingId(null);
    showToast('Submission marked as duplicate.', 'info');
    refreshData();
  };

  const handleConfirmPermDeleteSub = async () => {
    if (!permDeleteSubTarget) return;
    setProcessingId(permDeleteSubTarget.id);
    const allSubs = getStoredSubmissions();
    const filtered = allSubs.filter(s => s.id !== permDeleteSubTarget.id);
    saveSubmissions(filtered);

    await deleteSubmissionFromSupabase(permDeleteSubTarget.id);

    setProcessingId(null);
    showToast('Submission permanently deleted.', 'rose');
    refreshData();
    setPermDeleteSubTarget(null);
  };

  const handleEditSaved = () => {
    showToast('Submission details updated successfully!', 'success');
    refreshData();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl w-full">
      {/* Toast Feedback Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          toast.type === 'rose' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          'bg-slate-900 text-white border-slate-800'
        }`}>
          <div className="flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Fan Submissions Review</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Pending article link submissions for profile: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold shrink-0">
          {profileSubmissions.length} Pending
        </span>
      </div>

      <div className="rounded-2xl glass-panel border border-slate-200 bg-white overflow-hidden shadow-xs">
        {profileSubmissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No pending submissions for {activeProfile.title}.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {profileSubmissions.map((sub) => (
              <div key={sub.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {sub.thumbnail ? (
                    <img src={sub.thumbnail} alt="Submission preview" className="w-20 h-14 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200" />
                  ) : (
                    <div className="w-20 h-14 rounded-lg bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                      No Preview
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {sub.website_name || 'Web Article'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Submitted by {sub.submitted_by_name || 'Anonymous Fan'}</span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 truncate mt-1">{sub.title || sub.article_url}</h3>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{sub.article_url}</div>

                    {sub.notes && (
                      <p className="text-[11px] text-slate-600 mt-1 italic flex items-center gap-1 font-medium">
                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>"{sub.notes}"</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={sub.article_url}
                    target="_blank"
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200 border border-slate-200"
                    title="Open submitted URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setEditModalSub(sub)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-amber-600 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-colors"
                    title="Edit Submission Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMarkDuplicate(sub.id)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-colors"
                    title="Mark as Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setRejectModalSub(sub)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Reject Submission"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPermDeleteSubTarget(sub)}
                    disabled={processingId === sub.id}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Permanently Delete Submission"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleApprove(sub)}
                    disabled={processingId === sub.id}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
                    title="Approve & Publish Article"
                  >
                    {processingId === sub.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditSubmissionModal
        submission={editModalSub}
        isOpen={Boolean(editModalSub)}
        onClose={() => setEditModalSub(null)}
        onSaved={handleEditSaved}
      />

      <RejectSubmissionModal
        submission={rejectModalSub}
        isOpen={Boolean(rejectModalSub)}
        onClose={() => setRejectModalSub(null)}
        onReject={handleRejectConfirm}
      />

      <DeleteConfirmModal
        isOpen={Boolean(permDeleteSubTarget)}
        title="Permanently Delete Submission?"
        itemName={permDeleteSubTarget ? (permDeleteSubTarget.title || permDeleteSubTarget.article_url) : undefined}
        isPermanent={true}
        onClose={() => setPermDeleteSubTarget(null)}
        onConfirm={handleConfirmPermDeleteSub}
      />
    </div>
  );
}
