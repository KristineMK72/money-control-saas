export function toCents(value: unknown): number {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }

  return Math.round(cents) / 100;
}

export function clampMoney(value: unknown): number {
  return fromCents(toCents(value));
}

export function addMoney(values: unknown[]): number {
  const totalCents = values.reduce<number>((sum, value) => {
    return sum + toCents(value);
  }, 0);

  return fromCents(totalCents);
}

export function subtractMoney(a: unknown, b: unknown): number {
  return fromCents(toCents(a) - toCents(b));
}

export function money(value: unknown): string {
  return clampMoney(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
