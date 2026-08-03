/**
 * The Town Crier — public announcements read aloud in the square.
 * Used for the "parchment drop" experience when the app opens.
 */

import type { FinancialSnapshot, TownCrierAnnouncement } from "./types";
import { buildArrivalAnnouncement } from "./speech";
import { generateGreeting } from "./greetings";

/**
 * Produce the main arrival announcement the Town Crier reads
 * when the citizen first opens the app.
 */
export function announceArrival(data: FinancialSnapshot = {}): TownCrierAnnouncement {
  const { lines, actions } = buildArrivalAnnouncement(data);

  return {
    title: "Good morrow!",
    body: lines.join("\n\n"),
    actions,
    dismissible: true,
  };
}

/**
 * Generic town-crier style announcement from a simple message.
 */
export function announce(message: string, title = "Hear ye!"): TownCrierAnnouncement {
  return {
    title,
    body: message,
    dismissible: true,
  };
}

/**
 * Quick helper that pairs a greeting with a short status.
 */
export function crierStatus(data: FinancialSnapshot): TownCrierAnnouncement {
  const greeting = generateGreeting("TownCrier", data);
  const { lines } = buildArrivalAnnouncement(data);

  // Skip the first line if it is already the greeting
  const bodyLines = lines.length > 1 ? lines.slice(1) : lines;

  return {
    title: greeting.title ?? "Hear ye!",
    body: [greeting.text, ...bodyLines].join("\n\n"),
    actions: [
      { label: "Visit Bank", href: "/bank", icon: "🏦" },
      { label: "Visit Payment Hall", href: "/payments", icon: "💰" },
    ],
    dismissible: true,
  };
}
