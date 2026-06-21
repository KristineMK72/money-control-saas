export function toCents(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number) {
  return Math.round(cents) / 100;
}

export function clampMoney(value: unknown) {
  return fromCents(toCents(value));
}

export function addMoney(values: unknown[]) {
  return fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
}

export function subtractMoney(a: unknown, b: unknown) {
  return fromCents(toCents(a) - toCents(b));
}

export function money(value: unknown) {
  return clampMoney(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
