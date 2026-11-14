const DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];

/** "Vineri, 14 nov." (+ year if it's not the current one) */
export function formatDate(ms: number) {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

/** "14 nov." — compact, for chart labels */
export function formatShortDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 3_900_000 -> "1h 05m", 125_000 -> "2m" */
export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Live timer: "12:05" or "1:02:09" */
export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 62.5 -> "62.5", 60 -> "60" */
export function formatWeight(w: number | null | undefined) {
  if (w == null) return '0';
  return String(Math.round(w * 100) / 100);
}

export function formatSet(weight: number | null, reps: number | null) {
  if (!weight) return `${reps ?? 0} rep.`;
  return `${formatWeight(weight)} kg × ${reps ?? 0}`;
}

/** 12345 -> "12.345 kg" */
export function formatVolume(kg: number) {
  return `${Math.round(kg).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kg`;
}

/** Parses user input, accepting both "62,5" and "62.5". Empty -> null. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Estimated one-rep max (Epley formula). */
export function estimate1RM(weight: number | null, reps: number | null) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** "azi", "ieri", "acum 3 zile", otherwise the full date. */
export function formatRelativeDay(ms: number) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(ms))) / 86_400_000);
  if (days <= 0) return 'azi';
  if (days === 1) return 'ieri';
  if (days < 7) return `acum ${days} zile`;
  return formatDate(ms);
}
