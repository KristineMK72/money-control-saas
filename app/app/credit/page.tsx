"use client";

import { useState } from "react";

import CreditHealthSection from "./CreditHealthSection";
import CreditRecoverySection from "./CreditRecoverySection";
import DisputeLetterSection from "./DisputeLetterSection";
import GoodwillLetterSection from "./GoodwillLetterSection";

const tabs = [
  { id: "health", label: "Credit Health" },
  { id: "recovery", label: "Recovery Plan" },
  { id: "dispute", label: "Dispute Letter" },
  { id: "goodwill", label: "Goodwill Letter" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function CreditPage() {
  const [activeTab, setActiveTab] = useState<TabId>("health");

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <header className="mb-8">
          <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            AskBen Credit Center
          </div>

          <h1 className="mt-4 text-5xl font-black text-white">
            Credit Center
          </h1>

          <p className="mt-2 text-lg font-semibold text-white/90">
            Credit health, recovery planning, dispute letters, and goodwill letters in one place.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                activeTab === tab.id
                  ? "bg-emerald-400 text-black"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "health" && <CreditHealthSection />}
        {activeTab === "recovery" && <CreditRecoverySection />}
        {activeTab === "dispute" && <DisputeLetterSection />}
        {activeTab === "goodwill" && <GoodwillLetterSection />}
      </div>
    </main>
  );
}
