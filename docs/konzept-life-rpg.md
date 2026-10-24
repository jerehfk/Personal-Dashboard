# Life RPG – Konzept (Stand 2026-10-24)

Ziel: Das eigene Leben gamifizieren. Nur für eine Person (persönliche Nutzung).

## Entscheidungen
- Bereiche: Gewohnheiten, Aufgaben/Quests, später Finanzen/Gesundheit
- Mechanik im Zentrum: XP + Level + Charakter (RPG)
- Vorgehen: kleiner Kern zuerst (Gewohnheiten + Quests mit XP/Level), dann Bereiche nachrüsten
- Plattform: Web-App/PWA, später evtl. Native; eigenes Backend + Datenbank; erstmal nur lokal
- Keine Notion-Ablage

## Spielregeln V1
- 4 Charakterwerte: Körper, Geist, Disziplin, Finanzen. Jede Gewohnheit/Quest gehört zu einem Wert.
- Gewohnheit abhaken: 10 XP + Serienbonus (+1 pro Serientag, max. +10)
- Quest abschließen: leicht 20 / mittel 50 / schwer 100 XP
- Levelkurve: Level L beginnt bei 50·(L−1)² XP (Level 2 = 50, 3 = 200, 4 = 450 ...). Gilt für Gesamt-Level und jeden Wert.
- XP-Ledger: jede Aktion ist ein Eintrag; Haken zurücknehmen entfernt die XP wieder. Bereits verdiente XP bleiben, wenn man eine Gewohnheit/Quest löscht.
- Belohnung: Konfetti, "+XP"-Anzeige, Level-Up-Meldungen, Tagesfortschritt, Serien-Meilensteine

## Stack
Node 22 + Fastify + SQLite (`node:sqlite`), React + Vite PWA. Ein Prozess liefert API und Frontend. Windows-tauglich (keine Shell-Syntax in Skripten).

## Später
- Finanzen (Sparziele) und Gesundheit (Whoop) als XP-Quellen
- Abzeichen/Achievements, Belohnungen einlösen, Wochenziele
