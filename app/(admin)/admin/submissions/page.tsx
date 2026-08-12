'use client';

import React, { useState } from 'react';
import { useAdminWorkspace } from '../layout';
import { ArticleSubmission, Article } from '@/types/database';
import { getStoredSubmissions, saveSubmissions, getStoredArticles, saveArticles, generateUUID, approveSubmissionInSupabase, updateSubmissionStatusInSupabase, deleteSubmissionFromSupabase } from '@/lib/data-store';
import { isDuplicateUrl } from '@/lib/url-normalizer';
import { RejectSubmissionModal } from '@/components/admin/reject-submission-modal';
import { EditSubmissionModal } from '@/components/admin/edit-submission-modal';
import { DeleteConfirmModal } from '@/components/admin/delete-confirm-modal';
import { Check, X, ExternalLink, Clock, MessageSquare, Copy, Edit2, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

export default function SubmissionsAdminPage() {
  const { activeProfile, profiles, submissions, refreshData } = useAdminWorkspace();

  const [scopeFilter, setScopeFilter] = useState<'active' | 'all'>('active');
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

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const activeProfileSubmissions = pendingSubmissions.filter(s => s.profile_id === activeProfile.id);
  const otherPendingSubmissions = pendingSubmissions.filter(s => s.profile_id !== activeProfile.id);

  const displaySubmissions = scopeFilter === 'active' ? activeProfileSubmissions : pendingSubmissions;

  const handleApprove = async (sub: ArticleSubmission) => {
    setProcessingId(sub.id);
    const allArticles = getStoredArticles();

    // Check if URL is already published
    const publishedUrls = allArticles.flatMap(a => [a.canonical_url, a.article_url].filter(Boolean) as string[]);
    if (isDuplicateUrl(sub.canonical_url || sub.article_url, publishedUrls)) {
      await handleMarkDuplicate(sub.id);
      showToast('Notice: This link is already published! Submission auto-marked as duplicate.', 'info');
      return;
    }

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

    // Auto-mark any twin pending submissions as duplicate
    const targetUrls = [sub.canonical_url, sub.article_url].filter(Boolean) as string[];
    const updatedSubs = allSubs.map(s => {
      if (s.id === sub.id) {
        return { ...s, status: 'approved' as const, reviewed_at: new Date().toISOString() };
      }
      if (s.status === 'pending' && isDuplicateUrl(s.canonical_url || s.article_url, targetUrls)) {
        return { ...s, status: 'duplicate' as const, notes: 'Auto-marked duplicate upon approving twin submission', reviewed_at: new Date().toISOString() };
      }
      return s;
    });
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
      {/* Other Workspaces Pending Notice */}
      {otherPendingSubmissions.length > 0 && scopeFilter === 'active' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">
                Notice: {otherPendingSubmissions.length} pending submission{otherPendingSubmissions.length === 1 ? '' : 's'} in other workspace profiles!
              </h4>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                Switch workspace tab to &quot;All Workspaces&quot; or select the profile in the top dropdown menu.
              </p>
            </div>
          </div>

          <button
            onClick={() => setScopeFilter('all')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            Show All Workspaces ({pendingSubmissions.length})
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Fan Submissions Review</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            {scopeFilter === 'active'
              ? <>Pending submissions for profile: <span className="text-rose-600 font-bold">{activeProfile.title}</span></>
              : <>Showing pending submissions across <span className="text-rose-600 font-bold">All Release Workspaces</span></>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setScopeFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeFilter === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {activeProfile.title} ({activeProfileSubmissions.length})
          </button>
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Workspaces ({pendingSubmissions.length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl glass-panel border border-slate-200 bg-white overflow-hidden shadow-xs">
        {displaySubmissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            {scopeFilter === 'active'
              ? `No pending submissions for ${activeProfile.title}.`
              : `No pending submissions across any release profile workspace.`}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {displaySubmissions.map((sub) => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {sub.website_name || 'Web Article'}
                      </span>
                      {(() => {
                        const targetProf = profiles.find(p => p.id === sub.profile_id);
                        return targetProf ? (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-extrabold border"
                            style={{
                              backgroundColor: `${targetProf.accent_color || '#e11d48'}15`,
                              borderColor: `${targetProf.accent_color || '#e11d48'}40`,
                              color: targetProf.accent_color || '#e11d48',
                            }}
                          >
                            Profile: {targetProf.title}
                          </span>
                        ) : null;
                      })()}
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
