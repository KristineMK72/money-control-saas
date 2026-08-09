"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BEN_PERSONAS, type BenPersonaId } from "@/lib/ben/personas";

export default function PersonaOnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [selected, setSelected] = useState<BenPersonaId>("encouraging");
  const [saving, setSaving] = useState(false);

  async function saveAndContinue() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          ben_voice: selected,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    setSaving(false);
    router.push("/world");
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5e6c8] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#c9a84c] mb-2">
            Franklin’s Landing
          </p>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Meet Ben
          </h1>
          <p className="text-[#d6c09a] text-lg">
            Choose how you’d like him to speak with you. You can change this anytime in Settings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {BEN_PERSONAS.map((persona) => {
            const isSelected = selected === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setSelected(persona.id)}
                className="text-left rounded-2xl p-5 transition border"
                style={{
                  background: isSelected
                    ? "rgba(201,168,76,0.15)"
                    : "rgba(15,23,42,0.7)",
                  borderColor: isSelected
                    ? "#c9a84c"
                    : "rgba(148,163,184,0.25)",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{persona.emoji}</span>
                  <span className="font-bold text-lg text-[#f5e6c8]">
                    {persona.label}
                  </span>
                </div>
                <p className="text-sm text-[#d6c09a] mb-3">
                  {persona.shortDescription}
                </p>
                <p className="text-xs italic text-[#c9a84c]">
                  “{persona.sampleLines[0]}”
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={saveAndContinue}
          disabled={saving}
          className="mt-10 w-full rounded-xl py-4 font-bold text-lg disabled:opacity-60"
          style={{ background: "#c9a84c", color: "#1a0f0a" }}
        >
          {saving ? "Saving…" : "Continue to Franklin’s Landing →"}
        </button>
      </div>
    </main>
  );
}
