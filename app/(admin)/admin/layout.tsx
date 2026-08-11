'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Profile, Article, ArticleSubmission } from '@/types/database';
import {
  getStoredProfiles,
  getStoredArticles,
  getStoredSubmissions,
  fetchProfilesFromSupabase,
  fetchArticlesFromSupabase,
  fetchSubmissionsFromSupabase,
  exportDataBackup,
} from '@/lib/data-store';
import { createClient } from '@/lib/supabase/client';
import { ActiveProfileSwitcher } from '@/components/admin/active-profile-switcher';
import { CreateProfileModal } from '@/components/admin/create-profile-modal';
import { BrandLogo } from '@/components/public/logo';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Palette,
  Share2,
  BarChart3,
  ExternalLink,
  LogOut,
  ArrowLeft,
  Loader2,
  Bell,
  Download,
  Heart,
} from 'lucide-react';

interface AdminWorkspaceContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  articles: Article[];
  submissions: ArticleSubmission[];
  refreshData: () => void;
  openCreateModal: () => void;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextType | null>(null);

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) {
    throw new Error('useAdminWorkspace must be used within AdminLayout');
  }
  return ctx;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [submissions, setSubmissions] = useState<ArticleSubmission[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check Admin Authentication
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    const checkAuthStatus = async () => {
      const localSession = typeof window !== 'undefined' ? localStorage.getItem('sb19_admin_session') : null;
      if (localSession === 'authenticated') {
        setIsAuthenticated(true);
        loadAllData();
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsAuthenticated(true);
          loadAllData();
        } else {
          router.replace('/admin/login');
        }
      } catch {
        router.replace('/admin/login');
      }
    };

    checkAuthStatus();
  }, [pathname, router]);

  const loadAllData = async () => {
    // 1. Initial local load
    const storedProfiles = getStoredProfiles();
    const storedArticles = getStoredArticles();
    const storedSubmissions = getStoredSubmissions();

    setProfiles(storedProfiles);
    setArticles(storedArticles);
    setSubmissions(storedSubmissions);

    if (storedProfiles.length > 0 && !activeProfile) {
      setActiveProfile(storedProfiles[0]);
    }

    // 2. Fetch fresh DB state asynchronously
    try {
      const [dbProfs, dbArts, dbSubs] = await Promise.all([
        fetchProfilesFromSupabase(),
        fetchArticlesFromSupabase(),
        fetchSubmissionsFromSupabase(),
      ]);

      if (dbProfs.length > 0) {
        setProfiles(dbProfs);
        // Retain or select active profile
        const activeExist = dbProfs.find(p => p.id === activeProfile?.id);
        setActiveProfile(activeExist || dbProfs[0]);
      }
      if (dbArts.length > 0) setArticles(dbArts);
      if (dbSubs.length > 0) setSubmissions(dbSubs);
    } catch {
      // Keep local
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb19_admin_session');
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.replace('/admin/login');
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const articleCount = activeProfile
    ? articles.filter(a => a.profile_id === activeProfile.id).length
    : 0;

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Articles', href: '/admin/articles', icon: FileText, badge: articleCount },
    { label: 'Submissions', href: '/admin/submissions', icon: Clock, badge: pendingCount, highlight: pendingCount > 0 },
    { label: 'Push Notifications', href: '/admin/notifications', icon: Bell },
    { label: 'Appearance', href: '/admin/appearance', icon: Palette },
    { label: 'Support & Donation QR', href: '/admin/support', icon: Heart },
    { label: 'Official Social Links', href: '/admin/social', icon: Share2 },
    { label: 'SEO & Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <AdminWorkspaceContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile,
        articles,
        submissions,
        refreshData: loadAllData,
        openCreateModal: () => setIsCreateOpen(true),
      }}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Top Workspace Header Bar */}
        <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200"
              title="Return to Public Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <BrandLogo size="sm" showText={true} />

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Active Profile Switcher Dropdown */}
            <ActiveProfileSwitcher
              profiles={profiles}
              activeProfile={activeProfile}
              onSelectProfile={(p) => setActiveProfile(p)}
              onCreateNewProfile={() => setIsCreateOpen(true)}
              onRefreshData={loadAllData}
            />
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {activeProfile && (
              <Link
                href={`/profile/${activeProfile.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-rose-400 text-xs font-semibold text-slate-700 hover:text-rose-600 flex items-center gap-1.5 transition-colors hidden sm:flex shadow-xs"
              >
                <span>View Public Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
              </Link>
            )}

            <button
              onClick={() => exportDataBackup()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download 1-Click JSON Backup of all profiles and articles"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Download Backup</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Log out from Admin Workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row">
          {/* Admin Sidebar */}
          <aside className="w-full md:w-64 bg-white/70 border-r border-slate-200 p-4 shrink-0">
            {activeProfile && (
              <div className="p-3.5 rounded-2xl glass-panel border border-slate-200 bg-white mb-4 flex items-center gap-3 shadow-xs">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200"
                  style={{ boxShadow: `0 0 12px ${(activeProfile.accent_color || '#e11d48')}33` }}
                >
                  {activeProfile.profile_image || activeProfile.cover_image ? (
                    <img src={activeProfile.profile_image || activeProfile.cover_image || ''} alt={activeProfile.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold text-sm">
                      {activeProfile.title.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{activeProfile.title}</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">Active Profile</div>
                </div>
              </div>
            )}

            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComp = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.highlight ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Workspace Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        </div>

        {/* Create Profile Modal */}
        <CreateProfileModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newProf) => {
            loadAllData();
            setActiveProfile(newProf);
          }}
        />
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
