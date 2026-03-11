"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/ai/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I’m your AI assistant. What do you need help with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<{
    next7BillsTotal: number;
    next14BillsTotal: number;
    next7IncomeTotal: number;
    shortfall7: number;
  } | null>(null);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
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
          messages: nextMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

      if (typeof data.stressScore === "number") {
        setStressScore(data.stressScore);
      }

      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong while generating a reply.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Money AI Assistant</h1>

      {stressScore !== null && (
        <div style={{ marginBottom: 12 }}>
          <strong>Stress Score:</strong> {stressScore}
        </div>
      )}

      {summary && (
        <div style={{ marginBottom: 16 }}>
          <div>Next 7 days bills: ${summary.next7BillsTotal.toFixed(2)}</div>
          <div>Next 14 days bills: ${summary.next14BillsTotal.toFixed(2)}</div>
          <div>Next 7 days income: ${summary.next7IncomeTotal.toFixed(2)}</div>
          <div>Shortfall: ${summary.shortfall7.toFixed(2)}</div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="What should I pay first?"
          style={{ flex: 1, padding: 12 }}
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </main>
  );
}
