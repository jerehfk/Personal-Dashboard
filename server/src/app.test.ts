import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./db.ts";
import { buildApp } from "./app.ts";

const auth = { authorization: "Bearer pw" };
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function setup() {
  const app = buildApp(openDb(":memory:"), "pw");
  const call = async (method: string, url: string, payload?: object) => {
    const r = await app.inject({ method: method as "GET", url, headers: auth, payload });
    return { status: r.statusCode, body: r.json() };
  };
  return { app, call };
}

test("Auth nötig", async () => {
  const { app } = setup();
  assert.equal((await app.inject({ method: "GET", url: "/character" })).statusCode, 401);
});

test("Gewohnheit: XP mit Serienbonus, Undo, Charakter", async () => {
  const { call } = setup();
  const { body: h } = await call("POST", "/habits", { name: "Laufen", attribute: "koerper" });
  assert.equal((await call("PUT", `/habits/${h.id}/checkins/${daysAgo(1)}`)).body.xp, 10);
  assert.equal((await call("PUT", `/habits/${h.id}/checkins/${today}`)).body.xp, 11);
  assert.equal((await call("PUT", `/habits/${h.id}/checkins/${today}`)).body.xp, 0, "doppelt = keine XP");

  const c = (await call("GET", "/character")).body;
  assert.equal(c.xp, 21);
  assert.equal(c.attributes.find((a: any) => a.key === "koerper").xp, 21);

  assert.equal((await call("DELETE", `/habits/${h.id}/checkins/${today}`)).body.xp, -11);
  assert.equal((await call("GET", "/character")).body.xp, 10);
  assert.equal((await call("PUT", `/habits/${h.id}/checkins/2999-01-01`)).status, 400, "Zukunft gesperrt");
});

test("Quest: abschließen, Level-Up, wieder öffnen; XP bleiben nach Löschen", async () => {
  const { call } = setup();
  const { body: q } = await call("POST", "/quests", { name: "Steuererklärung", attribute: "finanzen", difficulty: "hard" });
  assert.equal((await call("POST", `/quests/${q.id}/complete`, { date: today })).body.xp, 100);
  assert.equal((await call("POST", `/quests/${q.id}/complete`, { date: today })).body.xp, 0);
  assert.equal((await call("GET", "/character")).body.level, 2);

  assert.equal((await call("POST", `/quests/${q.id}/reopen`)).body.xp, -100);
  assert.equal((await call("GET", "/character")).body.xp, 0);

  await call("POST", `/quests/${q.id}/complete`, { date: today });
  await call("DELETE", `/quests/${q.id}`);
  assert.equal((await call("GET", "/character")).body.xp, 100);
  assert.equal((await call("POST", "/quests", { name: "x", attribute: "quatsch" })).status, 400);
});

test("Heatmap liefert XP pro Tag", async () => {
  const { call } = setup();
  const { body: h } = await call("POST", "/habits", { name: "Lesen" });
  await call("PUT", `/habits/${h.id}/checkins/${today}`);
  assert.deepEqual((await call("GET", `/stats?today=${today}`)).body.heatmap, [{ date: today, xp: 10 }]);
});
