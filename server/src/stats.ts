// Datumsstrings (YYYY-MM-DD) werden als UTC-Tage behandelt, damit keine Zeitzonen-/DST-Fehler entstehen.
const DAY = 86_400_000;

export const toDay = (s: string) => Date.parse(s + "T00:00:00Z") / DAY;
export const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && fromDay(toDay(s)) === s;
}

export interface Streaks {
  current: number;
  longest: number;
}

// Aktuelle Serie zählt auch, wenn heute noch nicht abgehakt ist, aber gestern.
export function computeStreaks(dates: string[], today: string): Streaks {
  const days = [...new Set(dates)].map(toDay).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const set = new Set(days);
  const t = toDay(today);
  let d = set.has(t) ? t : t - 1;
  let current = 0;
  while (set.has(d)) {
    current++;
    d--;
  }
  return { current, longest };
}
