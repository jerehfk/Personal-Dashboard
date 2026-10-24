import { localDate, type Stats } from "./api";

const level = (xp: number) => (xp <= 0 ? 0 : xp <= 10 ? 1 : xp <= 30 ? 2 : xp <= 60 ? 3 : 4);

// 53 Wochen als Spalten, Montag oben. Intensität = XP des Tages.
export function Heatmap({ stats }: { stats: Stats }) {
  const xpByDate = new Map(stats.heatmap.map((h) => [h.date, h.xp]));
  const today = new Date();
  today.setHours(12);
  const offset = (today.getDay() + 6) % 7; // Mo=0
  const cols: { date: string; xp: number }[][] = [];
  for (let w = 52; w >= 0; w--) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - w * 7 - offset + d);
      if (day > today) continue;
      const date = localDate(day);
      col.push({ date, xp: xpByDate.get(date) ?? 0 });
    }
    cols.push(col);
  }
  return (
    <div className="heatmap" role="img" aria-label="XP der letzten 12 Monate">
      {cols.map((col, i) => (
        <div key={i} className="col">
          {col.map((c) => (
            <span key={c.date} className={`cell l${level(c.xp)}`} title={`${c.date}: ${c.xp} XP`} />
          ))}
        </div>
      ))}
    </div>
  );
}
