'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  className = '',
}: TurnstileWidgetProps) {
  const activeSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADvfvehdsxMR16Ud';
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        action: 'turnstile-spin-v2',
        callback: (token: string) => {
          if (onVerifyRef.current) onVerifyRef.current(token);
        },
        'error-callback': () => {
          if (onErrorRef.current) onErrorRef.current();
        },
        'expired-callback': () => {
          if (onExpireRef.current) onExpireRef.current();
        },
      });
    } catch (err) {
      console.error('Turnstile render error:', err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, activeSiteKey]);

  return (
    <>
      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          if (window.turnstile) {
            setScriptLoaded(true);
          }
        }}
      />
      <div className={`flex justify-center my-3 min-h-[65px] ${className}`}>
        <div ref={containerRef} />
      </div>
    </>
  );
}
