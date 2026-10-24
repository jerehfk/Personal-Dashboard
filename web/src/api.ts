import type { AttrKey, DiffKey } from "./meta";

export interface Habit {
  id: number;
  name: string;
  attribute: AttrKey;
  archived: boolean;
  doneToday: boolean;
  current: number;
  longest: number;
  total: number;
  dates: string[];
}

export interface Quest {
  id: number;
  name: string;
  attribute: AttrKey;
  difficulty: DiffKey;
  xp: number;
  doneAt: string | null;
}

interface Level {
  xp: number;
  level: number;
  into: number;
  need: number;
}
export interface Character extends Level {
  attributes: (Level & { key: AttrKey })[];
}

export interface Stats {
  heatmap: { date: string; xp: number }[];
}

// Lokales Datum des Geräts (nicht UTC), damit "heute" stimmt.
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "/api" : "");

export class Unauthorized extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token") ?? "";
  const res = await fetch(BASE + path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
  });
  if (res.status === 401) throw new Unauthorized();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const post = (path: string, body?: object) => call<{ xp: number }>(path, { method: "POST", body: body && JSON.stringify(body) });

export const api = {
  habits: () => call<Habit[]>(`/habits?today=${localDate()}`),
  quests: () => call<Quest[]>("/quests"),
  character: () => call<Character>("/character"),
  stats: () => call<Stats>(`/stats?today=${localDate()}`),
  addHabit: (name: string, attribute: AttrKey) => post("/habits", { name, attribute }),
  archiveHabit: (id: number) => call(`/habits/${id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) }),
  check: (id: number, date: string, done: boolean) => call<{ xp: number }>(`/habits/${id}/checkins/${date}`, { method: done ? "PUT" : "DELETE" }),
  addQuest: (name: string, attribute: AttrKey, difficulty: DiffKey) => post("/quests", { name, attribute, difficulty }),
  completeQuest: (id: number) => post(`/quests/${id}/complete`, { date: localDate() }),
  reopenQuest: (id: number) => post(`/quests/${id}/reopen`),
  deleteQuest: (id: number) => call(`/quests/${id}`, { method: "DELETE" }),
};
