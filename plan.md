# plan.md — what we're building

## North star

A **professional, user-friendly real-time speech coach** that makes anyone sound polished on Zoom calls. You speak naturally. Vaikhari listens, understands when you've finished a thought, and shows you a refined version in the voice you choose (CEO, Marketer, Technical, Friendly, Comedian, …).

It is **not** a transcription tool. Transcription is a means; the product is *speech improvement, in real-time, on live calls*.

## Design principles

1. **Live first.** Every design decision is judged by whether it works during a Zoom call, not just sitting alone at a desk.
2. **Don't break the speaker's flow.** The agent should help, never interrupt. If the person is mid-thought, stay quiet.
3. **Save everything; lose nothing.** Every polished thought is persisted to disk the moment it's produced.
4. **Pluggable, not monolithic.** Transcription, LLM, storage — each behind a clean interface so we can swap providers as the product matures.
5. **Boring stack, sharp UI.** Vite + React + Tailwind + Express. No exotic dependencies. The wow comes from the agent behavior and the visual care.

## Phase 1 — current scope (delivered)

The first usable version. Aimed at: *"Open the app, point it at Zoom, and feel the difference."*

- **Coach mode** — speak live, polished thought appears beside Zoom for you to glance at.
- **5 personas** — Executive, Marketer, Technical, Friendly, Comedian.
- **Intelligent agent loop:**
  - End-of-thought detection (Claude Haiku, runs every ~600ms)
  - Filler-word cleanup (folded into the polish prompt)
  - Rambling/repetition tightening (Claude rewrites into one clean line)
  - Cross-call context awareness (last 10 polished thoughts feed back as context)
- **Persistent talks** — every thought auto-saves to `data/sessions/<id>.json`. Survives crashes / refreshes.
- **History tab** — list, search, view raw + polished side-by-side, export as markdown.
- **Setup banner** — warns clearly if the Anthropic API key is missing.
- **Clean, professional UI** — dark theme, accent highlights, subtle animations, no clutter.
- **Token & cost observability** — header pill shows live tokens + estimated cost; full Usage tab with breakdown by model, persona, talk, and last 7 days. No extra API key required — uses the `usage` data Anthropic returns with every response.

## Phase 2 — next (planned, not built)

See `backlog.md` for the full prioritized list. The big next swings:

- **Deepgram streaming transcription** — replaces Web Speech API. Better accuracy, lower latency, no auto-stop on silence.
- **Tauri desktop wrapper** — true always-on-top floating window, global hotkey, menu-bar mode.
- **Hotkey teleprompter mode** — for important statements: hit a hotkey, speak draft, get polish, read aloud.
- **Custom persona authoring** — users define their own tone (e.g. "my company's brand voice").

## Phase 3 — direction (further out)

- **Post-call summaries** — generate a meeting note / follow-up email from the talk.
- **Coaching insights** — over time, surface patterns ("you say 'basically' a lot"; "your average sentence is 22 words long").
- **Multilingual** — non-English transcription + polishing.
- **Team mode** — shared persona libraries inside an organization.

## Non-goals (explicitly not pursuing now)

- ❌ Auto-speaking the polished version through a TTS voice. Risk of feedback loops, deepfake concerns, and reduces user agency. Goal is to coach, not to ventriloquize.
- ❌ Capturing the *other* participants' audio. Privacy / consent surface area is too large for v1.
- ❌ Cloud sync / multi-device. Local-first is simpler, more private, and matches the use case (personal device during a call).
- ❌ Mobile app. Zoom calls happen on laptops; mobile is a different product.

## Success criteria

We'll consider Phase 1 a success if:
1. The user can open the app, click Start, talk for 60 seconds, and see at least one polished thought that *clearly* sounds better than what they said.
2. No data is lost across a refresh or crash.
3. The polish appears within ~2 seconds of the speaker finishing a thought.
4. The user finds the History tab self-explanatory and can export a talk to markdown without reading docs.
