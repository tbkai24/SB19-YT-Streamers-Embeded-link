'use client';

import React, { useState, useEffect } from 'react';
import { Download, Bell, X, Check, Smartphone, Monitor, HelpCircle, Share, PlusSquare, ArrowRight, Sparkles } from 'lucide-react';

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [isSubmittingNotif, setIsSubmittingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // 1. Check Notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    // 2. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.log('SW Registration failed:', err));
    }

    // 3. Listen for PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = localStorage.getItem('sb19_pwa_dismissed');
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
        return;
      } catch {
        // Fallback to tutorial
      }
    }
    // Show step-by-step guide for iOS Safari, Firefox, or Chrome
    setShowTutorialModal(true);
  };

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setIsSubmittingNotif(true);

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === 'granted') {
        setNotifSuccess(true);
        setTimeout(() => setNotifSuccess(false), 4000);

        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          const endpoint = sub ? sub.endpoint : `browser-${Date.now()}-${Math.random().toString(36).substring(2)}`;

          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              userAgent: navigator.userAgent,
            }),
          });
        }
      }
    } catch {
      // Ignore errors
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('sb19_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* Floating PWA Install & Push Notification Banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/60 shadow-2xl relative overflow-hidden flex flex-col gap-3">
          {/* Subtle Red Accent Glow */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-600/30 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Install SB19 Stream Hub</h4>
                <p className="text-xs font-medium text-slate-300 mt-0.5 leading-snug">
                  Install on your Phone & Laptop for 1-click access & Push Notifications!
                </p>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>

            {notifPermission !== 'granted' && (
              <button
                onClick={handleEnableNotifications}
                disabled={isSubmittingNotif}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>{notifSuccess ? 'Enabled!' : 'Enable Notifications'}</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowTutorialModal(true)}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors pt-0.5"
          >
            <HelpCircle className="w-3 h-3 text-rose-400" />
            <span>1-Click Installation & Push Notification Guide</span>
          </button>
        </div>
      </div>

      {/* Quick Installation Tutorial Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl p-6 relative overflow-hidden space-y-5">
            {/* Glow accent */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">App Installation & Push Guide</h3>
                  <p className="text-xs text-slate-400 font-medium">Install SB19 Stream Hub on Phone or Laptop in 1 click!</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Device Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'android' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'ios' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone (iOS)</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'desktop' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Laptop / PC</span>
              </button>
            </div>

            {/* Tab Instructions */}
            <div className="space-y-4 pt-1">
              {activeTab === 'android' && (
                <div className="space-y-3">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Trigger 1-Click Android Install Prompt</span>
                    </button>
                  ) : (
                    <>
                      <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Open Browser Menu (Chrome / Firefox)</h4>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Tap the <strong>3 Dots (Chrome)</strong> or <strong>3 Lines (Firefox)</strong> menu icon at the top right of your browser.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Tap &apos;Install app&apos; or &apos;Add to Home screen&apos;</h4>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Select <strong>Install app</strong> or <strong>Add to Home screen</strong>. SB19 Hub will be installed as a native app on your phone!
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      🔔
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Enable Push Notifications</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Tap <strong>Enable Notifications</strong> below and select <strong>Allow</strong> to receive instant alerts with the SB19 logo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Tap Share Icon in Safari</span>
                        <Share className="w-3.5 h-3.5 text-rose-400" />
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        In Safari on your iPhone, tap the <strong>Share</strong> button at the bottom navigation bar.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Tap &apos;Add to Home Screen&apos;</span>
                        <PlusSquare className="w-3.5 h-3.5 text-rose-400" />
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Scroll down the menu options and select <strong>Add to Home Screen</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Open App & Allow Notifications</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Open <strong>SB19 Hub</strong> from your iPhone Home Screen and tap <strong>Allow Notifications</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'desktop' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Address Bar Install Icon</span>
                        <Monitor className="w-3.5 h-3.5 text-rose-400" />
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Click the <strong>Install Icon 🖥️</strong> at the right end of your Chrome / Edge address bar.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Enable Device Notifications</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Click <strong>Enable Notifications</strong> on the bottom banner to get alerts featuring the official SB19 logo!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                onClick={handleEnableNotifications}
                disabled={isSubmittingNotif}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                <span>{notifPermission === 'granted' ? 'Notifications Active' : 'Enable Push Notifications'}</span>
              </button>

              <button
                onClick={() => setShowTutorialModal(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1 transition-transform active:scale-95 shadow-md"
              >
                <span>Got it!</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
