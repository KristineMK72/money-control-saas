"use client";

import { useEffect, useState } from "react";

export default function InstallBanner({ inline = true }: { inline?: boolean }) {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem("installBannerDismissed");
    if (dismissed) return;

    // iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setShow(true);
    }

    // Android / Chrome / Edge
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
        localStorage.setItem("installBannerDismissed", "true");
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("installBannerDismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="mt-8 mb-10 mx-auto max-w-md">
      <div className="rounded-3xl bg-white/90 border border-white/40 backdrop-blur-xl p-6 shadow-2xl text-center text-zinc-950">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-4 text-3xl">
          📱
        </div>

        <h3 className="text-xl font-semibold mb-2">Add AskBen to Home Screen</h3>
        
        <p className="text-sm text-zinc-600 mb-5">
          Get faster access to your daily priorities, forecasts, and Ben’s guidance — always one tap away.
        </p>

        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-2xl mb-3 transition-all active:scale-[0.985]"
          >
            Install App
          </button>
        ) : (
          <div className="text-left text-sm bg-white/70 rounded-2xl p-4 mb-5 border border-white/60">
            <strong>On Safari:</strong> Tap the Share button <span className="text-lg">⎙</span> → 
            <strong>Add to Home Screen</strong>
          </div>
        )}

        <button
          onClick={handleDismiss}
          className="text-xs text-zinc-500 hover:text-zinc-700 underline"
        >
          Don’t show again
        </button>
      </div>
    </div>
  );
}
