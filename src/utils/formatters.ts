export function formatPowerRating(power: string | null | undefined): string {
  if (!power) return '-';
  const p = power.trim();
  if (p.toLowerCase().includes('kw')) return p;
  return `${p} kW`;
}
