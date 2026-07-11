"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem("installBannerDismissed") === "true") {
      return;
    }

    // iOS Safari detection
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setShow(true);
    }

    // Android / Chrome PWA prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      localStorage.setItem("installBannerDismissed", "true");
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("installBannerDismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="max-w-md mx-auto mt-12 mb-16 px-4">
      <div className="rounded-3xl bg-white/90 border border-white/40 backdrop-blur-xl p-7 shadow-2xl text-center text-zinc-950">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-5 text-4xl">
          📱
        </div>

        <h3 className="text-2xl font-semibold mb-3">Add AskBen to Your Home Screen</h3>
        
        <p className="text-zinc-600 mb-6">
          Get quick access to your financial triage, daily priorities, and Ben’s advice anytime.
        </p>

        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3.5 rounded-2xl mb-4 transition-all"
          >
            Install App Now
          </button>
        ) : (
          <div className="bg-white/70 rounded-2xl p-5 mb-5 text-left text-sm border border-white/60">
            <strong>Safari users:</strong> Tap the Share button <span className="text-lg">⎙</span> then{" "}
            <strong>“Add to Home Screen”</strong>
          </div>
        )}

        <button
          onClick={handleDismiss}
          className="text-xs text-zinc-500 hover:text-zinc-700 underline"
        >
          Dismiss — Don’t show again
        </button>
      </div>
    </div>
  );
}
