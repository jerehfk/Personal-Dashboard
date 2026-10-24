import { useEffect } from "react";

export interface BurstData {
  id: number;
  x: number;
  y: number;
  big: boolean;
  label?: string;
}

const COLORS = ["#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#a78bfa", "#f87171"];

// Konfetti-Explosion (und optional "+XP"-Text) an einer Bildschirmposition; entfernt sich selbst.
export function Burst({ data, onDone }: { data: BurstData; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(data.id), 1300);
    return () => clearTimeout(t);
  }, [data.id, onDone]);

  const n = data.big ? 36 : 14;
  const reach = data.big ? 220 : 70;
  return (
    <div className="burst" style={{ left: data.x, top: data.y }} aria-hidden="true">
      {data.label && <b className="xp-float">{data.label}</b>}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = reach * (0.5 + Math.random() * 0.6);
        return (
          <span
            key={i}
            style={
              {
                "--dx": `${Math.cos(angle) * dist}px`,
                "--dy": `${Math.sin(angle) * dist - (data.big ? 40 : 10)}px`,
                "--rot": `${Math.round(Math.random() * 720 - 360)}deg`,
                background: COLORS[i % COLORS.length],
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
