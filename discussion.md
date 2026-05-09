# discussion.md — what we've discussed and decided

A running log of the conversations that shaped Vaikhari. Each entry captures *the question*, *the option chosen*, and *why*. New decisions get appended; old ones aren't rewritten.

---

## 2026-05-09 — Initial scope

### What the user asked for
> *"i want to create a very professional and user friendly software/tool/app for now as first step i want to have a functionality when i speak something on realtime it should polish the sentence like ceo or market person or whatever i choose."*

Core ask: real-time speech polishing in a chosen persona. Will keep adding features afterward.

### Decision: it's a Zoom-call assistant
The user clarified they want this for Zoom calls. That reframed everything:
- Output has to be readable while speaking (not after the fact).
- Latency budget is ~2 seconds, not 10.
- The app needs to live next to Zoom, not in Zoom.

### Decision: web app first, Tauri desktop wrapper later
**Considered:** native Mac app (Tauri/Electron) from day one, web app, mobile app.
**Chose:** web app for v1.
**Why:**
- Same React code can later be wrapped in Tauri for a true floating overlay.
- Ship in a day vs. several days.
- The user can pin a Chrome window on top of Zoom in the meantime.

### Decision: Deepgram (eventually) for transcription, Web Speech API for v1
**Considered:** browser Web Speech API, OpenAI Whisper, Deepgram/AssemblyAI streaming.
**User chose:** Deepgram-class real-time streaming.
**Why:** lowest latency, professional accuracy.
**But:** user has no API keys yet, so v1 ships with browser Web Speech API. Provider is pluggable in `src/lib/transcription.ts` so Deepgram drops in as a one-file change.

### Decision: Claude (Anthropic) for polishing
**Considered:** Claude, GPT-4o-mini, local model (Ollama).
**User chose:** Claude.
**Why:** best at tone work and persona consistency.
**Detail:** two-model architecture — Haiku for the cheap/fast boundary detector, Sonnet for the higher-quality polish.

### Decision: 5 personas at launch
Executive, Marketer, Technical/Engineer, Friendly/Casual, Comedian.
The Comedian was added by the user beyond the initial four.

### Decision: Coach mode (not Teleprompter, not Hybrid)
**Considered:**
- **Hybrid (recommended):** smart-pause polish + hotkey teleprompter for important statements.
- **Coach mode only:** speak live, polished version appears on side panel, no mute/unmute dance.
- **Teleprompter only:** mute, speak draft, get polish, unmute and read.

**User chose:** Coach mode only.
**Why:** simpler mental model. No interruption to the call rhythm. The user wants to read along and self-correct rather than pre-script.

### Decision: full intelligence stack on day 1
**User chose all four** "intelligence" features:
- End-of-thought detection (semantic, not silence)
- Filler word cleanup
- Rambling/repetition detection
- Context awareness across the call (last 10 polished thoughts feed back)

### Decision: persistent talks on disk
> *"i need intelligent agent which will analyse what i am talking then polish at right time so that in zoom calls it should feel natural"*
> *"make sure to store the notes like person spoken words and polished version for each talk"*

**Considered:** browser IndexedDB (no server), JSON files on disk via the server, both.
**User chose:** JSON files on disk.
**Why:** survives browser cache clears, easy to back up / inspect / version control later. One file per talk at `data/sessions/<id>.json`.

**Session boundary:** every polished item is written to disk *immediately* (not at end of talk). Talks auto-create when the mic starts; user can rename or end them explicitly.

### Decision: History UI with search + markdown export
**User chose:** full history UI (list, search, view, export).
**Why:** lets the user revisit past talks and turn them into notes / emails. Markdown is the most portable format.

---

## Architectural decisions worth remembering

### Why a backend at all?
The browser cannot safely hold an Anthropic API key. We added a tiny Express server whose only jobs are: hold the key, proxy to Anthropic, and persist talks to disk. Total backend code is under ~250 lines.

### Why Zustand?
Considered Redux Toolkit, Jotai, plain useState. Zustand chosen for its tiny API, no provider boilerplate, and good React 18 ergonomics. Single store at `src/lib/store.ts` is easy to read end-to-end.

### Why Tailwind?
Considered CSS modules, styled-components. Tailwind chosen because it makes "professional dark UI" trivial without designer support. Custom palette (`ink-*`, `accent-*`) keeps it cohesive.

### Why two Claude models?
A single model for both jobs would either (a) be too slow and expensive on the boundary check that runs every 600ms or (b) be too low quality on the polish that the user actually reads. Splitting Haiku + Sonnet hits both ends well.

### Why fire-and-forget persistence?
The polish API call is on the critical path — the user is waiting to read it. The disk write is not. We write to disk asynchronously after pushing to the store, so the UI never waits on `fs.writeFile`.

---

### Decision: built token & cost observability into the app
> *"i want to know how many tokens i have used in all the apis i am using so i know how much is charged, do we need another token for this or just another simple observability?"*

**Answer to the question:** No new key needed. The Anthropic SDK returns `usage.input_tokens` / `usage.output_tokens` on every response — we just had to capture and persist them.

**Considered:**
- Simple: one chip in the header with total tokens + cost.
- Full Usage tab with breakdown by model/persona/talk/day.
- Both.

**User chose:** both — pill in the header for glanceable cost, plus a full Usage tab for the breakdown.

**Granularity chosen:** total + per-talk + per-day rollup.

**Implementation notes:**
- New module `server/usage.js` records every Anthropic call to `data/usage.json` (append-only log).
- Pricing is configurable via `.env` (`HAIKU_INPUT_PRICE`, `SONNET_INPUT_PRICE`, etc.) — defaults match Anthropic's published rates.
- The UI says clearly: numbers are estimates; the Anthropic Console is the source of truth.

---

## Open questions (we'll resolve later)

1. **Mute integration.** When teleprompter mode lands, should the app actually mute Zoom (requires system-level permissions / OS APIs) or just remind the user to mute?
2. **Privacy of the data folder.** Should we encrypt the JSON files at rest? Probably yes, eventually — they contain raw speech transcripts.
3. **Persona DSL.** When we add custom personas, what's the user-facing format? Free-form prompt? Structured (formality level, energy level, vocab restrictions)?
4. **Call boundaries.** Right now a "talk" is 1:1 with the mic session. Should we let the user manually mark a talk's start/end inside one mic session (e.g., for back-to-back meetings)?
