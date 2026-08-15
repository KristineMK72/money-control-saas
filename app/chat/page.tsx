"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clampMoney, money } from "@/lib/money/math";
import {
  currentMonthStartISO,
  daysUntil,
  isWithinNextDays,
  nextDateFromDueDay,
  todayLocalISO,
} from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";
import { trackEvent } from "@/lib/admin/trackEvent";
import { speakBen } from "@/lib/sounds";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Good morrow, friend. I am Benjamin Franklin, at thy service in matters of coin and prudence. Ask me what to pay first, what is due soon, or how to steady thy finances this week.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [moneyContext, setMoneyContext] = useState<{
    bills: any[];
    debts: any[];
    payments: any[];
    master: any;
  }>({ bills: [], debts: [], payments: [], master: null });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function loadMoneyContext() {
      setNotice("");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        setNotice(sessionError.message);
        return;
      }
      const user = session?.user;
      if (!user) {
        setNotice("Log in to let Ben see your money snapshot.");
        return;
      }
      const monthStart = currentMonthStartISO();
      const [masterResult, billsResult, debtsResult, paymentsResult] =
        await Promise.all([
          supabase
            .from("ben_master_monthly")
            .select("*")
            .eq("user_id", user.id)
            .gte("month", monthStart)
            .order("month", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("bills")
            .select("*")
            .eq("user_id", user.id)
            .order("due_date", { ascending: true, nullsFirst: false }),
          supabase
            .from("debts")
            .select("*")
            .eq("user_id", user.id)
            .order("due_date", { ascending: true, nullsFirst: false }),
          supabase.from("payments").select("*").eq("user_id", user.id),
        ]);
      if (masterResult.error || billsResult.error || debtsResult.error || paymentsResult.error) {
        setNotice("Could not load full money context.");
        return;
      }
      setMoneyContext({
        master: masterResult.data || null,
        bills: billsResult.data || [],
        debts: debtsResult.data || [],
        payments: paymentsResult.data || [],
      });
    }
    void loadMoneyContext();
  }, [supabase]);

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "money",
          messages: newMessages,
          financialSummary: JSON.stringify({
            bills: moneyContext.bills.length,
            debts: moneyContext.debts.length,
            payments: moneyContext.payments.length,
            master: moneyContext.master,
          }),
          context:
            "You are Benjamin Franklin, a wise practical financial triage advisor. Be specific and helpful.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ben could not answer right now.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ||
            "Forgive me, friend. My thoughts are unclear at present.",
        },
      ]);
      trackEvent("ask_ben", { prompt_len: text.length });
    } catch (err) {
      console.error("AskBen chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Forgive me, good friend. The wires between us are troubled. Pray ask again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const hasData =
    !!moneyContext.master ||
    moneyContext.bills.length > 0 ||
    moneyContext.debts.length > 0 ||
    moneyContext.payments.length > 0;

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/30 shadow-xl">
            <img src="/ben.png" alt="Benjamin Franklin" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Ask Ben</h1>
            <p className="text-white/75">Benjamin Franklin&apos;s Counsel on Money</p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm font-semibold text-amber-950 shadow-xl">
            {notice}
          </div>
        )}

        {!notice && (
          <div className="mb-4 rounded-2xl border border-white/15 bg-black/45 p-4 text-sm font-semibold text-white/80 shadow-xl backdrop-blur-xl">
            {hasData
              ? `Ben can currently see ${moneyContext.bills.length} bill(s), ${moneyContext.debts.length} debt(s), ${moneyContext.payments.length} payment(s).`
              : "Ben is connected, but no money rows were found yet."}
          </div>
        )}

        <div className="flex h-[65vh] flex-col overflow-hidden rounded-3xl border border-white/20 bg-black/70 shadow-2xl backdrop-blur-2xl">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm font-semibold leading-relaxed shadow-lg md:text-base ${
                    msg.role === "user"
                      ? "rounded-br-none bg-yellow-400 text-zinc-950"
                      : "rounded-bl-none bg-white/95 text-zinc-950"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speakBen(msg.content)}
                      className="mt-3 block rounded-full border border-amber-700/25 bg-amber-100 px-3 py-1 text-xs font-black text-amber-900"
                      aria-label="Read Ben's response aloud"
                    >
                      🔊 Hear Ben
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-3xl rounded-bl-none bg-white/95 px-5 py-4 text-zinc-950">
                  <span className="text-sm text-zinc-500">Ben is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-white/20 bg-black/80 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendMessage();
                }}
                placeholder="What should I pay first, good sir?"
                className="flex-1 rounded-2xl bg-white/90 px-6 py-4 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={loading}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-yellow-400 px-8 font-black text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "What should I pay first this week?",
            "What is due in the next 7 days?",
            "Give me a 7-day survival plan, good sir.",
            "How much coin must I earn daily?",
            "What is my greatest risk at present?",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={loading}
              className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
