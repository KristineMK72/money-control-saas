"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabase } from "@/lib/supabase/provider";

const stressOptions = [
  "Bills piling up",
  "Credit cards",
  "Not enough income",
  "Everything feels chaotic",
  "I don’t know where to start",
];

const goalOptions = [
  "Pay off debt",
  "Catch up on bills",
  "Build savings",
  "Stop overdrafting",
  "Get organized",
];

const voiceOptions = [
  { id: "direct", label: "Direct + No BS" },
  { id: "encouraging", label: "Encouraging + Supportive" },
  { id: "calm", label: "Calm + Neutral" },
  { id: "funny", label: "Funny + Lighthearted" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [primaryStressor, setPrimaryStressor] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [benVoice, setBenVoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep((s) => (s === 3 ? 3 : ((s + 1) as any)));
  const back = () => setStep((s) => (s === 1 ? 1 : ((s - 1) as any)));

  const handleFinish = async () => {
    if (!session?.user) return;

    // Require all fields
    if (!primaryStressor || !primaryGoal || !benVoice) {
      setError("Please complete all steps before finishing.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("user_profile")
      .upsert(
        {
          user_id: session.user.id,
          primary_stressor: primaryStressor,
          primary_goal: primaryGoal,
          ben_voice: benVoice,
          onboarding_complete: true, // ⭐ REQUIRED
        },
        { onConflict: "user_id" }
      );

    console.log("UPSERT RESULT:", { data, error });

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Couldn’t save your profile. Try again.");
      return;
    }

    // ⭐ Now that onboarding is complete, go to dashboard
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Let’s get Ben calibrated.
          </h1>
          <p className="text-sm text-zinc-400">
            Three quick questions so Ben can talk to you like a real coach, not a spreadsheet.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-emerald-400" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">
                What’s stressing you out the most right now?
              </h2>
              <p className="text-xs text-zinc-400">
                No judgment. This just helps Ben understand what feels loudest.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {stressOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPrimaryStressor(opt)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                    primaryStressor === opt
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">
                What’s your #1 goal right now?
              </h2>
              <p className="text-xs text-zinc-400">
                This shapes how Ben prioritizes your plan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {goalOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPrimaryGoal(opt)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                    primaryGoal === opt
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">
                How do you want Ben to talk to you?
              </h2>
              <p className="text-xs text-zinc-400">
                Same data, different tone. You’re in control.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {voiceOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBenVoice(opt.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                    benVoice === opt.id
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
