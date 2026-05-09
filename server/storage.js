import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data", "sessions");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(id) {
  // Defensive: only allow uuid-shaped ids so callers can't escape DATA_DIR
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("invalid session id");
  return path.join(DATA_DIR, `${id}.json`);
}

function defaultTitle(at = Date.now()) {
  const d = new Date(at);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Talk · ${date} · ${time}`;
}

export async function createSession({ personaId }) {
  await ensureDir();
  const session = {
    id: crypto.randomUUID(),
    title: defaultTitle(),
    personaId,
    startedAt: Date.now(),
    endedAt: null,
    items: [],
  };
  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2));
  return session;
}

export async function listSessions() {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const sessions = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
      const s = JSON.parse(raw);
      sessions.push({
        id: s.id,
        title: s.title,
        personaId: s.personaId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        itemCount: s.items?.length ?? 0,
      });
    } catch {
      // skip corrupt files silently — user can inspect data/ if needed
    }
  }
  // Newest first
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return sessions;
}

export async function getSession(id) {
  await ensureDir();
  try {
    const raw = await fs.readFile(sessionPath(id), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function updateSession(id, patch) {
  const session = await getSession(id);
  if (!session) return null;
  const allowed = ["title", "endedAt", "personaId"];
  for (const k of allowed) {
    if (k in patch) session[k] = patch[k];
  }
  await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2));
  return session;
}

export async function appendItem(id, item) {
  const session = await getSession(id);
  if (!session) return null;
  session.items.push({
    id: item.id ?? crypto.randomUUID(),
    raw: item.raw,
    polished: item.polished,
    personaId: item.personaId,
    state: item.state,
    at: item.at ?? Date.now(),
  });
  await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2));
  return session;
}

export async function deleteSession(id) {
  try {
    await fs.unlink(sessionPath(id));
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

export function exportMarkdown(session) {
  const started = new Date(session.startedAt).toLocaleString();
  const ended = session.endedAt
    ? new Date(session.endedAt).toLocaleString()
    : "(ongoing)";

  const lines = [
    `# ${session.title}`,
    "",
    `- **Persona:** ${session.personaId}`,
    `- **Started:** ${started}`,
    `- **Ended:** ${ended}`,
    `- **Thoughts:** ${session.items.length}`,
    "",
    "---",
    "",
  ];

  for (const item of session.items) {
    const t = new Date(item.at).toLocaleTimeString();
    lines.push(`## ${t}`);
    lines.push("");
    lines.push(`**Polished:** ${item.polished}`);
    lines.push("");
    lines.push(`> *Original:* ${item.raw}`);
    lines.push("");
  }

  return lines.join("\n");
}
