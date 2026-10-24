# Life RPG

Persönliche Gamification-App: Gewohnheiten und Quests geben XP, daraus entstehen Level und Charakterwerte. Konzept: `docs/konzept-life-rpg.md`.

- `server/`: Fastify + SQLite (`node:sqlite`, Node ≥ 22.13), Auth per Passwort; liefert auch das Frontend aus
- `web/`: React + Vite PWA

## Ausprobieren (lokal)
```sh
npm run setup   # einmalig: Abhängigkeiten installieren, Frontend bauen
npm start       # http://localhost:3000, Passwort: test
```
Eigenes Passwort: `HABIT_PASSWORD=geheim npm start` (PowerShell: `$env:HABIT_PASSWORD="geheim"; npm start`). Ohne Angabe gilt "test", aber nur bei `HOST=127.0.0.1` (Standard). Daten liegen in `life-rpg.db` (Ordner, aus dem gestartet wird; mit `DB_PATH` änderbar).

## Entwickeln
```sh
cd server && npm start      # API auf :3000
cd web && npm run dev       # Vite auf :5173, Proxy /api -> :3000
```
Tests: `cd server && npm test`.
