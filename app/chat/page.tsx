"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Good morrow, friend. I am Benjamin Franklin, at thy service in matters of coin and prudence. How may I assist thee this day?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // TODO: Call your real /api/ai endpoint with Franklin-style prompt
      // For now using a placeholder with Franklin voice
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Verily, my friend. Thou hast asked a question of great import. Let us examine thy ledger with care. What sums are due in the coming days, and what coin hast thou at hand? I shall advise thee as a prudent man ought.",
          },
        ]);
        setLoading(false);
      }, 1200);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Forgive me, the wires between us are troubled. Pray ask again." },
      ]);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/30 shadow-xl">
            <img src="/ben.png" alt="Benjamin Franklin" className="object-cover" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Ask Ben</h1>
            <p className="text-white/70">Benjamin Franklin’s Counsel on Money</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="rounded-3xl border border-white/20 bg-black/70 backdrop-blur-2xl shadow-2xl h-[65vh] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                    msg.role === "user"
                      ? "bg-yellow-400 text-zinc-950 rounded-br-none"
                      : "bg-white/95 text-zinc-950 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/95 text-zinc-950 rounded-3xl rounded-bl-none px-5 py-4 flex items-center gap-3">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-150"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 delay-300"></div>
                  <span className="ml-2 text-sm text-zinc-500">Ben is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/20 bg-black/80 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="What should I pay first, good sir?"
                className="flex-1 rounded-2xl bg-white/90 px-6 py-4 text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-yellow-400 px-8 font-black text-zinc-950 hover:bg-yellow-300 transition disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "What should I pay first this week?",
            "Give me a 7-day survival plan, good sir.",
            "How much coin must I earn daily?",
            "What is my greatest risk at present?",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm hover:bg-white/20 transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
