export function todayLocalISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function currentMonthStartISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function daysUntil(value?: string | null) {
  if (!value) return null;

  const clean = value.slice(0, 10);
  const target = new Date(`${clean}T00:00:00`);
  const today = new Date(`${todayLocalISO()}T00:00:00`);

  if (Number.isNaN(target.getTime())) return null;

  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function nextDateFromDueDay(dueDay?: number | string | null) {
  const day = Number(dueDay);
  if (!day || day < 1 || day > 31) return null;

  const today = new Date(`${todayLocalISO()}T00:00:00`);
  const year = today.getFullYear();
  const month = today.getMonth();

  const thisMonthLastDay = new Date(year, month + 1, 0).getDate();
  let due = new Date(year, month, Math.min(day, thisMonthLastDay));

  if (due < today) {
    const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
    due = new Date(year, month + 1, Math.min(day, nextMonthLastDay));
  }

  return due.toISOString().slice(0, 10);
}

export function isWithinNextDays(date?: string | null, daysAhead = 7) {
  const days = daysUntil(date);
  return days !== null && days >= 0 && days <= daysAhead;
}

export function isOverdue(date?: string | null) {
  const days = daysUntil(date);
  return days !== null && days < 0;
}
