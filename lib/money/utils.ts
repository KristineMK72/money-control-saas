export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKeyFromISO(dateISO: string) {
  return dateISO.slice(0, 7);
}

export function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function daysUntil(dateISO?: string) {
  if (!dateISO) return null;
  const now = new Date();
  const target = new Date(dateISO + "T12:00:00");
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
