# nextsession.md — read this first

> **For the Claude reading this at the start of a new session:** this file is your briefing. After reading it, you should know what Vaikhari is, what's already built, what we agreed about how to work, and what to ask the user about first.

---

## What Vaikhari is, in one paragraph

Vaikhari is a **real-time speech coach for live Zoom calls**. The user speaks naturally; the app transcribes, detects when a thought is complete, and shows a polished version of that thought in the user's chosen voice (CEO, Marketer, Technical, Friendly, Comedian). It's not a transcription tool — transcription is just the input. The output is *speech improvement, in real-time, on live calls.*

The Sanskrit word *Vaikhari* means "articulated speech" — thought made into clear, spoken form.

---

## Current status — Phase 1 is complete and working

### What's built (verified end-to-end)
- **Vite + React + TypeScript + Tailwind** frontend at `http://localhost:5173`.
- **Express backend** at `http://localhost:3001` that holds the Anthropic key and proxies to Claude.
- **Coach mode UI**: persona chips, big mic button, live transcript pane, polished feed pane, current-talk bar with rename + end.
- **Intelligent agent loop** in `src/lib/useCoach.ts`:
  - Web Speech API → transcript stream
  - Debounced 600ms → Claude Haiku boundary detector (`mid` / `complete` / `rambling`)
  - On non-`mid` → Claude Sonnet polisher with persona + last 10 polished thoughts as context
  - AbortController cancels stale requests
- **Persistent talks** at `data/sessions/<uuid>.json` — written on every polished item. Survives crashes/refreshes.
- **History tab**: list, search, view raw + polished side-by-side, export single talk to markdown.
- **Usage tab + header pill**: live token count + estimated cost. Breakdown by model, persona, talk, and last 7 days. Backed by `data/usage.json` (append-only log of every API call). Pricing configurable via `.env`.
- **Setup banner** when `ANTHROPIC_API_KEY` is missing.
- **`npm run dev`** starts both server and web concurrently.

### What is *not* built (deliberately deferred — see backlog.md)
- Deepgram streaming (still on browser Web Speech API)
- Tauri desktop wrapper (still a browser app)
- Teleprompter / hotkey mode
- Custom-named personas
- Streaming polish (today the polish lands all-at-once)
- Post-talk summaries
- Coaching insights dashboard

---

## Read these before doing anything substantial

| Doc                | What's in it                                                |
| ------------------ | ----------------------------------------------------------- |
| `understand.md`    | Every file and folder explained. Data flow diagram. "Where do I look to change X?" table. |
| `plan.md`          | North star, design principles, Phase 1/2/3, non-goals.      |
| `backlog.md`       | 19 prioritized next-step ideas with effort estimates.       |
| `discussion.md`    | Decisions log: what we considered, what we chose, *why*.    |
| `README.md`        | Setup instructions for the human running the project.       |

If the user asks for something new, **read `discussion.md` first** — odds are we already discussed and rejected (or chose differently) on something close.

---

## How the user works (don't make them repeat themselves)

- **Decisive when given options.** If you ask multiple-choice questions, they pick fast and move on. Don't over-explain alternatives.
- **Ships fast.** Prefers shipping a working v1 today over a perfect v2 next week. The instinct "let's keep this simple now and add later" lines up with their style.
- **Cares about polish.** "Professional and user friendly" was the literal first instruction. UI care matters: dark theme, real animations, no clutter, no rough edges.
- **Adds scope as we go.** They will say "later I will keep adding other functionalities" and they mean it. Each session adds 1–2 features. Build for extensibility (pluggable transcription, pluggable LLM) but don't over-engineer for hypothetical features.
- **Will reframe via clarification.** If they reject a question, they want you to ask them what to clarify, not retry with the same question.

## Conventions worth preserving

- **Pluggable interfaces over hardcoded providers.** Transcription, LLM, storage all behind clean APIs.
- **Backend never sends the API key to the browser.** Key stays in `.env`, server proxies to Anthropic.
- **Fire-and-forget persistence.** UI never waits on `fs.writeFile`.
- **Two-model agent loop.** Haiku for cheap/fast checks, Sonnet for user-facing quality.
- **One Zustand store.** Single source of truth at `src/lib/store.ts`. No prop drilling.
- **Tailwind palette: `ink-*` (neutrals) and `accent-*` (blues).** Defined in `tailwind.config.js`. Don't introduce ad-hoc hex colors.

## Anti-patterns we already avoided (don't reintroduce)

- ❌ Calling Anthropic from the browser.
- ❌ Storing transcripts only in memory (tried in early scaffolding; replaced with disk persistence).
- ❌ Auto-speaking the polished version through TTS (explicit non-goal — see `plan.md`).
- ❌ Capturing other Zoom participants' audio (privacy non-goal).
- ❌ Mobile app (different product).

---

## What to do at the start of the next session

1. **Read this file, then `discussion.md`, then `backlog.md`.** That's ~3 minutes of context.
2. **Run `npm run dev`** to verify the app still works. The user may have edited things between sessions.
3. **Ask the user**: *"What's the next feature you want to add? Top candidates from the backlog are Deepgram streaming, Tauri wrapper, teleprompter mode, and custom personas — but happy to do something else."*
4. **If they pick something from the backlog**, that entry already has the rough plan and effort estimate. Confirm scope, then build.
5. **If they want something new**, propose 2–4 concrete options (with trade-offs) before scaffolding code. The user prefers picking from options to writing requirements from scratch.
6. **After implementing**, update `backlog.md` (move item to "delivered") and append a new entry to `discussion.md` with the decision log.

---

## Quick references

- **Run:** `npm run dev` (starts server on :3001 and web on :5173)
- **Type-check:** `npx tsc --noEmit` (must be clean)
- **Anthropic key location:** `.env` (file is gitignored)
- **Talks on disk:** `data/sessions/<uuid>.json` (also gitignored)
- **Models in use:** Haiku 4.5 (boundary), Sonnet 4.6 (polish). Override via `BOUNDARY_MODEL` / `POLISH_MODEL` in `.env`.

## File locations cheat sheet

| Want to change…                 | File                                  |
| ------------------------------- | ------------------------------------- |
| Add a persona                   | `server/personas.js` + `src/types.ts` |
| Tune the polish prompt          | `server/index.js` (`/api/polish`)     |
| Swap transcription provider     | `src/lib/transcription.ts`            |
| Tune debounce / agent timing    | `src/lib/useCoach.ts`                 |
| Add a new piece of UI state     | `src/lib/store.ts`                    |
| Add a new endpoint              | `server/index.js` + `src/lib/api.ts`  |
| Update token pricing            | `.env` (HAIKU_INPUT_PRICE etc.)       |
| Add a metric to the Usage tab   | `server/usage.js` + `UsageView.tsx`   |
| Restyle anything                | `tailwind.config.js` + components     |
