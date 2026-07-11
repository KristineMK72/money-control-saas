import crypto from "crypto";

export function hashIp(ip: string | null) {
  if (!ip || ip === "unknown") return null;

  const salt = process.env.IP_HASH_SALT || "askben-local-salt";

  return crypto
    .createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex");
}

export function detectVisitorRisk(userAgent: string, pathname: string) {
  let riskScore = 0;
  const reasons: string[] = [];

  const ua = userAgent.toLowerCase();

  const botWords = [
    "bot",
    "crawl",
    "spider",
    "scrape",
    "curl",
    "wget",
    "python",
    "httpclient",
    "headless",
    "phantom",
  ];

  if (botWords.some((word) => ua.includes(word))) {
    riskScore += 60;
    reasons.push("Bot-like user agent");
  }

  if (!userAgent || userAgent === "unknown") {
    riskScore += 40;
    reasons.push("Missing user agent");
  }

  const sensitivePaths = [
    "/login",
    "/signup",
    "/api",
    "/admin",
    "/dashboard/visitors",
  ];

  if (sensitivePaths.some((path) => pathname.startsWith(path))) {
    riskScore += 10;
    reasons.push("Sensitive path visited");
  }

  return {
    riskScore,
    isBot: riskScore >= 60,
    isSuspicious: riskScore >= 40,
    reason: reasons.join(", ") || null,
  };
}
