import { useCallback, useEffect, useRef, useState } from "react";
import { api, localDate, Unauthorized, type Character, type Habit, type Quest, type Stats } from "./api";
import { ATTRS, ATTR_KEYS, DIFFS, type AttrKey, type DiffKey } from "./meta";
import { Burst, type BurstData } from "./Burst";
import { Heatmap } from "./Heatmap";

const MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365];

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        localStorage.setItem("token", pw);
        onDone();
      }}
    >
      <h1>⭐ Life RPG</h1>
      <input type="password" placeholder="Passwort" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <button>Anmelden</button>
    </form>
  );
}

function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return { date: localDate(d), label: d.toLocaleDateString("de-DE", { weekday: "narrow" }), isToday: i === n - 1 };
  });
}

function AttrSelect({ value, onChange }: { value: AttrKey; onChange: (v: AttrKey) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as AttrKey)} aria-label="Bereich">
      {ATTR_KEYS.map((k) => (
        <option key={k} value={k}>
          {ATTRS[k].icon} {ATTRS[k].label}
        </option>
      ))}
    </select>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

export function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [needLogin, setNeedLogin] = useState(!localStorage.getItem("token"));
  const [tab, setTab] = useState<"heute" | "charakter">("heute");
  const [bursts, setBursts] = useState<BurstData[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const prevChar = useRef<Character | null>(null);

  const [habitName, setHabitName] = useState("");
  const [habitAttr, setHabitAttr] = useState<AttrKey>("disziplin");
  const [questName, setQuestName] = useState("");
  const [questAttr, setQuestAttr] = useState<AttrKey>("geist");
  const [questDiff, setQuestDiff] = useState<DiffKey>("medium");

  const load = useCallback(async () => {
    try {
      const [h, q, c, s] = await Promise.all([api.habits(), api.quests(), api.character(), api.stats()]);
      const active = h.filter((x) => !x.archived);
      setHabits(active);
      setQuests(q);
      setCharacter(c);
      setStats(s);
      setError("");
      return active;
    } catch (e) {
      if (e instanceof Unauthorized) setNeedLogin(true);
      else setError("Server nicht erreichbar.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!needLogin) void load();
  }, [needLogin, load]);

  const removeBurst = useCallback((id: number) => setBursts((b) => b.filter((x) => x.id !== id)), []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const burst = useCallback((x: number, y: number, big: boolean, label?: string) => {
    setBursts((b) => [...b, { id: Date.now() + Math.random(), x, y, big, label }]);
    navigator.vibrate?.(big ? [40, 40, 80] : 25);
  }, []);

  // Level-Ups erkennen, egal woher die XP kamen.
  useEffect(() => {
    if (!character) return;
    const prev = prevChar.current;
    prevChar.current = character;
    if (!prev) return;
    const msgs: string[] = [];
    if (character.level > prev.level) msgs.push(`⬆️ Level ${character.level}!`);
    for (const a of character.attributes) {
      const old = prev.attributes.find((x) => x.key === a.key);
      if (old && a.level > old.level) msgs.push(`${ATTRS[a.key].icon} ${ATTRS[a.key].label} Level ${a.level}`);
    }
    if (msgs.length) {
      burst(window.innerWidth / 2, window.innerHeight / 3, true);
      toast(msgs.join(" · "));
    }
  }, [character, burst, toast]);

  if (needLogin) return <Login onDone={() => setNeedLogin(false)} />;

  const centerOf = (el: HTMLElement): [number, number] => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  const checkHabit = async (h: Habit, date: string, done: boolean, el: HTMLElement) => {
    const [x, y] = centerOf(el);
    const doneBefore = habits.filter((v) => v.doneToday).length;
    let xp: number;
    try {
      ({ xp } = await api.check(h.id, date, done));
    } catch {
      return setError("Aktion fehlgeschlagen.");
    }
    if (done && xp > 0) burst(x, y, false, `+${xp} XP`);
    const list = await load();
    if (!done || !list) return;
    const now = list.find((v) => v.id === h.id);
    if (list.every((v) => v.doneToday) && doneBefore < list.length) toast("🎉 Alles für heute geschafft!");
    if (now && now.current > h.current && MILESTONES.includes(now.current)) {
      burst(x, y, true);
      toast(`🔥 ${now.current} Tage am Stück: ${h.name}`);
    }
  };

  const toggleQuest = async (q: Quest, el: HTMLElement) => {
    const [x, y] = centerOf(el);
    const completing = !q.doneAt;
    try {
      const { xp } = await (completing ? api.completeQuest(q.id) : api.reopenQuest(q.id));
      if (completing && xp > 0) burst(x, y, true, `+${xp} XP`);
    } catch {
      return setError("Aktion fehlgeschlagen.");
    }
    await load();
  };

  const run = (p: Promise<unknown>) => p.then(load).catch(() => setError("Aktion fehlgeschlagen."));

  const doneToday = habits.filter((h) => h.doneToday).length;
  const openQuests = quests.filter((q) => !q.doneAt);
  const doneQuests = quests.filter((q) => q.doneAt);

  return (
    <main>
      {character && (
        <header className="hero">
          <div className="lvl">
            <span>Level</span>
            <b>{character.level}</b>
          </div>
          <div className="hero-bar">
            <Bar value={character.into} max={character.need} color="linear-gradient(90deg,#fbbf24,#f59e0b)" />
            <small>
              {character.into} / {character.need} XP bis Level {character.level + 1}
            </small>
          </div>
        </header>
      )}
      <nav className="tabs">
        <button className={tab === "heute" ? "active" : ""} onClick={() => setTab("heute")}>
          Heute
        </button>
        <button className={tab === "charakter" ? "active" : ""} onClick={() => setTab("charakter")}>
          Charakter
        </button>
      </nav>
      {error && <p className="error">{error}</p>}

      {tab === "heute" && (
        <>
          <h2>Gewohnheiten {habits.length > 0 && <span className="count">{doneToday}/{habits.length}</span>}</h2>
          {habits.length > 0 && (
            <div className={`progress${doneToday === habits.length ? " full" : ""}`}>
              <Bar value={doneToday} max={habits.length} />
            </div>
          )}
          <ul>
            {habits.map((h) => (
              <li key={h.id} className="habit">
                <span className="icon" title={ATTRS[h.attribute].label}>
                  {ATTRS[h.attribute].icon}
                </span>
                <span className="name">{h.name}</span>
                <span className="week">
                  {lastDays(7).map((d) => {
                    const done = h.dates.includes(d.date);
                    return (
                      <button
                        key={d.date}
                        className={`day${done ? " on" : ""}${d.isToday ? " today" : ""}`}
                        title={d.date}
                        aria-pressed={done}
                        aria-label={`${h.name} am ${d.date}`}
                        onClick={(e) => void checkHabit(h, d.date, !done, e.currentTarget)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </span>
                <span className={`meta${h.current >= 7 ? " hot" : ""}`} title={`Längste Serie: ${h.longest}, gesamt: ${h.total}`}>
                  🔥 {h.current}
                </span>
                <button className="ghost" aria-label={`${h.name} archivieren`} onClick={() => confirm(`"${h.name}" archivieren?`) && run(api.archiveHabit(h.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {habits.length === 0 && !error && <p className="muted">Noch keine Gewohnheiten.</p>}
          <form
            className="add"
            onSubmit={(e) => {
              e.preventDefault();
              if (!habitName.trim()) return;
              void run(api.addHabit(habitName.trim(), habitAttr));
              setHabitName("");
            }}
          >
            <input placeholder="Neue Gewohnheit" value={habitName} onChange={(e) => setHabitName(e.target.value)} />
            <AttrSelect value={habitAttr} onChange={setHabitAttr} />
            <button>+</button>
          </form>

          <h2>Quests {openQuests.length > 0 && <span className="count">{openQuests.length} offen</span>}</h2>
          <ul>
            {openQuests.map((q) => (
              <li key={q.id}>
                <button className="check" aria-label={`${q.name} abschließen`} onClick={(e) => void toggleQuest(q, e.currentTarget)} />
                <span className="name">{q.name}</span>
                <span className="meta" title={ATTRS[q.attribute].label}>
                  {ATTRS[q.attribute].icon} +{q.xp} XP
                </span>
                <button className="ghost" aria-label={`${q.name} löschen`} onClick={() => confirm(`"${q.name}" löschen?`) && run(api.deleteQuest(q.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {openQuests.length === 0 && !error && <p className="muted">Keine offenen Quests. Zeit für ein neues Abenteuer!</p>}
          <form
            className="add"
            onSubmit={(e) => {
              e.preventDefault();
              if (!questName.trim()) return;
              void run(api.addQuest(questName.trim(), questAttr, questDiff));
              setQuestName("");
            }}
          >
            <input placeholder="Neue Quest" value={questName} onChange={(e) => setQuestName(e.target.value)} />
            <AttrSelect value={questAttr} onChange={setQuestAttr} />
            <select value={questDiff} onChange={(e) => setQuestDiff(e.target.value as DiffKey)} aria-label="Schwierigkeit">
              {(Object.keys(DIFFS) as DiffKey[]).map((k) => (
                <option key={k} value={k}>
                  {DIFFS[k].label} ({DIFFS[k].xp})
                </option>
              ))}
            </select>
            <button>+</button>
          </form>
          {doneQuests.length > 0 && (
            <details>
              <summary>Erledigt ({doneQuests.length})</summary>
              <ul>
                {doneQuests.map((q) => (
                  <li key={q.id} className="finished">
                    <button className="check on" aria-label={`${q.name} wieder öffnen`} onClick={(e) => void toggleQuest(q, e.currentTarget)}>
                      ✓
                    </button>
                    <span className="name">{q.name}</span>
                    <span className="meta">+{q.xp} XP</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {tab === "charakter" && character && (
        <>
          <h2>Werte</h2>
          <ul>
            {character.attributes.map((a) => (
              <li key={a.key} className="attr">
                <span className="icon">{ATTRS[a.key].icon}</span>
                <div className="attr-body">
                  <div className="attr-head">
                    <span>{ATTRS[a.key].label}</span>
                    <b>Lv {a.level}</b>
                  </div>
                  <Bar value={a.into} max={a.need} color={ATTRS[a.key].color} />
                  <small>
                    {a.into} / {a.need} XP · gesamt {a.xp}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">Gesamt: {character.xp} XP</p>
          {stats && (
            <section>
              <h2>Letzte 12 Monate</h2>
              <Heatmap stats={stats} />
            </section>
          )}
        </>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="status">
            {t.text}
          </div>
        ))}
      </div>
      {bursts.map((b) => (
        <Burst key={b.id} data={b} onDone={removeBurst} />
      ))}
    </main>
  );
}
