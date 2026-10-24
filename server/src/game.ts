export const ATTRIBUTES = ["koerper", "geist", "disziplin", "finanzen"] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const HABIT_XP = 10;
export const MAX_STREAK_BONUS = 10;
export const QUEST_XP: Record<Difficulty, number> = { easy: 20, medium: 50, hard: 100 };

export const isAttribute = (s: unknown): s is Attribute => ATTRIBUTES.includes(s as Attribute);
export const isDifficulty = (s: unknown): s is Difficulty => DIFFICULTIES.includes(s as Difficulty);

// Level L beginnt bei 50·(L−1)² XP.
export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(xp, 0) / 50)) + 1;
  const start = 50 * (level - 1) ** 2;
  return { xp, level, into: xp - start, need: 50 * level ** 2 - start };
}

export const habitXp = (streak: number) => HABIT_XP + Math.min(Math.max(streak - 1, 0), MAX_STREAK_BONUS);
