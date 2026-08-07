"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecoveryStep = "verify" | "password" | "done";

const inputClass =
  "mt-2 w-full rounded-xl border border-white/20 bg-white px-4 py-3 font-bold text-zinc-950 outline-none disabled:opacity-60";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordLoading() {
  return (
    <main className="min-h-screen bg-transparent px-4 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-white/20 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-xl">
        Preparing account recovery...
      </section>
    </main>
  );
}

function ResetPasswordForm() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<RecoveryStep>("verify");
  const [checkingLink, setCheckingLink] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    prepareRecovery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function prepareRecovery() {
    const incomingEmail =
      searchParams.get("email") ??
      window.sessionStorage.getItem("askben.recovery.email");
    const code = searchParams.get("code");

    if (incomingEmail) setEmail(incomingEmail);

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(
          "This older reset link is invalid or expired. Request a new email and use its verification code.",
        );
      } else {
        setStep("password");
        setMessage("Link verified. Choose your new password.");
      }
    }

    setCheckingLink(false);
  }

  async function verifyRecoveryCode(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanEmail = email.trim();
    const cleanToken = token.replace(/\s/g, "");

    if (!cleanEmail || !cleanToken) {
      setMessage("Enter your email and the verification code from your inbox.");
      return;
    }

    setWorking(true);

    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "recovery",
    });

    if (error) {
      setMessage(
        error.code === "otp_expired"
          ? "That code is invalid or expired. Request a fresh email and use the newest code."
          : error.message,
      );
      setWorking(false);
      return;
    }

    setStep("password");
    setMessage("Code verified. Choose your new password.");
    setWorking(false);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setWorking(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setWorking(false);
      return;
    }

    await supabase.auth.signOut();
    setPassword("");
    setConfirmPassword("");
    setStep("done");
    setMessage("Password updated. You can now sign in.");
    setWorking(false);
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-white/20 bg-slate-950/85 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
          Account Recovery
        </p>

        <h1 className="mt-3 text-4xl font-black">
          {step === "verify"
            ? "Enter Your Code"
            : step === "password"
              ? "Choose a New Password"
              : "Password Updated"}
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
          {step === "verify"
            ? "Use the one-time code from your AskBen password reset email."
            : step === "password"
              ? "The code is verified. Make this password sturdy enough for the Treasury."
              : "Your Treasury has a new key."}
        </p>

        {checkingLink ? (
          <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
            Checking reset link...
          </div>
        ) : null}

        {!checkingLink && step === "verify" ? (
          <form onSubmit={verifyRecoveryCode} className="mt-6 grid gap-4">
            <label>
              <span className="text-sm font-black text-white/80">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>

            <label>
              <span className="text-sm font-black text-white/80">
                Verification code
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="one-time-code"
                required
                className={inputClass}
              />
            </label>

            {message ? <Message>{message}</Message> : null}

            <button
              type="submit"
              disabled={working}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {working ? "Verifying..." : "Verify Code"}
            </button>

            <Link
              href="/forgot-password"
              className="text-center text-sm font-black text-yellow-200 hover:underline"
            >
              Request a new code
            </Link>
          </form>
        ) : null}

        {!checkingLink && step === "password" ? (
          <form onSubmit={updatePassword} className="mt-6 grid gap-4">
            <label>
              <span className="text-sm font-black text-white/80">
                New Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </label>

            <label>
              <span className="text-sm font-black text-white/80">
                Confirm Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </label>

            {message ? <Message>{message}</Message> : null}

            <button
              type="submit"
              disabled={working}
              className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {working ? "Saving..." : "Update Password"}
            </button>
          </form>
        ) : null}

        {!checkingLink && step === "done" ? (
          <div className="mt-6 grid gap-4">
            {message ? <Message>{message}</Message> : null}
            <Link
              href="/login"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-center font-black text-black transition hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        ) : null}

        {step !== "done" ? (
          <Link
            href="/login"
            className="mt-5 block text-center text-sm font-black text-yellow-200 hover:underline"
          >
            Back to login
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-50">
      {children}
    </div>
  );
}
