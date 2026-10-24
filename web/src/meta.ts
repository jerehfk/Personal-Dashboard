export const ATTRS = {
  koerper: { label: "Körper", icon: "💪", color: "#f87171" },
  geist: { label: "Geist", icon: "🧠", color: "#60a5fa" },
  disziplin: { label: "Disziplin", icon: "🎯", color: "#a78bfa" },
  finanzen: { label: "Finanzen", icon: "💰", color: "#fbbf24" },
} as const;
export type AttrKey = keyof typeof ATTRS;
export const ATTR_KEYS = Object.keys(ATTRS) as AttrKey[];

export const DIFFS = {
  easy: { label: "Leicht", xp: 20 },
  medium: { label: "Mittel", xp: 50 },
  hard: { label: "Schwer", xp: 100 },
} as const;
export type DiffKey = keyof typeof DIFFS;
