import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const USAGE_FILE = path.join(DATA_DIR, "usage.json");

// Default pricing in USD per 1M tokens. Override via .env
// (HAIKU_INPUT_PRICE / HAIKU_OUTPUT_PRICE / SONNET_INPUT_PRICE / SONNET_OUTPUT_PRICE).
//
// Source: Anthropic's published rates as of the time this file was written.
// These ARE estimates — for the authoritative number, check
// https://console.anthropic.com/settings/usage
const DEFAULT_PRICING = {
  haiku: {
    input: Number(process.env.HAIKU_INPUT_PRICE) || 1.0,
    output: Number(process.env.HAIKU_OUTPUT_PRICE) || 5.0,
  },
  sonnet: {
    input: Number(process.env.SONNET_INPUT_PRICE) || 3.0,
    output: Number(process.env.SONNET_OUTPUT_PRICE) || 15.0,
  },
};

function classifyModel(model) {
  if (!model) return "unknown";
  const m = model.toLowerCase();
  if (m.includes("haiku")) return "haiku";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("opus")) return "opus";
  return "unknown";
}

export function priceFor(model) {
  const cls = classifyModel(model);
  return DEFAULT_PRICING[cls] || { input: 0, output: 0 };
}

export function costFor(model, inputTokens, outputTokens) {
  const p = priceFor(model);
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output
  );
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USAGE_FILE);
  } catch {
    await fs.writeFile(USAGE_FILE, JSON.stringify({ events: [] }, null, 2));
  }
}

// Serialize disk writes so concurrent recordUsage() calls don't trample each other.
let writeChain = Promise.resolve();

export function recordUsage(event) {
  // Don't await — fire and forget. The chain ensures order.
  writeChain = writeChain
    .then(async () => {
      await ensureFile();
      const raw = await fs.readFile(USAGE_FILE, "utf8");
      const data = JSON.parse(raw);
      data.events.push({
        at: event.at ?? Date.now(),
        model: event.model,
        kind: event.kind, // 'boundary' | 'polish'
        input: event.inputTokens,
        output: event.outputTokens,
        sessionId: event.sessionId ?? null,
        personaId: event.personaId ?? null,
      });
      await fs.writeFile(USAGE_FILE, JSON.stringify(data, null, 2));
    })
    .catch((err) => console.error("[usage] write failed", err?.message));
  return writeChain;
}

function dayKey(ts) {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function getSummary() {
  await ensureFile();
  const raw = await fs.readFile(USAGE_FILE, "utf8");
  const { events } = JSON.parse(raw);

  const summary = {
    pricing: DEFAULT_PRICING,
    total: { input: 0, output: 0, cost: 0, calls: 0 },
    byModel: {},
    byKind: {},
    byPersona: {},
    bySession: {},
    byDay: {},
    last7Days: [],
    eventCount: events.length,
  };

  for (const e of events) {
    const cost = costFor(e.model, e.input, e.output);
    summary.total.input += e.input;
    summary.total.output += e.output;
    summary.total.cost += cost;
    summary.total.calls += 1;

    const cls = classifyModel(e.model);
    bumpBucket(summary.byModel, cls, e, cost);
    bumpBucket(summary.byKind, e.kind || "unknown", e, cost);
    if (e.personaId) bumpBucket(summary.byPersona, e.personaId, e, cost);
    if (e.sessionId) bumpBucket(summary.bySession, e.sessionId, e, cost);

    const dk = dayKey(e.at);
    bumpBucket(summary.byDay, dk, e, cost);
  }

  // Build last-7-days array (always 7 entries, including zero days)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    summary.last7Days.push({
      date: key,
      ...(summary.byDay[key] || { input: 0, output: 0, cost: 0, calls: 0 }),
    });
  }

  return summary;
}

function bumpBucket(bucket, key, event, cost) {
  if (!bucket[key]) bucket[key] = { input: 0, output: 0, cost: 0, calls: 0 };
  bucket[key].input += event.input;
  bucket[key].output += event.output;
  bucket[key].cost += cost;
  bucket[key].calls += 1;
}

export async function getSessionUsage(sessionId) {
  const summary = await getSummary();
  return (
    summary.bySession[sessionId] || {
      input: 0,
      output: 0,
      cost: 0,
      calls: 0,
    }
  );
}
