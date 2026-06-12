"use client";

import { useState } from "react";

export default function GovernorsOrders() {
  const [orders, setOrders] = useState([
    {
      id: 1,
      text: "Review one debt",
      complete: false,
    },
    {
      id: 2,
      text: "Inspect upcoming obligations",
      complete: false,
    },
    {
      id: 3,
      text: "Record one payment",
      complete: false,
    },
  ]);

  const completed = orders.filter((o) => o.complete).length;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 24,
        padding: 24,
        color: "#111",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900 }}>
        📯 DAILY DISPATCH
      </div>

      <h2
        style={{
          marginTop: 10,
          fontSize: 28,
          fontWeight: 900,
        }}
      >
        Governor's Orders
      </h2>

      <p style={{ marginTop: 8 }}>
        Good morrow, Governor. The Treasury awaits thy guidance.
      </p>

      <div style={{ marginTop: 20 }}>
        {orders.map((order) => (
          <label
            key={order.id}
            style={{
              display: "block",
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={order.complete}
              onChange={() => {
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === order.id
                      ? { ...o, complete: !o.complete }
                      : o
                  )
                );
              }}
            />{" "}
            {order.text}
          </label>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          fontWeight: 800,
        }}
      >
        Progress: {completed}/3
      </div>

      {completed === 3 && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 16,
            background: "#dcfce7",
            fontWeight: 900,
          }}
        >
          🏅 ORDER COMPLETE
          <br />
          The Treasury commends thy diligence.
          <br />
          +75 Reputation
        </div>
      )}
    </div>
  );
}
