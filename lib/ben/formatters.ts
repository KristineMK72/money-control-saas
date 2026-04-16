export function formatUSD(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}
