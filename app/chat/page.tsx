"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type BenMasterRow = {
  user_id: string;
  month?: string;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  bills?: number | string | null;
  total_bills?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  net?: number | string | null;
  pressure_pct?: number | string | null;
  total_debt?: number | string | null;
  total_debt_balance?: number | string | null;
  total_debt_minimums?: number | string | null;
  monthly_minimums?: number | string | null;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function buildFinancialSummary(master: BenMasterRow | null) {
  if (!master) {
    return "No monthly financial snapshot found yet.";
  }

  const income = num(master.total_income);
  const spend = num(master.total_spend);
  const bills = num(master.total_bills ?? master.bills);
  const payments = num(master.payments);
  const debt = num(master.total_debt_balance ?? master.total_debt);
  const minimums = num(master.total_debt_minimums ?? master.monthly_minimums);
  const net = num(master.net ?? master.leftover);
  const pressure = num(master.pressure_pct);

  return `
Current month snapshot:
- Income logged so far: ${money(income)}
- Spend logged so far: ${money(spend)}
- Monthly bills: ${money(bills)}
- Payments logged this month: ${money(payments)}
- Total debt balance: ${money(debt)}
- Monthly debt minimums: ${money(minimums)}
- Net after spend, bills, and debt minimums: ${money(net)}
- Debt pressure: ${pressure.toFixed(1)}%
`.trim();
}

export default function ChatPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Good morrow, friend. I am Benjamin Franklin, at thy service in matters of coin and prudence. How may I assist thee this day?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<BenMasterRow | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function loadSnapshot() {
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
        setNotice("Log in to let Ben see your monthly money snapshot.");
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

      const { data, error } = await supabase
        .from("ben_master_monthly")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) {
        setNotice(error.message);
        return;
      }

      setSnapshot((data || null) as BenMasterRow | null);
    }

    void loadSnapshot();
  }, [supabase]);

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();

    if (!text || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "money",
          messages: newMessages,
          financialSummary: buildFinancialSummary(snapshot),
          context:
            "Speak as Benjamin Franklin with light colonial flavor. Use phrases like verily, pray tell, good friend, thy, and hath occasionally, but keep the advice clear, modern, and practical. Do not overdo the accent. Help the user make safe financial decisions.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Ben could not answer right now.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.reply ||
            "Forgive me, friend. My thoughts are unclear at present.",
        },
      ]);
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
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/30 shadow-xl">
            <img
              src="/ben.png"
              alt="Benjamin Franklin"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-4xl font-black text-white">Ask Ben</h1>
            <p className="text-white/75">
              Benjamin Franklin’s Counsel on Money
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm font-semibold text-amber-950 shadow-xl">
            {notice}
          </div>
        )}

        <div className="flex h-[65vh] flex-col overflow-hidden rounded-3xl border border-white/20 bg-black/70 shadow-2xl backdrop-blur-2xl">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm font-semibold leading-relaxed shadow-lg md:text-base ${
                    msg.role === "user"
                      ? "rounded-br-none bg-yellow-400 text-zinc-950"
                      : "rounded-bl-none bg-white/95 text-zinc-950"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-3xl rounded-bl-none bg-white/95 px-5 py-4 text-zinc-950">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-150" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-300" />
                  <span className="ml-2 text-sm text-zinc-500">
                    Ben is thinking...
                  </span>
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
                  if (e.key === "Enter") {
                    void sendMessage();
                  }
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
