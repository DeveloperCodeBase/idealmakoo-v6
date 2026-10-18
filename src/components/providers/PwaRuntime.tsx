'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PwaRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || /^\/(?:admin|api)(?:\/|$)|^\/(?:fa|en|tr|ar|ru)\/(?:admin|account|auth)(?:\/|$)/.test(pathname)) return;
    const timer = window.setTimeout(() => { navigator.serviceWorker.register('/service-worker.js', {type:'module',scope:'/'}).catch(() => { /* An unsupported browser retains the full online website. */ }); }, 2000);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
