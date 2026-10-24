import { existsSync } from "node:fs";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import type { DatabaseSync } from "node:sqlite";
import { computeStreaks, fromDay, isValidDate, toDay } from "./stats.ts";
import { ATTRIBUTES, QUEST_XP, habitXp, isAttribute, isDifficulty, levelFor } from "./game.ts";

const todayUtc = () => new Date().toISOString().slice(0, 10);
// Zeitzonen-Puffer: bis zu einen Tag in der Zukunft, aber kein XP-Farming mit fernen Daten.
const maxDate = () => fromDay(Math.floor(Date.now() / 86_400_000) + 1);

export function buildApp(db: DatabaseSync, password: string, webDir?: string) {
  const app = Fastify();

  const tx = <T>(fn: () => T): T => {
    db.exec("BEGIN");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };

  const character = () => {
    const rows = db.prepare("SELECT attribute, SUM(xp) AS xp FROM xp_events GROUP BY attribute").all() as unknown as { attribute: string; xp: number }[];
    const byAttr = new Map(rows.map((r) => [r.attribute, r.xp]));
    const total = rows.reduce((sum, r) => sum + r.xp, 0);
    return { ...levelFor(total), attributes: ATTRIBUTES.map((key) => ({ key, ...levelFor(byAttr.get(key) ?? 0) })) };
  };

  app.addHook("onRequest", async (req, reply) => {
    const isApi = /^\/(habits|quests|character|stats)(\/|\?|$)/.test(req.url);
    if (!isApi || req.method === "OPTIONS") return;
    if (req.headers.authorization !== `Bearer ${password}`) return reply.code(401).send({ error: "unauthorized" });
  });

  app.get("/health", async () => ({ ok: true }));
  if (webDir && existsSync(webDir)) app.register(fastifyStatic, { root: webDir });

  app.get("/character", async () => character());

  // ---- Gewohnheiten ----
  app.get<{ Querystring: { today?: string } }>("/habits", async (req, reply) => {
    const today = req.query.today ?? todayUtc();
    if (!isValidDate(today)) return reply.code(400).send({ error: "invalid today" });
    const habits = db.prepare("SELECT id, name, attribute, archived_at FROM habits ORDER BY id").all() as unknown as {
      id: number;
      name: string;
      attribute: string;
      archived_at: string | null;
    }[];
    const rows = db.prepare("SELECT habit_id, date FROM checkins").all() as unknown as { habit_id: number; date: string }[];
    const byHabit = new Map<number, string[]>();
    for (const r of rows) byHabit.set(r.habit_id, [...(byHabit.get(r.habit_id) ?? []), r.date]);
    const since = fromDay(toDay(today) - 364);
    return habits.map((h) => {
      const dates = byHabit.get(h.id) ?? [];
      return {
        id: h.id,
        name: h.name,
        attribute: h.attribute,
        archived: h.archived_at !== null,
        doneToday: dates.includes(today),
        ...computeStreaks(dates, today),
        total: dates.length,
        dates: dates.filter((d) => d >= since).sort(),
      };
    });
  });

  app.post<{ Body: { name?: string; attribute?: string } }>("/habits", async (req, reply) => {
    const name = req.body?.name?.trim();
    const attribute = req.body?.attribute ?? "disziplin";
    if (!name) return reply.code(400).send({ error: "name required" });
    if (!isAttribute(attribute)) return reply.code(400).send({ error: "invalid attribute" });
    const r = db.prepare("INSERT INTO habits (name, attribute) VALUES (?, ?)").run(name, attribute);
    return reply.code(201).send({ id: Number(r.lastInsertRowid) });
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; archived?: boolean } }>("/habits/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const { name, archived } = req.body ?? {};
    if (name !== undefined) {
      if (!name.trim()) return reply.code(400).send({ error: "name required" });
      db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(name.trim(), id);
    }
    if (archived !== undefined) {
      db.prepare("UPDATE habits SET archived_at = ? WHERE id = ?").run(archived ? new Date().toISOString() : null, id);
    }
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/habits/:id", async (req) => {
    db.prepare("DELETE FROM habits WHERE id = ?").run(Number(req.params.id));
    return { ok: true };
  });

  app.put<{ Params: { id: string; date: string } }>("/habits/:id/checkins/:date", async (req, reply) => {
    const id = Number(req.params.id);
    const { date } = req.params;
    if (!isValidDate(date) || date > maxDate()) return reply.code(400).send({ error: "invalid date" });
    const habit = db.prepare("SELECT attribute FROM habits WHERE id = ?").get(id) as { attribute: string } | undefined;
    if (!habit) return reply.code(404).send({ error: "not found" });
    return tx(() => {
      const dates = (db.prepare("SELECT date FROM checkins WHERE habit_id = ?").all(id) as unknown as { date: string }[]).map((r) => r.date);
      if (dates.includes(date)) return { xp: 0 };
      db.prepare("INSERT INTO checkins (habit_id, date) VALUES (?, ?)").run(id, date);
      const xp = habitXp(computeStreaks([...dates, date], date).current);
      db.prepare("INSERT INTO xp_events (kind, ref_id, date, attribute, xp) VALUES ('habit', ?, ?, ?, ?)").run(id, date, habit.attribute, xp);
      return { xp };
    });
  });

  app.delete<{ Params: { id: string; date: string } }>("/habits/:id/checkins/:date", async (req, reply) => {
    const id = Number(req.params.id);
    const { date } = req.params;
    if (!isValidDate(date)) return reply.code(400).send({ error: "invalid date" });
    return tx(() => {
      db.prepare("DELETE FROM checkins WHERE habit_id = ? AND date = ?").run(id, date);
      const ev = db.prepare("SELECT xp FROM xp_events WHERE kind = 'habit' AND ref_id = ? AND date = ?").get(id, date) as { xp: number } | undefined;
      db.prepare("DELETE FROM xp_events WHERE kind = 'habit' AND ref_id = ? AND date = ?").run(id, date);
      return { xp: -(ev?.xp ?? 0) };
    });
  });

  // ---- Quests ----
  app.get("/quests", async () => {
    const open = db.prepare("SELECT id, name, attribute, difficulty, done_at FROM quests WHERE done_at IS NULL ORDER BY id").all();
    const done = db.prepare("SELECT id, name, attribute, difficulty, done_at FROM quests WHERE done_at IS NOT NULL ORDER BY done_at DESC, id DESC LIMIT 10").all();
    const withXp = (q: any) => ({ id: q.id, name: q.name, attribute: q.attribute, difficulty: q.difficulty, xp: QUEST_XP[q.difficulty as keyof typeof QUEST_XP], doneAt: q.done_at });
    return [...open, ...done].map(withXp);
  });

  app.post<{ Body: { name?: string; attribute?: string; difficulty?: string } }>("/quests", async (req, reply) => {
    const name = req.body?.name?.trim();
    const { attribute, difficulty = "medium" } = req.body ?? {};
    if (!name) return reply.code(400).send({ error: "name required" });
    if (!isAttribute(attribute)) return reply.code(400).send({ error: "invalid attribute" });
    if (!isDifficulty(difficulty)) return reply.code(400).send({ error: "invalid difficulty" });
    const r = db.prepare("INSERT INTO quests (name, attribute, difficulty) VALUES (?, ?, ?)").run(name, attribute, difficulty);
    return reply.code(201).send({ id: Number(r.lastInsertRowid) });
  });

  app.post<{ Params: { id: string }; Body: { date?: string } }>("/quests/:id/complete", async (req, reply) => {
    const id = Number(req.params.id);
    const date = req.body?.date ?? todayUtc();
    if (!isValidDate(date) || date > maxDate()) return reply.code(400).send({ error: "invalid date" });
    const q = db.prepare("SELECT attribute, difficulty, done_at FROM quests WHERE id = ?").get(id) as
      | { attribute: string; difficulty: keyof typeof QUEST_XP; done_at: string | null }
      | undefined;
    if (!q) return reply.code(404).send({ error: "not found" });
    if (q.done_at) return { xp: 0 };
    return tx(() => {
      const xp = QUEST_XP[q.difficulty];
      db.prepare("UPDATE quests SET done_at = ? WHERE id = ?").run(date, id);
      db.prepare("INSERT OR REPLACE INTO xp_events (kind, ref_id, date, attribute, xp) VALUES ('quest', ?, ?, ?, ?)").run(id, date, q.attribute, xp);
      return { xp };
    });
  });

  app.post<{ Params: { id: string } }>("/quests/:id/reopen", async (req) => {
    const id = Number(req.params.id);
    return tx(() => {
      const ev = db.prepare("SELECT xp FROM xp_events WHERE kind = 'quest' AND ref_id = ?").get(id) as { xp: number } | undefined;
      db.prepare("DELETE FROM xp_events WHERE kind = 'quest' AND ref_id = ?").run(id);
      db.prepare("UPDATE quests SET done_at = NULL WHERE id = ?").run(id);
      return { xp: -(ev?.xp ?? 0) };
    });
  });

  app.delete<{ Params: { id: string } }>("/quests/:id", async (req) => {
    db.prepare("DELETE FROM quests WHERE id = ?").run(Number(req.params.id));
    return { ok: true };
  });

  // ---- Verlauf: XP pro Tag für die Heatmap ----
  app.get<{ Querystring: { today?: string; days?: string } }>("/stats", async (req, reply) => {
    const today = req.query.today ?? todayUtc();
    if (!isValidDate(today)) return reply.code(400).send({ error: "invalid today" });
    const days = Math.min(Math.max(Number(req.query.days) || 365, 1), 730);
    const since = fromDay(toDay(today) - (days - 1));
    const heatmap = db.prepare("SELECT date, SUM(xp) AS xp FROM xp_events WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date").all(since, today);
    return { heatmap };
  });

  return app;
}
