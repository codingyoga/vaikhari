import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { personas } from "./personas.js";
import {
  appendItem,
  createSession,
  deleteSession,
  exportMarkdown,
  getSession,
  listSessions,
  updateSession,
} from "./storage.js";
import { costFor, getSummary, recordUsage } from "./usage.js";

const PORT = process.env.PORT || 3001;
const BOUNDARY_MODEL = process.env.BOUNDARY_MODEL || "claude-haiku-4-5-20251001";
const POLISH_MODEL = process.env.POLISH_MODEL || "claude-sonnet-4-6";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "\n[vaikhari] Missing ANTHROPIC_API_KEY. Copy .env.example to .env and paste your key.\n" +
      "Get a key at https://console.anthropic.com/settings/keys\n"
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    boundaryModel: BOUNDARY_MODEL,
    polishModel: POLISH_MODEL,
  });
});

app.get("/api/personas", (_req, res) => {
  res.json(
    Object.entries(personas).map(([id, p]) => ({
      id,
      name: p.name,
      tagline: p.tagline,
    }))
  );
});

/**
 * POST /api/detect-boundary
 * Body: { transcript: string, lastPolishedAt?: string }
 * Returns: { state: 'mid' | 'complete' | 'rambling', reason: string }
 *
 * Cheap & fast Haiku call. Decides whether to polish.
 */
app.post("/api/detect-boundary", async (req, res) => {
  const { transcript, lastPolishedAt, sessionId, personaId } = req.body ?? {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript required" });
  }

  const newPart = lastPolishedAt
    ? transcript.slice(transcript.indexOf(lastPolishedAt) + lastPolishedAt.length).trim()
    : transcript.trim();

  if (!newPart || newPart.split(/\s+/).length < 4) {
    return res.json({ state: "mid", reason: "too few new words" });
  }

  try {
    const result = await anthropic.messages.create({
      model: BOUNDARY_MODEL,
      max_tokens: 80,
      system:
        "You analyze a live speech transcript stream from someone on a Zoom call. " +
        "Decide if the speaker has just finished a complete thought worth polishing. " +
        "Reply with strict JSON only: {\"state\": \"mid\" | \"complete\" | \"rambling\", \"reason\": \"<5 words\"}. " +
        "- 'mid': speaker is still mid-sentence or mid-idea; do NOT interrupt. " +
        "- 'complete': speaker has just landed a complete thought (a full statement, question, or point). " +
        "- 'rambling': speaker has been repeating, trailing off, or stacking filler — a tighter version would help. " +
        "Bias toward 'mid' unless the thought clearly closes.",
      messages: [
        {
          role: "user",
          content: `New unpolished speech since last polish:\n"""${newPart}"""\n\nReturn JSON now.`,
        },
      ],
    });

    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let parsed = { state: "mid", reason: "parse fallback" };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      // fallthrough
    }

    recordUsage({
      model: BOUNDARY_MODEL,
      kind: "boundary",
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
      sessionId,
      personaId,
    });

    res.json(parsed);
  } catch (err) {
    console.error("[boundary] error", err?.message || err);
    res.status(500).json({ error: err?.message || "boundary detection failed" });
  }
});

/**
 * POST /api/polish
 * Body: { transcript: string, personaId: string, history: string[] }
 * Returns: { polished: string }
 */
app.post("/api/polish", async (req, res) => {
  const { transcript, personaId, history = [], sessionId } = req.body ?? {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript required" });
  }
  const persona = personas[personaId] || personas.executive;

  const historyBlock =
    history.length > 0
      ? `\n\nRecent polished thoughts from this same call (keep tone consistent):\n` +
        history
          .slice(-10)
          .map((h, i) => `${i + 1}. ${h}`)
          .join("\n")
      : "";

  const system =
    `You are Vaikhari, a real-time speech coach polishing what someone JUST said on a live Zoom call. ` +
    `The persona target is: ${persona.name} — ${persona.styleGuide}\n\n` +
    `Rules:\n` +
    `1. Output ONLY the polished sentence(s). No preamble, no quotes, no explanation.\n` +
    `2. Remove filler words: um, uh, like, you know, sort of, kind of, basically, literally (when meaningless).\n` +
    `3. If the speaker rambled or repeated, collapse it into one clean sentence.\n` +
    `4. Preserve the speaker's actual meaning and intent — don't invent claims or facts.\n` +
    `5. Keep it conversational and speakable, not written-essay style. Aim for 1-3 sentences.\n` +
    `6. Match tone with the persona above and stay consistent with the prior polished thoughts.` +
    historyBlock;

  try {
    const result = await anthropic.messages.create({
      model: POLISH_MODEL,
      max_tokens: 400,
      system,
      messages: [
        {
          role: "user",
          content: `Raw speech to polish:\n"""${transcript.trim()}"""`,
        },
      ],
    });

    const polished = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "");

    const inputTokens = result.usage?.input_tokens ?? 0;
    const outputTokens = result.usage?.output_tokens ?? 0;

    recordUsage({
      model: POLISH_MODEL,
      kind: "polish",
      inputTokens,
      outputTokens,
      sessionId,
      personaId,
    });

    res.json({
      polished,
      usage: {
        model: POLISH_MODEL,
        inputTokens,
        outputTokens,
        cost: costFor(POLISH_MODEL, inputTokens, outputTokens),
      },
    });
  } catch (err) {
    console.error("[polish] error", err?.message || err);
    res.status(500).json({ error: err?.message || "polish failed" });
  }
});

// ---------------------------------------------------------------------------
// Sessions ("talks") — persisted to data/sessions/<id>.json
// ---------------------------------------------------------------------------

app.get("/api/sessions", async (_req, res) => {
  try {
    res.json(await listSessions());
  } catch (err) {
    console.error("[sessions:list]", err?.message);
    res.status(500).json({ error: "failed to list sessions" });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const personaId = req.body?.personaId || "executive";
    const s = await createSession({ personaId });
    res.json(s);
  } catch (err) {
    console.error("[sessions:create]", err?.message);
    res.status(500).json({ error: "failed to create session" });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err?.message || "failed to load session" });
  }
});

app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const s = await updateSession(req.params.id, req.body || {});
    if (!s) return res.status(404).json({ error: "not found" });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err?.message || "failed to update" });
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  try {
    const ok = await deleteSession(req.params.id);
    if (!ok) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || "failed to delete" });
  }
});

app.post("/api/sessions/:id/items", async (req, res) => {
  try {
    const s = await appendItem(req.params.id, req.body || {});
    if (!s) return res.status(404).json({ error: "session not found" });
    res.json({ ok: true, itemCount: s.items.length });
  } catch (err) {
    res.status(500).json({ error: err?.message || "failed to append item" });
  }
});

app.get("/api/sessions/:id/export", async (req, res) => {
  try {
    const s = await getSession(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    const md = exportMarkdown(s);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${s.title.replace(/[^a-z0-9-]+/gi, "_")}.md"`
    );
    res.send(md);
  } catch (err) {
    res.status(500).json({ error: err?.message || "export failed" });
  }
});

// ---------------------------------------------------------------------------
// Usage / cost observability
// ---------------------------------------------------------------------------

app.get("/api/usage", async (_req, res) => {
  try {
    res.json(await getSummary());
  } catch (err) {
    console.error("[usage:summary]", err?.message);
    res.status(500).json({ error: "failed to load usage" });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Vaikhari server listening on http://localhost:${PORT}`);
  console.log(`  Boundary model: ${BOUNDARY_MODEL}`);
  console.log(`  Polish model:   ${POLISH_MODEL}\n`);
});
