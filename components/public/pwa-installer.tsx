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
    // Check if running inside installed standalone app
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      if (isStandalone) {
        setShowInstallBanner(false);
      }
    }

    // 1. Check Notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    // 2. Register Service Worker & Auto Sync Subscription with Database
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          if (Notification.permission === 'granted') {
            handleEnableNotifications();
          }
        })
        .catch((err) => console.log('SW Registration failed:', err));
    }

    // Clear old permanent dismissal so testers/users receive the prompt
    localStorage.removeItem('sb19_pwa_dismissed');

    const isSessionDismissed = sessionStorage.getItem('sb19_pwa_session_dismissed');
    const isInstalled = localStorage.getItem('sb19_pwa_installed');

    // Initially pop up banner if not dismissed in current session & not installed
    if (!isSessionDismissed && !isInstalled) {
      setShowInstallBanner(true);
    }

    // 3. Listen for PWA Install Prompt & App Installed
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // If browser fires beforeinstallprompt again, user uninstalled or does not have app installed
      localStorage.removeItem('sb19_pwa_installed');

      if (!isSessionDismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      localStorage.setItem('sb19_pwa_installed', 'true');
      // Automatically request notification permissions upon app installation
      handleEnableNotifications();
    };

    // 4. Realtime Broadcast Push Listener for mobile devices
    let pushChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        pushChannel = new BroadcastChannel('sb19_push_channel');
        pushChannel.onmessage = async (event) => {
          if (event.data && event.data.type === 'TRIGGER_PUSH') {
            const { title, message, url } = event.data;
            if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
              try {
                const reg = await navigator.serviceWorker.ready;
                const logoUrl = window.location.origin + '/assets/ytslogo.jpg';
                const options: NotificationOptions & { renotify?: boolean } = {
                  body: message || 'New release update available!',
                  icon: logoUrl,
                  badge: logoUrl,
                  tag: 'sb19-push-' + Date.now(),
                  renotify: true,
                  data: { url: url || '/' },
                };
                await reg.showNotification(title || 'SB19 Streaming Hub', options);
              } catch {
                // Ignore
              }
            }
          }
        };
      } catch {
        // Ignore
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (pushChannel) pushChannel.close();
    };
  }, []);

  // Auto-close banner after 10 seconds as requested by user
  useEffect(() => {
    if (showInstallBanner) {
      const timer = setTimeout(() => {
        setShowInstallBanner(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showInstallBanner]);

  const handleInstallClick = async () => {
    // Automatically trigger notification permission prompt
    handleEnableNotifications();

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
          localStorage.setItem('sb19_pwa_installed', 'true');
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
    setIsSubmittingNotif(true);

    try {
      // 1. iOS Safari Check
      if (typeof window !== 'undefined' && !('Notification' in window)) {
        alert("iPhone Notice: Please tap Share -> 'Add to Home Screen' first. Then open SB19 Streaming Hub from your Home Screen to enable Push Notifications!");
        setIsSubmittingNotif(false);
        return;
      }

      // Always invoke requestPermission directly on click gesture
      let permission: NotificationPermission = 'default';
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = Notification.permission;
      }
      setNotifPermission(permission);

      if (permission === 'denied') {
        alert("Notifications are currently blocked in your browser settings.\n\nTo unblock:\n1. Tap the lock/tune icon near the URL address bar.\n2. Tap Site Settings -> Permissions -> Notifications -> Allow.\n3. Refresh the page!");
      }

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFCMfc_zll7t8hZAdbPxvcMAb_G9e7nOcAWIMPWjobBUGJdFVHd3-4qWURL9Td8MUDJaRnQlZMc8qfg_gJGeMOM';

        // Unsubscribe old/stale subscription to guarantee fresh VAPID key pairing
        if (sub) {
          try {
            await sub.unsubscribe();
            sub = null;
          } catch {
            // Ignore
          }
        }

        if (!sub && vapidPublicKey) {
          try {
            const convertedKey = (base64String: string) => {
              const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
              const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
              }
              return outputArray;
            };

            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey(vapidPublicKey),
            });
          } catch (subErr: any) {
            console.log('Push subscribe error:', subErr);
          }
        }

        if (sub && sub.endpoint && sub.endpoint.startsWith('https://')) {
          const subscriptionJSON = sub.toJSON();

          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              subscription: subscriptionJSON,
              keys: subscriptionJSON?.keys || null,
              userAgent: navigator.userAgent,
            }),
          });

          setNotifSuccess(true);
          setTimeout(() => setNotifSuccess(false), 5000);
        }
      }
    } catch (err: any) {
      console.log('Notification error:', err);
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('sb19_pwa_session_dismissed', 'true');
    localStorage.removeItem('sb19_pwa_dismissed');
  };

  return (
    <>
      {/* Floating PWA Install & Push Notification Banner */}
      {showInstallBanner && (
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
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Install SB19 Streaming Hub</h4>
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
      )}

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
                  <p className="text-xs text-slate-400 font-medium">Install SB19 Streaming Hub on Phone or Laptop in 1 click!</p>
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
                          <h4 className="text-xs font-bold text-white">Tap &apos;Install and create shortcut&apos;, &apos;Install app&apos;, or &apos;Add to Home screen&apos;</h4>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Select <strong>Install and create shortcut</strong>, <strong>Install app</strong>, or <strong>Add to Home screen</strong>. SB19 Streaming Hub will be saved as a native app on your phone!
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
                      <h4 className="text-xs font-bold text-white">Enable Push Notifications in App & Android Settings</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">
                        Tap <strong>Enable Notifications</strong> below and select <strong>Allow</strong>. If your phone shows notifications off in App Info settings, go to <strong>Phone Settings &gt; SB19 Streaming Hub &gt; Notifications &gt; Turn ON</strong>.
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
                        Open <strong>SB19 Streaming Hub</strong> from your iPhone Home Screen and tap <strong>Allow Notifications</strong>.
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
                        Click <strong>Enable Notifications</strong> on the bottom banner to get instant release alerts & streaming reminders!
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
