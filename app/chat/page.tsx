"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/ai/types";

type SummaryData = {
  next7BillsTotal: number;
  next14BillsTotal: number;
  next7IncomeTotal: number;
  shortfall7: number;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi — I can help you decide what to pay first, estimate your 7-day risk, and turn your bills into a practical plan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  function stressLabel(score: number | null) {
    if (score === null) return "Loading";
    if (score >= 80) return "Safe";
    if (score >= 60) return "Stable";
    if (score >= 40) return "Tight";
    if (score >= 20) return "High stress";
    return "Critical";
  }

  async function sendToAI(nextMessages: ChatMessage[]) {
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

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    if (typeof data.stressScore === "number") {
      setStressScore(data.stressScore);
    }

    if (data.summary) {
      setSummary(data.summary);
    }

    return data;
  }

  async function sendMessage(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await sendToAI(nextMessages);

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            data.reply || "Sorry, I couldn’t generate a response.",
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while generating your money plan.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialOutlook() {
      setLoading(true);

      try {
        const starterMessages: ChatMessage[] = [
          {
            role: "user",
            content:
              "Give me my 7-day outlook, stress level, and what I should focus on first.",
          },
        ];

        const data = await sendToAI(starterMessages);

        setMessages([
          {
            role: "assistant",
            content:
              data.reply ||
              "I couldn’t load your 7-day outlook yet.",
          },
        ]);
      } catch (error) {
        setMessages([
          {
            role: "assistant",
            content:
              "I couldn’t load your financial outlook yet. Try asking what you should pay first.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadInitialOutlook();
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Money Control Board</div>
            <h1 style={styles.title}>Money AI Assistant</h1>
            <p style={styles.subtitle}>
              Ask about bills, weekly funding, daily targets, or what to prioritize.
            </p>
          </div>
        </div>

        <div style={styles.forecastCard}>
          <div style={styles.forecastTop}>
            <div>
              <div style={styles.forecastTitle}>Financial Radar</div>
              <div style={styles.forecastSub}>
                Your forward-looking money snapshot for the next 7 to 14 days.
              </div>
            </div>

            <div style={styles.scoreCard}>
              <div style={styles.scoreLabel}>Stress Score</div>
              <div style={styles.scoreValue}>
                {stressScore !== null ? stressScore : "—"}
              </div>
              <div style={styles.scoreHint}>{stressLabel(stressScore)}</div>
            </div>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Bills next 7 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next7BillsTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Bills next 14 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next14BillsTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Income next 7 days</div>
              <div style={styles.statValue}>
                ${summary ? summary.next7IncomeTotal.toFixed(2) : "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>7-day shortfall</div>
              <div style={styles.statValue}>
                ${summary ? summary.shortfall7.toFixed(2) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.quickRow}>
          <button
            type="button"
            style={styles.quickBtn}
            onClick={() => sendMessage("What should I pay first?")}
            disabled={loading}
          >
            What should I pay first?
          </button>

          <button
            type="button"
            style={styles.quickBtn}
            onClick={() => sendMessage("Give me a 7-day survival plan.")}
            disabled={loading}
          >
            7-day survival plan
          </button>

          <button
            type="button"
            style={styles.quickBtn}
            onClick={() =>
              sendMessage("How much do I need to earn per day this week?")
            }
            disabled={loading}
          >
            Daily target
          </button>
        </div>

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
              <div style={styles.messageText}>{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.message, ...styles.assistant }}>
              <div style={styles.messageLabel}>AI</div>
              <div style={styles.messageText}>Thinking...</div>
            </div>
          )}
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            placeholder="Ask what to pay first, your 7-day risk, or your daily target..."
            style={styles.input}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading}
            style={styles.button}
          >
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
    background:
      "linear-gradient(180deg, #f8f5ef 0%, #f4efe7 100%)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 960,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8a7f73",
    marginBottom: 8,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.05,
    color: "#1c1917",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: "#57534e",
    fontSize: 15,
  },
  forecastCard: {
    border: "1px solid #e7e5e4",
    borderRadius: 18,
    background: "#fafaf9",
    padding: 18,
    marginBottom: 16,
  },
  forecastTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  forecastTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#78716c",
    fontWeight: 700,
    marginBottom: 6,
  },
  forecastSub: {
    color: "#57534e",
    fontSize: 14,
    maxWidth: 520,
  },
  scoreCard: {
    minWidth: 140,
    borderRadius: 16,
    padding: 14,
    background: "#ffffff",
    border: "1px solid #e7e5e4",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#78716c",
    marginBottom: 6,
    fontWeight: 700,
  },
  scoreValue: {
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 800,
    color: "#1c1917",
  },
  scoreHint: {
    marginTop: 6,
    fontSize: 13,
    color: "#57534e",
    fontWeight: 600,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #ece7df",
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: "#78716c",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 700,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1c1917",
  },
  quickRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  quickBtn: {
    border: "1px solid #d6d3d1",
    borderRadius: 999,
    padding: "10px 14px",
    background: "#fff",
    color: "#1c1917",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  chatBox: {
    height: 430,
    overflowY: "auto",
    borderRadius: 18,
    border: "1px solid #e7e5e4",
    background: "#fcfcfb",
    padding: 16,
    marginBottom: 14,
  },
  message: {
    maxWidth: "88%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  },
  user: {
    marginLeft: "auto",
    background: "#dbeafe",
  },
  assistant: {
    marginRight: "auto",
    background: "#f3f4f6",
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 6,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 1.5,
    color: "#111827",
  },
  inputRow: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    border: "1px solid #d6d3d1",
    padding: "14px 16px",
    fontSize: 16,
    outline: "none",
    background: "#fff",
  },
  button: {
    border: "none",
    borderRadius: 14,
    padding: "14px 18px",
    fontSize: 16,
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
};
