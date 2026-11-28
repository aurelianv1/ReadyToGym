const DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];

export function formatDate(ms: number) {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export function formatShortDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatTime(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatWeight(w: number | null | undefined) {
  if (w == null) return '0';
  return String(Math.round(w * 100) / 100);
}

export function formatSet(weight: number | null, reps: number | null) {
  if (!weight) return `${reps ?? 0} rep.`;
  return `${formatWeight(weight)} kg × ${reps ?? 0}`;
}

export function formatVolume(kg: number) {
  return `${Math.round(kg).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kg`;
}

export function parseNumber(text: string): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function estimate1RM(weight: number | null, reps: number | null) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function formatRelativeDay(ms: number) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(ms))) / 86_400_000);
  if (days <= 0) return 'azi';
  if (days === 1) return 'ieri';
  if (days < 7) return `acum ${days} zile`;
  return formatDate(ms);
}

export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDay(key: string, delta: number) {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

export function formatDayLabel(key: string) {
  const today = dayKey();
  if (key === today) return 'Azi';
  if (key === shiftDay(today, -1)) return 'Ieri';
  if (key === shiftDay(today, 1)) return 'Mâine';
  return formatDate(parseDayKey(key).getTime());
}

export function formatGrams(g: number) {
  if (g < 10) return String(Math.round(g * 10) / 10);
  return String(Math.round(g));
}
