"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

export default function ChatPage() {
  const supabase = createSupabaseBrowserClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant" as const,
      content: "Hi — I’m Ben, your Money Control AI. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMessage = { role: "user" as const, content: text };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Your existing AI call logic goes here
      // For now, a placeholder response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: "Got it. Let me check your current situation and give you the best next step.",
          },
        ]);
        setLoading(false);
      }, 800);
    } catch (err) {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent p-4 pb-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/30 shadow-xl">
            <img src="/ben.png" alt="Ben" className="object-cover" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Ask Ben</h1>
            <p className="text-white/70">Your financial co-pilot</p>
          </div>
        </div>

        {/* Chat Container */}
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
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/20 bg-black/80 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="What should I pay first this week?"
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
      </div>
    </main>
  );
}
