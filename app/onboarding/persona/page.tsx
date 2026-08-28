"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BEN_PERSONAS, type BenPersonaId } from "@/lib/ben/personas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PersonaOnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [selected, setSelected] = useState<BenPersonaId>("encouraging");
  const [checkingUser, setCheckingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        router.replace("/login?next=/onboarding/persona");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("ben_voice")
        .eq("user_id", user.id)
        .maybeSingle<{ ben_voice?: string | null }>();

      if (!active) return;
      if (BEN_PERSONAS.some((persona) => persona.id === data?.ben_voice)) {
        setSelected(data?.ben_voice as BenPersonaId);
      }
      setCheckingUser(false);
    }

    void loadUser();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function continueToTown() {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login?next=/onboarding/persona");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        ben_voice: selected,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    window.location.assign("/bills?welcome=1");
  }

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#100906] text-[#d6b85f]">
        <p className="font-cinzel text-sm uppercase tracking-[0.25em]">Preparing Ben’s counsel…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#3b2416_0%,#160c08_48%,#080504_100%)] px-4 py-12 text-[#f5e6c8]">
      <section className="mx-auto max-w-5xl rounded-3xl border border-[#c9a84c]/40 bg-black/55 p-6 shadow-2xl backdrop-blur sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-cinzel text-xs font-bold uppercase tracking-[0.35em] text-[#c9a84c]">
            Choose thy counselor
          </p>
          <h1 className="mt-3 font-cinzel text-4xl font-bold sm:text-5xl">How should Ben speak with you?</h1>
          <p className="mt-4 text-lg text-[#d6c09a]">
            The numbers stay honest. You choose the voice that makes them easiest to face.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {BEN_PERSONAS.map((persona) => {
            const isSelected = selected === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setSelected(persona.id)}
                aria-pressed={isSelected}
                className="rounded-2xl p-5 text-left transition"
                style={{
                  background: isSelected ? "rgba(201,168,76,.18)" : "rgba(20,12,8,.78)",
                  border: isSelected ? "2px solid #c9a84c" : "1px solid rgba(201,168,76,.28)",
                  boxShadow: isSelected ? "0 0 28px rgba(201,168,76,.14)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{persona.emoji}</span>
                  <div>
                    <h2 className="font-cinzel text-xl font-bold text-[#f5e6c8]">{persona.label}</h2>
                    <p className="text-sm font-semibold text-[#c9a84c]">{persona.shortDescription}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#d6c09a]">{persona.longDescription}</p>
                <p className="mt-4 border-l-2 border-[#c9a84c]/50 pl-3 italic text-[#f5e6c8]">
                  “{persona.sampleLines[0]}”
                </p>
              </button>
            );
          })}
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-center text-sm text-red-200">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={continueToTown}
          disabled={saving}
          className="mx-auto mt-8 block w-full max-w-md rounded-xl bg-[#c9a84c] px-6 py-4 font-cinzel text-lg font-bold text-[#1a0f0a] shadow-lg disabled:opacity-60"
        >
          {saving ? "Recording thy choice…" : "Meet Ben at the ledger →"}
        </button>
        <p className="mt-3 text-center text-sm text-[#9a7d5a]">Voice first, then one bill. The town can wait until the ledger has something to say. You can change Ben later in Settings.</p>
      </section>
    </main>
  );
}
