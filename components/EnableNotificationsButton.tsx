"use client";

import { useState } from "react";

export default function EnableNotificationsButton() {
  const [enabled, setEnabled] = useState(false);

  const enableNotifications = async () => {
    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Notifications not enabled");
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      console.log("Service worker registered:", registration);

      setEnabled(true);

      alert("✅ Notifications enabled! Ben will remind you about bills.");
    } catch (err) {
      console.error(err);
      alert("Error enabling notifications");
    }
  };

  return (
    <button
      onClick={enableNotifications}
      style={{
        background: "#111827",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 999,
        border: "none",
        fontWeight: 700,
        cursor: "pointer",
        marginTop: 10,
      }}
    >
      {enabled ? "Notifications Enabled ✅" : "Turn on Bill Reminders 🔔"}
    </button>
  );
}
