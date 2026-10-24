import { fileURLToPath } from "node:url";
import { openDb } from "./db.ts";
import { buildApp } from "./app.ts";

const host = process.env.HOST ?? "127.0.0.1";
// Standardpasswort nur, solange der Server ausschließlich lokal erreichbar ist.
const password = process.env.HABIT_PASSWORD ?? (host === "127.0.0.1" ? "test" : undefined);
if (!password) {
  console.error("HABIT_PASSWORD ist nicht gesetzt.");
  process.exit(1);
}
const webDir = fileURLToPath(new URL("../../web/dist", import.meta.url));
const app = buildApp(openDb(process.env.DB_PATH ?? "life-rpg.db"), password, webDir);
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host });
console.log(`Läuft auf http://localhost:${port}`);
