"use client";

import { useMemo, useState } from "react";
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

  const mode = "money";

  const context = useMemo(() => {
    return `
This assistant is being used inside Money Control Board.
Focus on bills, weekly targets, due dates, income planning, and bucket funding.
`;
  }, []);

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
          mode,
          messages: nextMessages,
          context,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
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
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Money AI Assistant</h1>
        <p style={styles.subtitle}>
          Ask about bills, weekly funding, daily targets, or what to prioritize.
        </p>

        <div style={styles.chatBox}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.message,
                ...(msg.role === "user" ? styles.user : styles.assistant),
              }}
            >
              <div style={styles.messageLabel}>
                {msg.role === "user" ? "You" : "AI"}
              </div>
              <div>{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.message, ...styles.assistant }}>
              <div style={styles.messageLabel}>AI</div>
              <div>Thinking...</div>
            </div>
          )}
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="What should I fund first this week?"
            style={styles.input}
          />
          <button onClick={sendMessage} disabled={loading} style={styles.button}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f3ee",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 760,
    background: "#ffffff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    color: "#57534e",
  },
  chatBox: {
    height: 440,
    overflowY: "auto",
    borderRadius: 16,
    border: "1px solid #e7e5e4",
    background: "#fafaf9",
    padding: 14,
    marginBottom: 14,
  },
  message: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  user: {
    marginLeft: "auto",
    background: "#dbeafe",
  },
  assistant: {
    marginRight: "auto",
    background: "#f1f5f9",
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    border: "1px solid #d6d3d1",
    padding: "14px 16px",
    fontSize: 16,
    outline: "none",
  },
  button: {
    border: "none",
    borderRadius: 12,
    padding: "14px 18px",
    fontSize: 16,
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
};
